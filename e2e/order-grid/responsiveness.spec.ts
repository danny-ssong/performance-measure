/**
 * 주문 그리드 렌더 비용 반복 측정
 *
 * 측정 자체는 앱의 측정 훅(useQueryResponsiveness)이 하고, 여기서는 시나리오를 실행한 뒤
 * 앱이 보낸 요약(lib/performance/responsiveness-probe.ts)을 받아 첨부로 남긴다. 회차별 정리·집계는 responsiveness-summary-reporter가 한다.
 *
 * 시나리오는 조회만 하고 렌더 도중 입력을 넣지 않는다 — 대기 중인 입력이 있으면 프레임 구간 분해가
 * 망가지기 때문이다(OrderGridPage.measureQueryRender 주석 참고). 입력이 얼마나 막히는지는
 * 프레임 길이에서 계산한 '최악 INP(추정)'이 대신 말해준다.
 *
 * 실행 (프로덕션 서버를 먼저 띄운다: npm run build && npm run start)
 *   npm run measure:order-grid                         # 6개 시나리오 × 5회
 *   npm run measure:order-grid -- --ui                 # 단계별로 화면을 보면서 실행
 *   npm run measure:order-grid -- --grep "virtualized@1000"   # 일부 시나리오만
 *   MEASURE_RUNS=10 CPU_THROTTLE=4 npm run measure:order-grid
 *
 * 환경 변수
 *   MEASURE_RUNS    시나리오별 반복 횟수 (기본 5)
 *   MEASURE_WARMUP  집계에서 뺄 예열 회차 수 (기본 0)
 *   CPU_THROTTLE    CPU 감속 배율, 저사양 기기 흉내 (기본 1 = 감속 없음)
 *   BASE_URL        측정할 서버 주소 (기본 http://localhost:3000)
 */
import { expect, test } from '@playwright/test'
import {
  ANNOTATION,
  METRICS_ATTACHMENT_NAME,
  formatMetricValue,
  type RunMetrics,
} from './responsiveness-metrics'
import { OrderGridPage } from './order-grid-page'

function readIntegerEnv(name: string, fallback: number, { min }: { min: number }): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name}는 ${min} 이상의 정수여야 합니다: ${raw}`)
  }
  return value
}

const RUNS = readIntegerEnv('MEASURE_RUNS', 5, { min: 1 })
const WARMUP = readIntegerEnv('MEASURE_WARMUP', 0, { min: 0 })
const CPU_THROTTLE = readIntegerEnv('CPU_THROTTLE', 1, { min: 1 })

// ───────── 시나리오: 그리드 × 조회 건수. 추가하려면 배열만 늘리면 된다 ─────────

const GRIDS = [
  { id: 'plain', label: '테이블 렌더', path: '/examples/order-grid/table' },
  { id: 'virtualized', label: '가상화', path: '/examples/order-grid/virtualized' },
  {
    id: 'virtualized-transition',
    label: '가상화+트랜지션',
    path: '/examples/order-grid/virtualized-transition',
  },
] as const

const ROW_COUNTS = [200, 1000] as const

const SCENARIOS = GRIDS.flatMap((grid) =>
  ROW_COUNTS.map((rowCount) => ({
    id: `${grid.id}@${rowCount}`,
    label: `${grid.label} · ${rowCount.toLocaleString('ko-KR')}건`,
    grid,
    rowCount,
  })),
)

// UX에 미치는 영향이 큰 순서로 한 줄 요약
function describeMeasurement(metrics: RunMetrics): string {
  return [
    `최악 INP(추정) ${formatMetricValue(metrics.worstCaseInp)}ms`,
    `최장 태스크 ${formatMetricValue(metrics.longestTaskMs)}ms`,
    `결과 표시 ${formatMetricValue(metrics.renderCompleteMs)}ms`,
    `차단 태스크 ${formatMetricValue(metrics.blockingTaskCount)}개 · 합 ${formatMetricValue(metrics.totalTaskMs)}ms`,
    `(스크립트 ${formatMetricValue(metrics.scriptingMs)} · 렌더링 ${formatMetricValue(metrics.renderingMs)} · 페인트 ${formatMetricValue(metrics.paintingMs)} · 기타 ${formatMetricValue(metrics.systemMs)}ms)`,
    `최장 프레임 ${formatMetricValue(metrics.longestFrameDuration)}ms`,
    `긴 프레임 ${formatMetricValue(metrics.longFrameCount)}개`,
  ].join(' · ')
}

// ───────── 회차 × 시나리오 테스트 생성 ─────────
// 시나리오를 회차마다 번갈아 돌려, 시간에 따른 기기 상태 변화(발열 등)가 한 시나리오에 몰리지 않게 한다

for (let round = 1; round <= WARMUP + RUNS; round++) {
  const isWarmup = round <= WARMUP
  const roundLabel = isWarmup ? `예열 ${round}` : `${round - WARMUP}회`

  for (const scenario of SCENARIOS) {
    test(
      `[${scenario.id}] ${scenario.label} — ${roundLabel}`,
      {
        annotation: [
          { type: ANNOTATION.scenario, description: scenario.id },
          { type: ANNOTATION.round, description: String(round - WARMUP) },
          ...(isWarmup ? [{ type: ANNOTATION.warmup, description: 'true' }] : []),
        ],
      },
      // 테스트마다 새 브라우저 컨텍스트라 React Query 캐시·편집값 등 이전 회차 상태가 섞이지 않는다
      async ({ page, context }, testInfo) => {
        // 트레이스(최장 태스크)와 CPU 감속 둘 다 CDP로만 되므로 항상 세션을 만든다
        const client = await context.newCDPSession(page)
        if (CPU_THROTTLE > 1) {
          await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
        }

        const gridPage = new OrderGridPage(page, client)
        await test.step('페이지 열기', () => gridPage.goto(scenario.grid.path))

        const metrics = await test.step(`${scenario.rowCount.toLocaleString('ko-KR')}건 조회 · 렌더 비용 측정`, () =>
          gridPage.measureQueryRender(scenario.rowCount),
        )

        // 태스크 지표가 null이면 트레이스에서 측정 구간을 찾지 못한 것이다 — 값 없이 통과시키면 안 된다
        expect(metrics.longestTaskMs, '트레이스에서 측정 구간을 찾지 못했습니다').not.toBeNull()

        // HTML 리포트·UI 모드에서 바로 보이도록 요약을 annotation으로, 원본 값은 첨부로 남긴다
        testInfo.annotations.push({ type: '측정값', description: describeMeasurement(metrics) })
        await testInfo.attach(METRICS_ATTACHMENT_NAME, {
          body: JSON.stringify(metrics),
          contentType: 'application/json',
        })
      },
    )
  }
}
