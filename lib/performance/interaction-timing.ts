/** Event Timing 엔트리 — interactionId가 TS 기본 lib에 없어서 확장 선언 */
interface InteractionEventTiming extends PerformanceEventTiming {
  /** 같은 상호작용(예: pointerdown·pointerup·click)에 속한 이벤트끼리 공유하는 id. 상호작용이 아니면 0 */
  interactionId: number
}

function isInteractionEvent(entry: PerformanceEntry): entry is InteractionEventTiming {
  return (
    entry.entryType === 'event' &&
    'interactionId' in entry &&
    typeof entry.interactionId === 'number' &&
    entry.interactionId > 0
  )
}

/** Event Timing API의 interactionId는 Chromium(96+) 전용이다 */
export function isInteractionTimingSupported(): boolean {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes('event') &&
    typeof PerformanceEventTiming !== 'undefined' &&
    'interactionId' in PerformanceEventTiming.prototype
  )
}

/**
 * 상호작용에 속한 이벤트 하나의 타이밍.
 * INP 방식 지연 = ① 입력 지연(startTime→processingStart) + ② 처리 시간(processingStart→processingEnd)
 *               + ③ 표시 지연(processingEnd→startTime+duration, 다음 화면이 실제로 그려질 때까지)
 */
export interface InteractionEventReport {
  interactionId: number
  /** 이벤트 이름 (예: pointerdown, click, keydown) */
  name: string
  /** 입력이 발생한 시각 */
  startTime: number
  /** 입력부터 다음 화면 표시까지 (8ms 단위로 반올림됨) */
  duration: number
  processingStart: number
  processingEnd: number
}

type ObserveInteractionsOptions = {
  /** 이 길이(ms) 이상인 이벤트만 받는다. 브라우저가 허용하는 최솟값은 16 */
  durationThreshold?: number
}

/** durationThreshold는 Event Timing·LoAF 전용 옵션이라 TS 기본 lib의 PerformanceObserverInit에 아직 없다 */
type EventObserverInit = PerformanceObserverInit & {
  durationThreshold: number
}

/**
 * 사용자 상호작용(클릭·탭·키 입력)의 이벤트 타이밍을 관찰한다. hover·스크롤처럼 상호작용이 아닌 이벤트는 제외한다.
 * @returns 관찰을 중단하는 함수
 */
export function observeInteractions(
  onReport: (report: InteractionEventReport) => void,
  options: ObserveInteractionsOptions = {},
): () => void {
  const { durationThreshold = 16 } = options

  if (!isInteractionTimingSupported()) {
    return () => {}
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!isInteractionEvent(entry)) continue
      onReport({
        interactionId: entry.interactionId,
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
      })
    }
  })

  const init: EventObserverInit = { type: 'event', durationThreshold, buffered: false }
  observer.observe(init)

  return () => observer.disconnect()
}
