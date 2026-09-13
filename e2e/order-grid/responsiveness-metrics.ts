// 측정값 정의 — 테스트(값 읽기)와 리포터(집계·출력)가 함께 쓴다

/**
 * 지표는 **무엇을 평가하느냐**로 나뉜다. 두 기법이 줄이는 것이 다르기 때문이다.
 *
 * - 트랜지션: 총량은 그대로 두고 잘게 쪼갠다 → **입력을 가장 오래 막은 한 조각**이 준다
 * - 가상화: 그릴 노드 수 자체를 줄인다 → **총 작업량**과 **결과가 뜨기까지의 시간**이 준다
 *
 * 한 지표로 둘을 평가하면 한쪽이 부당하게 평가된다. 총량만 보면 트랜지션은 효과가 없거나 나빠 보이고,
 * 최장 태스크만 보면 가상화가 어느 단계를 줄였는지 설명할 수 없다.
 *
 * 값의 출처는 셋이다.
 * - CDP 트레이스 (main-thread-trace.ts): 태스크·작업 분류. **50ms 하한이 없다**
 * - 테스트가 직접 (order-grid-page.ts): 결과 표시 시간
 * - 앱이 보낸 요약 (lib/performance): LoAF 프레임 — 하한이 있어 교차 검증용으로만 둔다
 */
export const METRIC_GROUP_LABEL = {
  interaction: '입력 차단 (트랜지션 평가)',
  workload: '작업량 (가상화 평가)',
  crossCheck: '교차 검증',
} as const

export type MetricGroup = keyof typeof METRIC_GROUP_LABEL

type MetricDefinition = {
  name: string
  group: MetricGroup
  label: string
  shortLabel: string
  unit: 'ms' | '개'
}

/** 그룹 순서, 그룹 안에서는 UX 영향이 큰 순서. 리포터는 이 순서대로 출력한다 */
export const METRICS = [
  // ───── 입력 차단 (트랜지션 평가) ─────
  {
    // 실측이 아니라 계산값이다. 브라우저는 실행 중인 태스크가 끝나야 입력을 배달하므로,
    // "가장 운 나쁜 사용자"가 기다리는 시간은 최장 태스크 + 그 결과가 그려지는 페인트 한 번이다
    name: 'worstCaseInp',
    group: 'interaction',
    label: '최악 INP(추정) = 최장 태스크 + 페인트 한 번',
    shortLabel: '추정INP',
    unit: 'ms',
  },
  {
    name: 'longestTaskMs',
    group: 'interaction',
    label: '└ 최장 태스크 (입력이 실제로 기다리는 단위)',
    shortLabel: '최장태스크',
    unit: 'ms',
  },
  {
    // 트랜지션이 실제로 작업을 쪼갰는지 보여주는 값 — 쪼갰다면 긴 태스크가 사라져 0에 가까워진다.
    // 전체 태스크 수가 아니라 16ms 이상만 세는 이유는 main-thread-trace.ts의 BLOCKING_TASK_THRESHOLD_MS 참고
    name: 'blockingTaskCount',
    group: 'interaction',
    label: '└ 입력을 막을 수 있는 태스크 수 (16ms 이상)',
    shortLabel: '차단태스크',
    unit: '개',
  },

  // ───── 작업량 (가상화 평가) ─────
  {
    // 사용자가 체감하는 값. 트랜지션의 대가도 여기서 드러난다 — 입력은 덜 막지만 결과는 늦게 뜰 수 있다
    name: 'renderCompleteMs',
    group: 'workload',
    label: '결과 표시 시간 (응답 완료 → 첫 행 페인트)',
    shortLabel: '결과표시',
    unit: 'ms',
  },
  {
    name: 'totalTaskMs',
    group: 'workload',
    label: '메인 스레드 총 작업량 (아래 넷의 합)',
    shortLabel: '총작업',
    unit: 'ms',
  },
  {
    name: 'scriptingMs',
    group: 'workload',
    label: '└ 스크립트 (React 재조정·핸들러·파싱·GC)',
    shortLabel: '스크립트',
    unit: 'ms',
  },
  {
    name: 'renderingMs',
    group: 'workload',
    label: '└ 렌더링 (스타일 계산·레이아웃)',
    shortLabel: '렌더링',
    unit: 'ms',
  },
  {
    // 래스터·GPU는 다른 스레드라 포함되지 않는다. DevTools에서 Main 트랙을 선택했을 때의 Painting과 같은 기준
    name: 'paintingMs',
    group: 'workload',
    label: '└ 페인트 (메인 스레드 몫)',
    shortLabel: '페인트',
    unit: 'ms',
  },
  {
    name: 'systemMs',
    group: 'workload',
    label: '└ 기타 (태스크 오버헤드·미분류)',
    shortLabel: '기타',
    unit: 'ms',
  },

  // ───── 교차 검증 ─────
  {
    name: 'longestFrameDuration',
    group: 'crossCheck',
    label: '최장 프레임 (LoAF — 50ms 하한)',
    shortLabel: '프레임',
    unit: 'ms',
  },
  {
    name: 'longFrameCount',
    group: 'crossCheck',
    label: '긴 프레임 수 (LoAF)',
    shortLabel: '긴프레임',
    unit: '개',
  },
] as const satisfies readonly MetricDefinition[]

export type MetricName = (typeof METRICS)[number]['name']

/** 한 회차의 측정값. 값이 없으면(예: 긴 프레임이 없었음) null */
export type RunMetrics = Record<MetricName, number | null>

/**
 * 앱이 보낸 반응성 요약에서 읽는 값.
 * 나머지는 테스트(결과 표시 시간)와 CDP 트레이스(태스크·작업 분류)가 채운다
 */
export type SummaryMetrics = Pick<RunMetrics, 'longestFrameDuration' | 'longFrameCount'>

/** 테스트가 측정값을 리포터로 넘길 때 쓰는 첨부 이름 */
export const METRICS_ATTACHMENT_NAME = 'responsiveness-metrics'

/** 리포터가 테스트 결과를 식별하는 annotation 종류 */
export const ANNOTATION = {
  scenario: 'responsiveness-scenario',
  round: 'responsiveness-round',
  warmup: 'responsiveness-warmup',
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** 첨부 JSON을 읽을 때 쓰는 런타임 검사 */
export function isRunMetrics(value: unknown): value is RunMetrics {
  return (
    isRecord(value) &&
    METRICS.every(({ name }) => value[name] === null || typeof value[name] === 'number')
  )
}

export type Stats = {
  /**
   * 이 통계에 반영된 회차 수.
   * 값이 없는 회차(null)는 집계에서 빠지므로 실행 회차 수보다 작을 수 있다 —
   * 5회 중 1회만 잡힌 값이 중앙값으로 올라오는 것을 표에서 알아볼 수 있게 항상 함께 보여준다
   */
  sampleSize: number
  median: number
  mean: number
  min: number
  max: number
  stdev: number
}

export function computeStats(values: readonly number[]): Stats | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  // 표본표준편차(÷n−1)를 쓴다. 모분산(÷n)은 편차를 작게 내 시나리오 간 차이를 실제보다 유의하게 보이게 한다
  const variance =
    values.length < 2
      ? 0
      : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)

  return {
    sampleSize: values.length,
    median,
    mean,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdev: Math.sqrt(variance),
  }
}

const numberFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })

export function formatMetricValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : numberFormatter.format(value)
}
