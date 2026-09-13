import { test, type CDPSession, type Page } from '@playwright/test'
import { estimateWorstCaseInpFromTask } from '@/lib/performance/inp-rating'
import {
  RESPONSIVENESS_PROBE_KEY,
  type ResponsivenessProbeReport,
} from '@/lib/performance/responsiveness-probe'
import type { ResponsivenessSummary } from '@/lib/performance/responsiveness-tracker'
import { startMainThreadTrace, type MainThreadTaskStats } from './main-thread-trace'
import type { RunMetrics, SummaryMetrics } from './responsiveness-metrics'

// LoAF 엔트리는 프레임이 끝난 뒤 비동기로 도착하므로, 값이 이 시간 동안 그대로면 측정이 끝난 것으로 본다
const SETTLE_WINDOW_MS = 800
const SETTLE_POLL_MS = 100
const SETTLE_TIMEOUT_MS = 15_000
// 앱의 보고는 exposeFunction을 거쳐 비동기로 도착하므로, 이 시간 안에 오지 않으면 연결이 끊긴 것으로 본다
const REPORT_TIMEOUT_MS = 5_000
// 조회 클릭 직전, 최근 이 시간 동안 긴 프레임이 없어야 메인 스레드가 조용하다고 본다
const MAIN_THREAD_QUIET_MS = 500
// 이 시간 안에 조용해지지 않으면 측정 환경이 오염된 것으로 보고 실패시킨다 (테스트 타임아웃까지 멈춰 있지 않게)
const MAIN_THREAD_QUIET_TIMEOUT_MS = 10_000
const IDLE_CHECK_TIMEOUT_MS = 200

type RowCount = 200 | 1000

declare global {
  interface Window {
    /** 결과의 첫 행이 그려진 시각 (performance.now 기준). 아직 안 그려졌으면 null */
    __orderGridFirstRowAt?: number | null
  }
}

/** 주문 그리드 화면 조작과 반응성 요약 수신을 묶은 페이지 객체 (테이블 렌더·가상화·트랜지션 공통) */
export class OrderGridPage {
  private readonly page: Page
  /** CPU 감속과 메인 스레드 트레이스에 쓰는 세션 — 둘 다 CDP로만 가능하다 */
  private readonly client: CDPSession
  /** 앱이 보낸 반응성 보고. 조회를 누를 때마다 비워 이번 조회의 보고만 남긴다 */
  private reports: readonly ResponsivenessProbeReport[] = []

  constructor(page: Page, client: CDPSession) {
    this.page = page
    this.client = client
  }

  /**
   * 페이지를 열고 첫 로드가 완전히 끝날 때까지 기다린다.
   * 로드 직후 남은 작업(하이드레이션, 링크 prefetch 등)이 조회 측정 구간에 섞이지 않게 하기 위함이다.
   */
  async goto(path: string) {
    // 앱 스크립트보다 먼저 주입돼야 마운트 직후의 첫 보고(지원 여부)부터 받을 수 있어, 이동 전에 등록한다
    await this.page.exposeFunction(RESPONSIVENESS_PROBE_KEY, (report: ResponsivenessProbeReport) => {
      this.reports = [...this.reports, report]
    })

    await this.page.goto(path)
    await test.step('하이드레이션 대기', () => this.waitForHydration())
    // 프로덕션에서는 하이드레이션 직후 화면 속 링크의 JS 청크를 prefetch한다
    await test.step('네트워크 유휴 대기', () => this.page.waitForLoadState('networkidle'))
    await this.assertProductionBuild()
    await this.assertMeasurementSupported()
  }

  /**
   * 개발 서버를 재고 있지 않은지 확인한다.
   *
   * 개발 모드는 React가 검증 코드를 돌리고 StrictMode에서 이중 렌더까지 해 렌더 비용이 2~3배로 부풀려진다.
   * 그런데 프로덕션 서버가 포트 충돌로 뜨지 못하면, 이미 떠 있던 개발 서버를 그대로 재면서도 측정은 성공한다.
   * 수치만 조용히 부풀려지므로 문서의 주의 문구로는 막을 수 없어 측정 자체를 실패시킨다.
   *
   * 개발 전용 HMR 클라이언트 스크립트로 판단한다 — Next.js 내부 구현이라 측정 전용 우회다
   */
  private async assertProductionBuild() {
    const hasDevOnlyScript = await this.page.evaluate(() =>
      [...document.querySelectorAll('script[src]')].some((script) =>
        (script.getAttribute('src') ?? '').includes('hmr-client'),
      ),
    )

    if (hasDevOnlyScript) {
      throw new Error(
        `개발 서버를 측정하려 했습니다 (${this.page.url()}). 개발 모드는 렌더 비용이 부풀려져 수치를 쓸 수 없습니다. ` +
          'npm run build && npm run start 로 띄운 주소를 BASE_URL로 넘기세요.',
      )
    }
  }

