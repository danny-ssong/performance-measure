import type { CDPSession } from '@playwright/test'
import { MEASUREMENT_WINDOW_MARK } from '@/lib/performance/responsiveness-tracker'

/**
 * 측정 구간의 메인 스레드 작업을 CDP 트레이스로 잰다. 두 가지 질문에 답한다.
 *
 * 1. **입력을 가장 오래 막은 한 조각은 얼마였나** (트랜지션 평가)
 *    앱 안의 Long Tasks·LoAF는 관찰 하한이 50ms라, 트랜지션이 잘게 쪼갠 태스크를 하나도 기록하지 못한다.
 *    CDP 트레이스의 RunTask는 하한이 없어 5ms 태스크도 개별로 잡힌다.
 *
 * 2. **총 작업을 어디에 썼나** (가상화 평가)
 *    DevTools Performance 패널의 Summary(Scripting / Rendering / Painting / System)와 같은 분류로 나눈다.
 *    CDP는 이 요약을 직접 주지 않는다 — DevTools가 트레이스 이벤트를 분류해 계산하는 값이라 여기서도 같은 방식으로 계산한다.
 *
 * 대가: 트레이스를 켜면 측정 대상 자체가 약 8% 느려진다 (동일 작업 3회 비교: 174~180ms → 190~194ms).
 * 모든 시나리오에 똑같이 걸리므로 시나리오 간 비율 비교에는 무해하지만, 절대값을 다른 측정과 비교하면 안 된다.
 */

/**
 * 트레이스에 담을 카테고리.
 * - `disabled-by-default-devtools.timeline`: RunTask(태스크 경계). 하한이 없다
 * - `devtools.timeline`: 스크립트·스타일·레이아웃·페인트 등 작업 종류별 이벤트
 * - `blink.user_timing`: performance.mark — 구간 경계를 트레이스 시간축에서 찾는 데 쓴다
 */
const TRACE_CATEGORIES = [
  'disabled-by-default-devtools.timeline',
  'devtools.timeline',
  'blink.user_timing',
]

/** 태스크 경계 이벤트. 셀프 타임은 태스크 스케줄링 오버헤드라 System으로 분류한다 */
const TASK_EVENT = 'RunTask'

/** 완료된 구간(ph: 'X')만 duration을 가진다 — 마크는 순간 이벤트(ph: 'I')다 */
const COMPLETE_PHASE = 'X'

/**
 * 이 길이 이상인 태스크만 "입력을 막을 수 있다"고 본다 (60Hz 기준 한 프레임).
 *
 * 하한이 없다는 건 사소한 태스크까지 다 잡힌다는 뜻이기도 하다.
 * 실측(가상화 1,000건, 4x 감속): 구간 내 84개 중 **57개가 0.1ms 미만**이고 그 합이 0.6ms였다.
 * 전체 개수를 세면 이 잡음에 묻혀 "작업이 몇 조각으로 쪼개졌나"를 읽을 수 없다.
 * 한 프레임보다 짧은 태스크는 입력을 프레임 밖으로 밀어내지 못하므로 세지 않는다
 */
const BLOCKING_TASK_THRESHOLD_MS = 16

/** DevTools Summary와 같은 작업 분류 */
type WorkCategory = 'scripting' | 'rendering' | 'painting' | 'system'

/**
 * 이벤트 이름 → 작업 분류.
 *
 * DevTools 프론트엔드의 분류를 참고해 옮긴 **근사치**다. 이름이 목록에 없는 이벤트는 System으로 보내
 * 스크립트·렌더링 값을 부풀리지 않게 한다 — 모르는 것은 "기타"에 모아 두는 편이 해석을 덜 오염시킨다.
 * 이벤트 이름은 Chromium 버전에 따라 바뀔 수 있으므로, 버전을 올리면 한 번은 같은 조건에서
 * DevTools Summary와 나란히 놓고 맞춰본다.
 */
const RENDERING_EVENTS = new Set([
  'UpdateLayoutTree',
  'Layout',
  'PrePaint',
  'Layerize',
  'ScheduleStyleRecalculation',
  'InvalidateLayout',
  'HitTest',
  'UpdateLayerTree',
  'ComputeIntersections',
  'BeginMainThreadFrame',
  'ScrollLayer',
])

