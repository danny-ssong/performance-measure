import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import { INP_RATING_LABEL, rateInp } from '@/lib/performance/inp-rating'
import {
  ANNOTATION,
  METRICS,
  METRICS_ATTACHMENT_NAME,
  METRIC_GROUP_LABEL,
  computeStats,
  formatMetricValue,
  isRunMetrics,
  type MetricName,
  type RunMetrics,
  type Stats,
} from './responsiveness-metrics'

type RunBase = {
  scenarioId: string
  round: number
  isWarmup: boolean
}

/** 측정에 성공한 회차와 실패(타임아웃·오류)한 회차를 구분한다 — 실패 회차는 표에 "실패"로 드러낸다 */
type RunRecord =
  | (RunBase & { outcome: 'measured'; metrics: RunMetrics })
  | (RunBase & { outcome: 'failed'; status: TestResult['status'] })

type MeasuredRun = Extract<RunRecord, { outcome: 'measured' }>

type ReporterOptions = {
  /** 회차별 원본 값과 집계를 JSON으로 저장할 경로. 없으면 저장하지 않는다 */
  outputFile?: string
}

function findAnnotation(test: TestCase, type: string): string | undefined {
  return test.annotations.find((annotation) => annotation.type === type)?.description
}

function readMetricsAttachment(result: TestResult): RunMetrics | null {
  const body = result.attachments.find((attachment) => attachment.name === METRICS_ATTACHMENT_NAME)?.body
  if (!body) return null

  const parsed: unknown = JSON.parse(body.toString('utf-8'))
  return isRunMetrics(parsed) ? parsed : null
}

function isMeasured(run: RunRecord): run is MeasuredRun {
  return run.outcome === 'measured'
}

function statsOf(runs: readonly RunRecord[], name: MetricName): Stats | null {
  const values = runs.filter(isMeasured).map((run) => run.metrics[name])
  return computeStats(values.filter((value) => value !== null))
}

function formatRun(run: RunRecord, name: MetricName): string {
  return isMeasured(run) ? formatMetricValue(run.metrics[name]) : '실패'
}

/**
 * 중앙값에 표본 수를 함께 붙인다.
 *
 * 값이 없는 회차는 집계에서 빠지므로, 5회를 돌려도 1회만 반영된 중앙값이 나올 수 있다.
 * 표본 수를 숨기면 그 한 회차가 대표값처럼 보이므로 반드시 함께 보여준다 (예: `59 (n=1/5)`)
 */
function formatMedianWithSampleSize(runs: readonly RunRecord[], name: MetricName): string {
  const stats = statsOf(runs, name)
  if (stats === null) return '-'
  return `${formatMetricValue(stats.median)} (n=${stats.sampleSize}/${runs.length})`
}

/**
 * 반응성 측정 테스트의 첨부를 모아, 끝나면 UX에 중요한 순서로 결과를 출력한다.
 *   1. 한눈에 보기 — 시나리오별 중앙값 + INP 등급
 *   2. 지표별 상세 — 회차·중앙값·평균·최소·최대·표본표준편차
 * 측정 첨부가 없는 테스트는 무시하므로 다른 테스트와 함께 돌려도 된다.
 */
export default class ResponsivenessSummaryReporter implements Reporter {
  private readonly records: RunRecord[] = []
  private readonly outputFile: string | undefined
  /** 테스트에 정의된 시나리오 순서 — 실패한 회차가 있어도 표의 행 순서가 흔들리지 않게 한다 */
  private scenarioOrder: string[] = []

  constructor(options: ReporterOptions = {}) {
    this.outputFile = options.outputFile
  }

  onBegin(_config: FullConfig, suite: Suite) {
    const scenarioIds = suite
      .allTests()
      .map((test) => findAnnotation(test, ANNOTATION.scenario))
      .filter((scenarioId) => scenarioId !== undefined)
    this.scenarioOrder = [...new Set(scenarioIds)]
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const scenarioId = findAnnotation(test, ANNOTATION.scenario)
    if (scenarioId === undefined) return

    const base: RunBase = {
      scenarioId,
      round: Number(findAnnotation(test, ANNOTATION.round)),
      isWarmup: findAnnotation(test, ANNOTATION.warmup) === 'true',
    }
    const metrics = result.status === 'passed' ? readMetricsAttachment(result) : null

    this.records.push(
      metrics === null
        ? { ...base, outcome: 'failed', status: result.status }
        : { ...base, outcome: 'measured', metrics },
    )
  }

  async onEnd() {
    const runs = this.records.filter((record) => !record.isWarmup)
    if (runs.length === 0) return

    const runsByScenario = new Map<string, RunRecord[]>()
    for (const scenarioId of this.scenarioOrder) {
      const scenarioRuns = runs.filter((run) => run.scenarioId === scenarioId)
      if (scenarioRuns.length > 0) runsByScenario.set(scenarioId, scenarioRuns)
    }

    this.printOverview(runsByScenario)
    this.printDetails(runsByScenario)

    if (this.outputFile) {
      await this.writeReport(this.outputFile, runsByScenario)
      process.stdout.write(`\n측정 결과 저장: ${this.outputFile}\n`)
    }
  }

  printsToStdio() {
    return true
  }

  private printOverview(runsByScenario: ReadonlyMap<string, RunRecord[]>) {
    process.stdout.write('\n■ 한눈에 보기 — 중앙값 (n=반영/실행 회차), UX 영향이 큰 순 (INP 등급: 200ms 이하 좋음 · 500ms 이하 개선 필요)\n')
    console.table(
      Object.fromEntries(
        [...runsByScenario].map(([scenarioId, runs]) => {
          const inpMedian = statsOf(runs, 'worstCaseInp')?.median
          const medians = Object.fromEntries(
            METRICS.map(({ name, shortLabel }) => [
              shortLabel,
              formatMedianWithSampleSize(runs, name),
            ]),
          )
          return [
            scenarioId,
            { 'INP 등급': inpMedian === undefined ? '-' : INP_RATING_LABEL[rateInp(inpMedian)], ...medians },
          ]
        }),
      ),
    )
  }

  private printDetails(runsByScenario: ReadonlyMap<string, RunRecord[]>) {
    for (const metric of METRICS) {
      process.stdout.write(`\n■ [${METRIC_GROUP_LABEL[metric.group]}] ${metric.label} (${metric.unit})\n`)
      console.table(
        Object.fromEntries(
          [...runsByScenario].map(([scenarioId, runs]) => {
            const stats = statsOf(runs, metric.name)
            const perRun = Object.fromEntries(runs.map((run) => [`${run.round}회`, formatRun(run, metric.name)]))
            return [
              scenarioId,
              {
                ...perRun,
                표본: stats === null ? '-' : `${stats.sampleSize}/${runs.length}`,
                중앙값: formatMetricValue(stats?.median),
                평균: formatMetricValue(stats?.mean),
                최소: formatMetricValue(stats?.min),
                최대: formatMetricValue(stats?.max),
                표준편차: formatMetricValue(stats?.stdev),
              },
            ]
          }),
        ),
      )
    }
  }

  private async writeReport(outputFile: string, runsByScenario: ReadonlyMap<string, RunRecord[]>) {
    const summary = [...runsByScenario].map(([scenarioId, runs]) => ({
      scenarioId,
      runCount: runs.length,
      stats: Object.fromEntries(METRICS.map(({ name }) => [name, statsOf(runs, name)])),
    }))

    const report = { measuredAt: new Date().toISOString(), summary, records: this.records }
    await mkdir(dirname(outputFile), { recursive: true })
    await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`)
  }
}