  /**
   * 지정한 건수를 조회하고, 결과가 그려질 때까지의 렌더 비용을 잰다.
   *
   * 렌더 도중에 일부러 입력을 넣지 않는다.
   * 처리를 기다리는 입력이 있으면 브라우저가 스타일·레이아웃을 렌더링 단계 앞으로 당겨 실행해서,
   * 그 비용이 LoAF의 프레임 구간 분해에서 '렌더링 전 작업'으로 잡혀 버리기 때문이다 (실측: 242ms → 8ms).
   * 입력이 얼마나 막히는지는 구간 내 최장 태스크에서 계산한 '최악 INP(추정)'으로 갈음한다.
   */
  async measureQueryRender(rowCount: RowCount): Promise<RunMetrics> {
    await this.watchFirstRowPaint()
    // 구간을 여는 조작(조회 클릭)보다 먼저 트레이스를 켜야 구간 시작 마크가 트레이스에 들어간다
    const trace = await startMainThreadTrace(this.client)
    await this.search(rowCount)

    // 결과의 첫 행이 그려질 때까지 기다린 뒤, 브라우저 안에서 잰 시간을 가져온다
    await this.page.locator('tbody tr').first().waitFor()
    const renderCompleteMs = await this.readRenderCompleteMs(rowCount)

    // 구간이 닫힌(idle) 뒤에 멈춘다 — 구간 종료 마크가 트레이스에 들어가야 구간을 잘라낼 수 있다
    const summaryMetrics = await this.waitForSettledSummary()
    const taskStats = await trace.stop()

    return { ...summaryMetrics, renderCompleteMs, ...toTaskMetrics(taskStats) }
  }