const PAINTING_EVENTS = new Set([
  'Paint',
  'PaintSetup',
  'PaintImage',
  'Rasterize',
  'RasterTask',
  'CompositeLayers',
  'UpdateLayer',
  'Commit',
  'DecodeImage',
  'ResizeImage',
])

const SCRIPTING_EVENTS = new Set([
  'FunctionCall',
  'EvaluateScript',
  'EventDispatch',
  'TimerFire',
  'RunMicrotasks',
  'FireAnimationFrame',
  'FireIdleCallback',
  'XHRReadyStateChange',
  'XHRLoad',
  'MinorGC',
  'MajorGC',
])

/** V8 내부 이벤트(컴파일·GC 세부 단계)는 이름이 많고 자주 바뀌어 접두사로 묶는다 */
const SCRIPTING_EVENT_PREFIXES = ['V8.', 'v8.']

function categorize(eventName: string): WorkCategory {
  if (RENDERING_EVENTS.has(eventName)) return 'rendering'
  if (PAINTING_EVENTS.has(eventName)) return 'painting'
  if (
    SCRIPTING_EVENTS.has(eventName) ||
    SCRIPTING_EVENT_PREFIXES.some((prefix) => eventName.startsWith(prefix))
  ) {
    return 'scripting'
  }
  return 'system'
}

/**
 * 트레이스 이벤트 중 이 모듈이 읽는 필드만.
 *
 * CDP 프로토콜 타입은 이벤트를 `{ [key: string]: string }`으로 선언하지만 실제 ts·dur은 숫자다.
 * 그래서 타입 단언 대신 런타임 가드(toTraceEvent)로 좁힌다
 */
type TraceEvent = {
  name: string
  categories: string
  phase: string
  processId: number
  threadId: number
  /** 시작 시각 (마이크로초) */
  startUs: number
  /** 길이 (마이크로초). 순간 이벤트는 0 */
  durationUs: number
}

/** 구간 안에서 메인 스레드가 실제로 어떻게 시간을 썼는지 */
export type MainThreadTaskStats = {
  /**
   * 가장 긴 태스크 (ms) — 입력이 최대 얼마나 기다릴 수 있었나.
   * 브라우저는 실행 중인 태스크가 끝나야 입력을 배달하므로, 이 값이 최악 INP의 출발점이다
   */
  longestTaskMs: number
  /**
   * 입력을 막을 수 있는 태스크(16ms 이상) 수.
   * 트랜지션이 실제로 쪼갰다면 이 값이 0에 가까워진다 — 긴 태스크가 짧은 조각들로 바뀌기 때문이다
   */
  blockingTaskCount: number
  /** 태스크 시간 합계 (ms) — 총 작업량. 아래 네 분류의 합과 같다. 쪼개기는 이 값을 줄이지 않는다 */
  totalTaskMs: number
  /** 스크립트 (ms) — React 재조정·이벤트 핸들러·JSON 파싱·GC */
  scriptingMs: number
  /** 렌더링 (ms) — 스타일 계산·레이아웃·페인트 준비 */
  renderingMs: number
  /** 페인트 (ms) — **메인 스레드 몫만**. 래스터·GPU 작업은 다른 스레드라 포함되지 않는다 */
  paintingMs: number
  /** 기타 (ms) — 태스크 스케줄링 오버헤드와 분류표에 없는 이벤트 */
  systemMs: number
}

export type MainThreadTrace = {
  /** 트레이스를 멈추고 구간을 잘라 요약한다. 구간 마크를 찾지 못하면 null */
  stop: () => Promise<MainThreadTaskStats | null>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  return typeof value === 'number' ? value : 0
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value : ''
}

/** 이름이 없는 이벤트는 쓸 수 없으므로 버린다 */
function toTraceEvent(value: unknown): TraceEvent | null {
  if (!isRecord(value)) return null

  const name = readString(value, 'name')
  if (name === '') return null

  return {
    name,
    categories: readString(value, 'cat'),
    phase: readString(value, 'ph'),
    processId: readNumber(value, 'pid'),
    threadId: readNumber(value, 'tid'),
    startUs: readNumber(value, 'ts'),
    durationUs: readNumber(value, 'dur'),
  }
}

