import type { FrameBlockingReport, FrameDurationBreakdown } from './frame-blocking'
import {
  WORST_CASE_INP_BELOW_FLOOR,
  estimateWorstCaseInp,
  type WorstCaseInpEstimate,
} from './inp-rating'
import type { InteractionEventReport } from './interaction-timing'
import type { LongTaskReport } from './long-task'

/** 상호작용 하나의 INP 방식 지연과 그 구성 */
export type InteractionLatency = {
  interactionId: number
  /** 상호작용의 첫 이벤트 이름 (예: pointerdown, keydown) */
  eventName: string
  startTime: number
  /** ① + ② + ③ — INP가 이 값으로 매겨진다 */
  duration: number
  /** ① 입력이 들어와서 핸들러가 실행되기 시작할 때까지 (메인 스레드가 막혀 있던 시간) */
  inputDelay: number
  /** ② 이벤트 핸들러 실행 시간 */
  processingDuration: number
  /** ③ 핸들러가 끝나고 다음 화면이 실제로 그려질 때까지 */
  presentationDelay: number
}

/** 프레임 하나의 비용 — 얼마나 길었고, 그 시간이 어디에 쓰였고, 그중 얼마나 입력을 막았는지 */
export type FrameCost = {
  frameDuration: number
  breakdown: FrameDurationBreakdown
  /** frameDuration 중 입력을 막은 시간. breakdown의 합이 아니라 별개 관점의 값이다 */
  blockingDuration: number
  /**
   * 이 프레임 안에서 가장 길었던 태스크 (Long Tasks API).
   * 긴 태스크로 잡히지 않았으면 null이며, 그때는 "50ms 미만"이라는 사실만 알 수 있다.
   * 입력이 막히는 단위는 프레임이 아니라 태스크라서 따로 붙인다 — 자세한 내용은 long-task.ts 주석 참고
   */
  longestTaskDuration: number | null
}

/** 측정 구간 요약 — 필드는 UX에 미치는 영향이 큰 순서다 */
export type ResponsivenessSummary = {
  /** 구간 안 프레임 중 입력을 가장 오래 막을 수 있었던 값 (계산값). 긴 프레임이 없으면 하한만 안다 */
  worstCaseInp: WorstCaseInpEstimate
  /** 구간 안에서 가장 느렸던 상호작용. 구간 중 상호작용이 없었으면 null */
  worstInteraction: InteractionLatency | null
  /** 구간 안에서 가장 길었던 프레임. 긴 프레임이 없었으면 null */
  worstFrame: FrameCost | null
  /** 구간 안 프레임들의 입력 차단 시간 합계 (ms) */
  totalBlockingDuration: number
  /** 구간 안에서 관찰된 긴 프레임(50ms 이상) 수 */
  longFrameCount: number
}

type MeasurementWindow = {
  start: number
  /** null이면 아직 구간이 열려 있다 */
  end: number | null
}

/**
 * 측정 구간의 양끝을 User Timing 마크로도 남긴다.
 *
 * 이 파일이 모으는 LoAF·Long Tasks는 관찰 하한이 50ms라, 트랜지션처럼 작업을 잘게 쪼개는 구현에서는
 * 어느 태스크도 기록되지 않는다("50ms 미만"이라는 사실만 남는다). 하한이 없는 CDP 트레이스로 같은 구간을
 * 다시 재려면 트레이스 쪽에서 구간의 경계를 찾을 수 있어야 하는데, 마크는 트레이스에 blink.user_timing
 * 이벤트로 들어가므로 그 경계 역할을 한다 (e2e/order-grid/main-thread-trace.ts가 이 이름으로 찾는다).
 *
 * 덤으로 DevTools Performance 패널의 Timings 트랙에도 그대로 보여서 수동 분석에도 쓸 수 있다.
 */
export const MEASUREMENT_WINDOW_MARK = {
  start: 'responsiveness-window-start',
  end: 'responsiveness-window-end',
} as const

/** 시작 시각과 길이를 가진 모든 기록(프레임·태스크·상호작용) */
type TimeSpan = { startTime: number; duration: number }

/** 한 상호작용에 속한 이벤트들을 합친 중간 상태 */
type InteractionAccumulator = {
  interactionId: number
  eventName: string
  startTime: number
  duration: number
  firstProcessingStart: number
  lastProcessingEnd: number
}

/** 구간에서 모은 원본 기록. 요약은 여기서 그때그때 파생한다 */
type RecordedSpans = {
  frames: FrameBlockingReport[]
  longTasks: LongTaskReport[]
  interactions: Map<number, InteractionAccumulator>
}

function createRecordedSpans(): RecordedSpans {
  return { frames: [], longTasks: [], interactions: new Map() }
}