  /** 결과의 첫 행이 화면에 그려지는 시각을 페이지 안에서 기록해둔다 */
  private async watchFirstRowPaint() {
    await this.page.evaluate(() => {
      window.__orderGridFirstRowAt = null
      const observer = new MutationObserver(() => {
        if (!document.querySelector('tbody tr')) return
        observer.disconnect()
        // DOM에 들어간 직후가 아니라 그려진 뒤 시각을 잡는다 (rAF 두 번이면 화면 표시 직후)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.__orderGridFirstRowAt = performance.now()
          }),
        )
      })
      observer.observe(document.body, { childList: true, subtree: true })
    })
  }

  /**
   * API 응답이 끝난 시각부터 첫 행이 그려진 시각까지 (ms).
   * Playwright 왕복 시간이 섞이지 않도록 양쪽 모두 브라우저의 performance 타임라인에서 읽는다
   */
  private async readRenderCompleteMs(rowCount: RowCount): Promise<number | null> {
    return this.page.evaluate(async (size) => {
      const firstRowAt = await new Promise<number | null>((resolve) => {
        const check = () =>
          window.__orderGridFirstRowAt === null || window.__orderGridFirstRowAt === undefined
            ? requestAnimationFrame(check)
            : resolve(window.__orderGridFirstRowAt)
        check()
      })
      // getEntriesByType('resource')의 반환 타입이 PerformanceEntry라 응답 시각을 읽으려면 좁혀야 한다
      const isResourceTiming = (entry: PerformanceEntry): entry is PerformanceResourceTiming =>
        'responseEnd' in entry

      const request = performance
        .getEntriesByType('resource')
        .filter(isResourceTiming)
        .findLast((entry) => entry.name.includes(`/api/examples/order-grid?size=${size}`))

      return firstRowAt === null || request === undefined ? null : firstRowAt - request.responseEnd
    }, rowCount)
  }

  /** 건수를 골라 조회하고, 측정 구간이 열린 것(measuring)까지 확인한다 */
  private async search(rowCount: RowCount) {
    await this.rowCountRadio(rowCount).click()
    // 첫 로드나 직전 조회의 뒷정리가 이번 측정 구간과 겹치지 않도록, 조용해진 뒤에 누른다
    await test.step('메인 스레드 유휴 대기', () => this.waitForMainThreadQuiet())
    this.reports = []
    await this.page.getByRole('button', { name: '조회', exact: true }).click()
    // 보고를 쌓아두므로, 렌더에 막혀 늦게 확인하더라도 이미 지나간 measuring을 놓치지 않는다
    await this.waitForReport('측정 구간 시작(measuring)', () =>
      this.reports.some((report) => report.status === 'measuring'),
    )
  }

  /**
   * 측정 구간이 닫히고, 늦게 도착하는 프레임 기록까지 반영될 때까지 기다린다.
   *
   * 여기서 기다리는 idle은 "조회가 끝났다"가 아니라 "결과가 화면에 그려져 구간이 닫혔다"는 뜻이다.
   * 트랜지션을 쓰면 조회 종료와 결과 렌더 사이에 간격이 있어, 이 구분이 없으면 측정이 일찍 끝난다
   */
  private async waitForSettledSummary(): Promise<SummaryMetrics> {
    // measuring을 본 뒤이므로, 마지막 보고가 idle이면 이번 조회의 구간이 닫힌 것이다
    await this.waitForReport(
      '측정 구간 종료(idle)',
      () => this.latestReport?.status === 'idle',
      SETTLE_TIMEOUT_MS,
    )

    const deadline = Date.now() + SETTLE_TIMEOUT_MS
    let settled = this.readSummaryMetrics()
    let stableSince = Date.now()

    while (Date.now() - stableSince < SETTLE_WINDOW_MS) {
      if (Date.now() > deadline) throw new Error('측정값이 안정되지 않았습니다.')
      await this.page.waitForTimeout(SETTLE_POLL_MS)
      const current = this.readSummaryMetrics()
      if (!isSameSummary(current, settled)) {
        settled = current
        stableSince = Date.now()
      }
    }
    return settled
  }

  /** 마지막으로 받은 보고의 요약을 지표로 옮긴다. 요약이 없으면 모든 값이 null */
  private readSummaryMetrics(): SummaryMetrics {
    const report = this.latestReport
    const summary = report === undefined || report.status === 'unsupported' ? null : report.summary
    return toSummaryMetrics(summary)
  }

  /** 조건이 참이 될 때까지 받은 보고를 확인한다 — exposeFunction 호출은 비동기라 조작 직후엔 아직 도착 전일 수 있다 */
  private async waitForReport(
    description: string,
    isSatisfied: () => boolean,
    timeoutMs = REPORT_TIMEOUT_MS,
  ) {
    const deadline = Date.now() + timeoutMs
    while (!isSatisfied()) {
      if (Date.now() > deadline) {
        const received = this.reports.map((report) => report.status).join(' → ') || '없음'
        throw new Error(`${timeoutMs / 1000}초 안에 반응성 보고를 받지 못했습니다: ${description} (받은 보고: ${received})`)
      }
      await this.page.waitForTimeout(SETTLE_POLL_MS)
    }
  }

  /**
   * 하이드레이션 전에 조회 버튼을 누르면 React 핸들러 대신 기본 폼 제출(새로고침)이 일어나 측정이 시작되지 않는다.
   * React DOM이 하이드레이션하며 DOM 노드에 붙이는 __reactProps$ 키로 완료 여부를 판단한다 (측정 전용 우회).
   */
  private async waitForHydration() {
    await this.page.getByRole('button', { name: '조회', exact: true }).evaluate(
      (button) =>
        new Promise<void>((resolve) => {
          const isHydrated = () => Object.keys(button).some((key) => key.startsWith('__reactProps$'))
          const check = () => (isHydrated() ? resolve() : requestAnimationFrame(check))
          check()
        }),
    )
  }

  /**
   * 최근 MAIN_THREAD_QUIET_MS 동안 긴 프레임(LoAF)이 없고, 브라우저가 유휴 콜백을 돌릴 만큼 한가해질 때까지 기다린다.
   * 측정 대상과 같은 API(LoAF)로 판단하므로 "측정에 잡힐 만한 작업이 남아 있지 않다"는 뜻이 된다.
   */
  private async waitForMainThreadQuiet() {
    const result = await this.page.evaluate(
      ({ quietMs, timeoutMs, idleCheckTimeoutMs }) =>
        new Promise<{ isQuiet: boolean; recentLongFrames: string[] }>((resolve) => {
          const startedAt = performance.now()
          let lastBusyAt = startedAt
          // 끝내 조용해지지 않을 때 원인을 알 수 있도록 최근 긴 프레임을 남긴다
          const recentLongFrames: string[] = []

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              lastBusyAt = Math.max(lastBusyAt, entry.startTime + entry.duration)
              recentLongFrames.push(`${Math.round(entry.startTime)}ms 시작 · ${Math.round(entry.duration)}ms`)
              recentLongFrames.splice(0, recentLongFrames.length - 5)
            }
          })
          observer.observe({ type: 'long-animation-frame', buffered: true })

          const finish = (isQuiet: boolean) => {
            observer.disconnect()
            resolve({ isQuiet, recentLongFrames })
          }

          // timeout을 줘서, 페이지가 한가해지지 않더라도 콜백이 주기적으로 돌아 판단 자체가 멈추지 않게 한다
          const checkWhenIdle = () =>
            requestIdleCallback(
              () => {
                const now = performance.now()
                if (now - lastBusyAt >= quietMs) return finish(true)
                if (now - startedAt >= timeoutMs) return finish(false)
                checkWhenIdle()
              },
              { timeout: idleCheckTimeoutMs },
            )
          checkWhenIdle()
        }),
      {
        quietMs: MAIN_THREAD_QUIET_MS,
        timeoutMs: MAIN_THREAD_QUIET_TIMEOUT_MS,
        idleCheckTimeoutMs: IDLE_CHECK_TIMEOUT_MS,
      },
    )

    if (!result.isQuiet) {
      const frames = result.recentLongFrames.join(', ') || '없음 (유휴 콜백이 돌지 못함)'
      throw new Error(
        `메인 스레드가 ${MAIN_THREAD_QUIET_TIMEOUT_MS / 1000}초 동안 조용해지지 않아 측정을 시작하지 않았습니다. 최근 긴 프레임: ${frames}`,
      )
    }
  }

  private async assertMeasurementSupported() {
    // 측정 훅은 마운트 직후 한 번 보고하므로, 하이드레이션이 끝났으면 곧 첫 보고가 온다
    await this.waitForReport('마운트 직후 첫 보고', () => this.latestReport !== undefined)
    if (this.latestReport?.status === 'unsupported') {
      throw new Error('이 브라우저는 Long Animation Frames·Event Timing API를 지원하지 않습니다.')
    }
  }

  private get latestReport(): ResponsivenessProbeReport | undefined {
    return this.reports.at(-1)
  }

  private rowCountRadio(rowCount: RowCount) {
    return this.page.getByRole('radio', { name: `${rowCount.toLocaleString('ko-KR')}건` })
  }
}