type MeasurementWindow = {
  startUs: number
  endUs: number
  processId: number
  threadId: number
}

/**
 * 트레이스에서 측정 구간의 경계를 찾는다.
 *
 * 마크는 앱이 구간을 열고 닫을 때 남긴다(lib/performance/responsiveness-tracker.ts).
 * 그래서 트레이스 시간축과 performance.now()를 맞추는 계산이 필요 없다 — 마크 자체가 경계다.
 *
 * 마크를 찾으면 그 마크가 있던 스레드가 측정 대상의 메인 스레드다.
 * 트레이스에는 여러 프로세스·스레드(컴포지터, 워커, 다른 탭)가 섞여 있으므로 이 식별이 필요하다
 */
function findMeasurementWindow(events: readonly TraceEvent[]): MeasurementWindow | null {
  const isMark = (event: TraceEvent, markName: string) =>
    event.name === markName && event.categories.includes('blink.user_timing')

  // 한 페이지에서 조회를 여러 번 했을 수 있으므로 마지막 구간을 쓴다
  const start = events.findLast((event) => isMark(event, MEASUREMENT_WINDOW_MARK.start))
  if (start === undefined) return null

  const end = events.find(
    (event) => isMark(event, MEASUREMENT_WINDOW_MARK.end) && event.startUs >= start.startUs,
  )
  if (end === undefined) return null

  return {
    startUs: start.startUs,
    endUs: end.startUs,
    processId: start.processId,
    threadId: start.threadId,
  }
}

type TimeRange = { startUs: number; endUs: number }

/** 구간에 걸쳐 있으면 포함한다 — 구간 시작 전에 시작한 태스크도 구간을 막았다면 세어야 한다 */
function overlaps(event: TraceEvent, range: TimeRange): boolean {
  return event.startUs + event.durationUs >= range.startUs && event.startUs <= range.endUs
}

/**
 * 구간을 걸쳐 있는 **태스크의 경계까지** 넓힌다.
 *
 * 마크 하나로 자르면 태스크가 반으로 잘린다. 구간 끝 마크는 rAF 콜백에서 찍히는데, 브라우저는
 * **같은 태스크 안에서** 그 뒤에 스타일·레이아웃·페인트·커밋을 이어서 한다. 마크 시각으로 자르면
 * 그 자식들만 빠지고 부모 RunTask는 남아, 빠진 자식의 시간이 부모의 셀프 타임에 남는다
 * — 페인트 비용이 사라지는 게 아니라 **기타(System)로 잘못 분류된다** (실측: 커밋 35.7ms가 통째로 기타로).
 *
 * 태스크는 원자 단위다. 걸쳤으면 통째로 넣고, 아니면 통째로 뺀다.
 *
 * 넓혀도 새 태스크가 딸려 들어오지는 않는다 — 경계를 넓힌 만큼은 그 경계 태스크가 차지하고 있고,
 * 태스크끼리는 겹치지 않기 때문이다
 */
function snapToTaskBoundaries(
  window: MeasurementWindow,
  mainThreadEvents: readonly TraceEvent[],
): TimeRange {
  const tasksInWindow = mainThreadEvents.filter(
    (event) => event.name === TASK_EVENT && overlaps(event, window),
  )

  return {
    startUs: Math.min(window.startUs, ...tasksInWindow.map((task) => task.startUs)),
    endUs: Math.max(window.endUs, ...tasksInWindow.map((task) => task.startUs + task.durationUs)),
  }
}

/**
 * 분류별 **셀프 타임** 합계 (ms).
 *
 * 트레이스 이벤트는 중첩돼 있다 (RunTask ⊃ FunctionCall ⊃ Layout). 길이를 그대로 더하면 같은 시간을
 * 부모와 자식에서 두 번 센다. 그래서 각 이벤트의 길이에서 직계 자식의 길이를 뺀 셀프 타임을 쓴다.
 * DevTools Summary도 셀프 타임 기준이다.
 *
 * 같은 스레드의 이벤트는 올바르게 중첩된다는 전제로, 시작 시각 순으로 훑으며 스택으로 부모를 찾는다
 */