// 구간 시작 전에 시작했더라도 구간에 걸쳐 있으면 포함한다 (예: 조회 버튼 클릭을 처리한 프레임)
function overlapsWindow(span: TimeSpan, measurementWindow: MeasurementWindow): boolean {
  const spanEnd = span.startTime + span.duration
  const startsBeforeWindowEnds =
    measurementWindow.end === null || span.startTime <= measurementWindow.end
  return spanEnd >= measurementWindow.start && startsBeforeWindowEnds
}

function overlapsSpan(a: TimeSpan, b: TimeSpan): boolean {
  return a.startTime <= b.startTime + b.duration && b.startTime <= a.startTime + a.duration
}

// 같은 상호작용의 이벤트(pointerdown·pointerup·click 등)를 하나로 합친다 — web-vitals의 INP 계산 방식
function mergeInteractionEvent(
  accumulator: InteractionAccumulator | undefined,
  event: InteractionEventReport,
): InteractionAccumulator {
  if (!accumulator) {
    return {
      interactionId: event.interactionId,
      eventName: event.name,
      startTime: event.startTime,
      duration: event.duration,
      firstProcessingStart: event.processingStart,
      lastProcessingEnd: event.processingEnd,
    }
  }

  const isEarlier = event.startTime < accumulator.startTime
  return {
    interactionId: accumulator.interactionId,
    eventName: isEarlier ? event.name : accumulator.eventName,
    startTime: Math.min(accumulator.startTime, event.startTime),
    duration: Math.max(accumulator.duration, event.duration),
    firstProcessingStart: Math.min(accumulator.firstProcessingStart, event.processingStart),
    lastProcessingEnd: Math.max(accumulator.lastProcessingEnd, event.processingEnd),
  }
}

function toInteractionLatency(accumulator: InteractionAccumulator): InteractionLatency {
  const { startTime, duration, firstProcessingStart, lastProcessingEnd } = accumulator
  return {
    interactionId: accumulator.interactionId,
    eventName: accumulator.eventName,
    startTime,
    duration,
    inputDelay: firstProcessingStart - startTime,
    processingDuration: lastProcessingEnd - firstProcessingStart,
    // duration이 8ms 단위로 반올림돼 음수가 될 수 있으므로 0으로 막는다
    presentationDelay: Math.max(0, startTime + duration - lastProcessingEnd),
  }
}

function findWorstInteraction(
  interactions: ReadonlyMap<number, InteractionAccumulator>,
): InteractionLatency | null {
  let worst: InteractionAccumulator | null = null
  for (const interaction of interactions.values()) {
    if (worst === null || interaction.duration > worst.duration) worst = interaction
  }
  return worst ? toInteractionLatency(worst) : null
}

function toFrameSpan(frame: FrameBlockingReport): TimeSpan {
  return { startTime: frame.startTime, duration: frame.frameDuration }
}

/**
 * 프레임과 시간이 겹치는 긴 태스크 중 가장 긴 것.
 * 태스크 기록은 프레임 기록과 따로 도착하므로, 요약을 만들 때 시각으로 맞춰 붙인다
 */
function longestTaskIn(
  frame: FrameBlockingReport,
  longTasks: readonly LongTaskReport[],
): number | null {
  const frameSpan = toFrameSpan(frame)
  const durations = longTasks
    .filter((task) => overlapsSpan(task, frameSpan))
    .map((task) => task.duration)
  return durations.length === 0 ? null : Math.max(...durations)
}

function toFrameCost(frame: FrameBlockingReport, longTasks: readonly LongTaskReport[]): FrameCost {
  return {
    frameDuration: frame.frameDuration,
    breakdown: frame.breakdown,
    blockingDuration: frame.blockingDuration,
    longestTaskDuration: longestTaskIn(frame, longTasks),
  }
}

// 구성 요소를 프레임들에 걸쳐 더하지 않고 가장 긴 프레임 하나만 남긴다.
// 합치면 성격이 다른 프레임(응답 파싱·결과 렌더·스크롤)이 섞여 "어디에 시간을 썼나"를 읽을 수 없다
function findLongestFrame(frameCosts: readonly FrameCost[]): FrameCost | null {
  let longest: FrameCost | null = null
  for (const frame of frameCosts) {
    if (longest === null || frame.frameDuration > longest.frameDuration) longest = frame
  }
  return longest
}

/**
 * 프레임마다 최악 INP 상한을 구해 그중 최댓값을 취한다.
 * 프레임을 가로질러 "가장 긴 태스크"와 "가장 긴 렌더링"을 따로 뽑아 더하면, 실제로는 함께 일어나지
 * 않은 조합이 나와 상한이 헐거워진다. 그래서 한 프레임 안에서 짝지은 뒤 비교한다
 */
function estimateWorstCaseInpAcross(frameCosts: readonly FrameCost[]): WorstCaseInpEstimate {
  if (frameCosts.length === 0) return WORST_CASE_INP_BELOW_FLOOR

  const durationMs = Math.max(...frameCosts.map(estimateWorstCaseInp))
  return { durationMs, isBelowFloor: false }
}