/** 앱의 요약 객체에서 LoAF 지표를 옮긴다 (태스크 지표는 CDP 트레이스가 채운다) */
function toSummaryMetrics(summary: ResponsivenessSummary | null): SummaryMetrics {
  return {
    longestFrameDuration: summary?.worstFrame?.frameDuration ?? null,
    longFrameCount: summary?.longFrameCount ?? null,
  }
}

/** CDP 트레이스 요약을 지표로 옮긴다. 구간 마크를 찾지 못했으면 전부 null */
function toTaskMetrics(
  stats: MainThreadTaskStats | null,
): Omit<RunMetrics, keyof SummaryMetrics | 'renderCompleteMs'> {
  if (stats === null) {
    return {
      worstCaseInp: null,
      longestTaskMs: null,
      blockingTaskCount: null,
      totalTaskMs: null,
      scriptingMs: null,
      renderingMs: null,
      paintingMs: null,
      systemMs: null,
    }
  }

  return {
    worstCaseInp: estimateWorstCaseInpFromTask(stats.longestTaskMs),
    longestTaskMs: stats.longestTaskMs,
    blockingTaskCount: stats.blockingTaskCount,
    totalTaskMs: stats.totalTaskMs,
    scriptingMs: stats.scriptingMs,
    renderingMs: stats.renderingMs,
    paintingMs: stats.paintingMs,
    systemMs: stats.systemMs,
  }
}

function isSameSummary(a: SummaryMetrics, b: SummaryMetrics): boolean {
  return a.longestFrameDuration === b.longestFrameDuration && a.longFrameCount === b.longFrameCount
}