function sumSelfTimeByCategory(events: readonly TraceEvent[]): Record<WorkCategory, number> {
  // 시작이 같으면 긴 쪽(부모)이 먼저 오게 한다
  const ordered = [...events].sort(
    (a, b) => a.startUs - b.startUs || b.durationUs - a.durationUs,
  )

  const selfTimeUs = new Map<TraceEvent, number>()
  const openEvents: TraceEvent[] = []

  for (const event of ordered) {
    // 이 이벤트가 시작하기 전에 끝난 이벤트는 부모가 될 수 없다
    while (openEvents.length > 0) {
      const top = openEvents[openEvents.length - 1]
      if (top.startUs + top.durationUs > event.startUs) break
      openEvents.pop()
    }

    const parent = openEvents.at(-1)
    if (parent !== undefined) {
      selfTimeUs.set(parent, (selfTimeUs.get(parent) ?? 0) - event.durationUs)
    }
    selfTimeUs.set(event, event.durationUs)
    openEvents.push(event)
  }

  const totals: Record<WorkCategory, number> = { scripting: 0, rendering: 0, painting: 0, system: 0 }
  for (const [event, selfUs] of selfTimeUs) {
    const category = event.name === TASK_EVENT ? 'system' : categorize(event.name)
    // 트레이스 반올림으로 셀프 타임이 아주 조금 음수가 될 수 있다
    totals[category] += Math.max(0, selfUs) / 1000
  }
  return totals
}

/** 모은 트레이스 이벤트에서 측정 구간만 잘라 요약한다 (순수 함수 — 수집과 해석을 분리한다) */
export function summarizeMainThreadTasks(
  events: readonly TraceEvent[],
): MainThreadTaskStats | null {
  const window = findMeasurementWindow(events)
  if (window === null) return null

  const mainThreadEvents = events.filter(
    (event) =>
      event.phase === COMPLETE_PHASE &&
      event.processId === window.processId &&
      event.threadId === window.threadId,
  )

  const range = snapToTaskBoundaries(window, mainThreadEvents)
  const mainThreadEventsInWindow = mainThreadEvents.filter((event) => overlaps(event, range))

  const taskDurationsMs = mainThreadEventsInWindow
    .filter((event) => event.name === TASK_EVENT)
    .map((task) => task.durationUs / 1000)
  if (taskDurationsMs.length === 0) return null

  const workByCategory = sumSelfTimeByCategory(mainThreadEventsInWindow)

  return {
    longestTaskMs: Math.max(...taskDurationsMs),
    blockingTaskCount: taskDurationsMs.filter(
      (duration) => duration >= BLOCKING_TASK_THRESHOLD_MS,
    ).length,
    totalTaskMs: taskDurationsMs.reduce((total, duration) => total + duration, 0),
    scriptingMs: workByCategory.scripting,
    renderingMs: workByCategory.rendering,
    paintingMs: workByCategory.painting,
    systemMs: workByCategory.system,
  }
}

/**
 * 메인 스레드 트레이스를 시작한다. 측정 구간을 여는 조작(조회 클릭)보다 먼저 불러야 한다.
 * @returns 트레이스를 멈추고 요약을 돌려주는 핸들
 */
export async function startMainThreadTrace(client: CDPSession): Promise<MainThreadTrace> {
  const events: TraceEvent[] = []

  const collect = (payload: { value: { [key: string]: string }[] }) => {
    for (const rawEvent of payload.value) {
      const event = toTraceEvent(rawEvent)
      if (event !== null) events.push(event)
    }
  }

  // 남은 이벤트는 Tracing.end 뒤에 dataCollected로 몰려 오므로, tracingComplete까지 기다려야 다 모인다
  const completed = new Promise<void>((resolve) => {
    client.once('Tracing.tracingComplete', () => resolve())
  })

  client.on('Tracing.dataCollected', collect)
  await client.send('Tracing.start', { traceConfig: { includedCategories: TRACE_CATEGORIES } })

  return {
    async stop() {
      await client.send('Tracing.end')
      await completed
      client.off('Tracing.dataCollected', collect)
      return summarizeMainThreadTasks(events)
    },
  }
}