function summarize(recorded: RecordedSpans): ResponsivenessSummary {
  const frameCosts = recorded.frames.map((frame) => toFrameCost(frame, recorded.longTasks))

  return {
    worstCaseInp: estimateWorstCaseInpAcross(frameCosts),
    worstInteraction: findWorstInteraction(recorded.interactions),
    worstFrame: findLongestFrame(frameCosts),
    totalBlockingDuration: frameCosts.reduce((sum, frame) => sum + frame.blockingDuration, 0),
    longFrameCount: frameCosts.length,
  }
}

export type ResponsivenessTracker = ReturnType<typeof createResponsivenessTracker>

/**
 * 측정 구간(start~end)과 겹치는 긴 프레임(LoAF)·긴 태스크(Long Tasks)·상호작용(Event Timing)을 모아 요약하는 저장소.
 *
 * 구간 경계(startWindow/endWindow)와 기록 수집(record*)을 분리한 이유:
 * 세 API 모두 기록이 프레임·화면 표시 뒤에 비동기로 도착하므로, 구간이 닫힌 뒤에 도착한 기록도
 * 시작 시각이 구간에 걸쳐 있으면 반영해야 한다. 그래서 관찰자는 계속 켜두고, 구간 판정은 시각으로 한다.
 *
 * 요약을 누적하지 않고 원본 기록에서 매번 파생하는 이유:
 * 태스크는 자기 프레임보다 늦게 도착할 수 있어, 프레임을 받는 시점에는 그 안의 가장 긴 태스크를 알 수 없다.
 * 기록 수는 구간당 한 자릿수라 매번 다시 계산해도 비용이 문제되지 않는다.
 *
 * 요약이 바뀔 때 알림을 받을 수 있게 subscribe/getSnapshot을 제공한다 (useSyncExternalStore와도 호환된다).
 */
export function createResponsivenessTracker() {
  let measurementWindow: MeasurementWindow | null = null
  let recorded = createRecordedSpans()
  let summary: ResponsivenessSummary | null = null
  const listeners = new Set<() => void>()

  const isInWindow = (span: TimeSpan) =>
    measurementWindow !== null && overlapsWindow(span, measurementWindow)

  const publish = () => {
    summary = summarize(recorded)
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** 한 번도 구간을 연 적이 없으면 null */
    getSnapshot: () => summary,

    /** 구간이 열려 있는지 — 자동화 측정이 구간의 시작·종료를 이 값으로 판단한다 */
    isWindowOpen: () => measurementWindow !== null && measurementWindow.end === null,

    startWindow: () => {
      // 이전 조회의 마크를 남겨두면 트레이스에서 어느 쌍이 이번 구간인지 가릴 수 없다
      performance.clearMarks(MEASUREMENT_WINDOW_MARK.start)
      performance.clearMarks(MEASUREMENT_WINDOW_MARK.end)
      performance.mark(MEASUREMENT_WINDOW_MARK.start)

      measurementWindow = { start: performance.now(), end: null }
      recorded = createRecordedSpans()
      publish()
    },
    endWindow: () => {
      if (measurementWindow === null || measurementWindow.end !== null) return
      performance.mark(MEASUREMENT_WINDOW_MARK.end)
      measurementWindow = { ...measurementWindow, end: performance.now() }
    },

    /** 구간에 속한 프레임이면 반영하고 true를 돌려준다 */
    recordFrame: (frame: FrameBlockingReport): boolean => {
      if (!isInWindow(toFrameSpan(frame))) return false
      recorded = { ...recorded, frames: [...recorded.frames, frame] }
      publish()
      return true
    },
    /** 구간에 속한 긴 태스크면 반영하고 true를 돌려준다 */
    recordLongTask: (task: LongTaskReport): boolean => {
      if (!isInWindow(task)) return false
      recorded = { ...recorded, longTasks: [...recorded.longTasks, task] }
      publish()
      return true
    },
    /** 구간에 속한 상호작용 이벤트면 반영하고 true를 돌려준다 */
    recordInteractionEvent: (event: InteractionEventReport): boolean => {
      if (!isInWindow(event)) return false
      const interactions = new Map(recorded.interactions).set(
        event.interactionId,
        mergeInteractionEvent(recorded.interactions.get(event.interactionId), event),
      )
      recorded = { ...recorded, interactions }
      publish()
      return true
    },

    /** 상호작용과 시간이 겹친 긴 프레임들 — 느린 상호작용의 원인 스크립트를 찾는 데 쓴다 */
    framesDuring: (span: TimeSpan): FrameBlockingReport[] =>
      recorded.frames.filter((frame) => overlapsSpan(toFrameSpan(frame), span)),
  }
}
