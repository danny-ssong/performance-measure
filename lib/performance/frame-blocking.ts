/** LoAF 엔트리 — TS 기본 lib에 없어서 직접 선언 */
interface LongAnimationFrameTiming extends PerformanceEntry {
  blockingDuration: number
  renderStart: number
  styleAndLayoutStart: number
  firstUIEventTimestamp: number
  scripts: ReadonlyArray<{
    invoker: string
    sourceURL: string
    sourceFunctionName: string
    duration: number
    forcedStyleAndLayoutDuration: number
  }>
}

function isLongAnimationFrame(entry: PerformanceEntry): entry is LongAnimationFrameTiming {
  return entry.entryType === 'long-animation-frame'
}

/** LoAF의 관찰 하한 — 이보다 짧은 프레임은 기록 자체가 만들어지지 않는다 (durationThreshold의 최솟값) */
export const LONG_FRAME_THRESHOLD_MS = 50

/** Long Animation Frames API는 Chromium(123+) 전용이다 */
export function isFrameBlockingSupported(): boolean {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
  )
}

/**
 * 프레임 시간을 LoAF가 알려주는 세 구간 경계로 나눈 것. 세 값의 합은 frameDuration이다.
 *
 * 이름이 구간 경계를 그대로 옮긴 것임에 주의한다. "무슨 작업을 했는지"가 아니라
 * "언제부터 언제까지인지"로만 갈린 값이라, 각 구간에 들어가는 작업의 종류는 고정이 아니다.
 *
 * ⚠️ 특히 beforeRendering은 스크립트 전용 구간이 아니다.
 * 처리를 기다리는 입력(클릭·키 입력)이 있으면 브라우저가 스타일·레이아웃을 renderStart 앞으로 당겨서
 * 실행한다. 그러면 그 비용이 styleLayoutAndPrePaint가 아니라 beforeRendering으로 잡힌다.
 * 실측 예 (1,000행 테이블 렌더 중):
 *   입력 없음: beforeRendering 895ms · styleLayoutAndPrePaint 242ms
 *   입력 있음: beforeRendering 1,187ms · styleLayoutAndPrePaint 8ms  ← 같은 일인데 칸만 옮겨감
 * 그러므로 구간별 비용을 해석하려면 렌더 도중 입력이 없는 조건에서 재야 한다.
 */
export interface FrameDurationBreakdown {
  /**
   * 렌더링 단계가 시작되기 전까지 (startTime → renderStart).
   * 스크립트(React 재조정·이벤트 핸들러)가 주로 들어가지만, 위 주의사항대로
   * 브라우저가 앞당긴 스타일·레이아웃도 섞일 수 있다
   */
  beforeRendering: number
  /** 렌더링 콜백 (renderStart → styleAndLayoutStart) — requestAnimationFrame·ResizeObserver 등 */
  renderingCallbacks: number
  /**
   * 스타일 계산·레이아웃과 페인트 직전 작업 (styleAndLayoutStart → 프레임 끝).
   * 스타일·레이아웃만이 아니라 페인트 준비까지 포함하므로, 순수 레이아웃 비용보다 조금 크게 나온다
   */
  styleLayoutAndPrePaint: number
}

export interface FrameBlockingReport {
  /** 프레임 시작 시각 (performance.now() 기준) — 측정 구간에 속하는지 판단할 때 쓴다 */
  startTime: number
  /**
   * 이 프레임이 입력을 막은 시간 (ms).
   * 50ms 넘는 태스크마다 50ms를 뺀 초과분의 합이며, 렌더링 시간은 가장 긴 태스크에 더해 계산된다.
   * 특정 입력의 지연이 아니라 프레임의 위험도 지표다 — 실제 입력 지연은 interaction-timing(INP)으로 잰다
   */
  blockingDuration: number
  /** 프레임 전체 길이 (렌더링 포함) */
  frameDuration: number
  breakdown: FrameDurationBreakdown
  /** 시간을 잡아먹은 스크립트들 */
  culprits: ReadonlyArray<{
    invoker: string
    source: string
    duration: number
    /** 강제 리플로우 비용 — 0이 아니면 레이아웃 스래싱 */
    forcedLayout: number
  }>
}

/** durationThreshold는 LoAF·Event Timing 전용 옵션이라 TS 기본 lib의 PerformanceObserverInit에 아직 없다 */
type LongAnimationFrameObserverInit = PerformanceObserverInit & {
  durationThreshold: number
}

type ObserveFrameBlockingOptions = {
  /** 이 길이(ms) 이상인 프레임만 받는다. LONG_FRAME_THRESHOLD_MS가 최솟값이다 */
  durationThreshold?: number
  /**
   * 관찰 시작 전에 이미 기록된 프레임까지 받을지 여부.
   * 페이지 로드 분석처럼 "지금까지 전부"가 필요할 때만 켠다 — 특정 구간을 재는 용도에서 켜면 이전 프레임이 섞인다.
   */
  buffered?: boolean
}

/**
 * 프레임을 LoAF가 알려주는 세 구간 경계로 나눈다.
 *
 * LoAF는 일어나지 않은 단계의 시작 시각을 0으로 준다 (렌더링 없이 스크립트만 돈 프레임 등).
 * 그대로 빼면 프레임 시작 시각만큼의 음수가 나오므로, 없는 단계는 0으로 두고 시간을 앞 단계에 귀속시킨다
 */
function toDurationBreakdown(entry: LongAnimationFrameTiming): FrameDurationBreakdown {
  const frameEnd = entry.startTime + entry.duration
  const hasRendering = entry.renderStart > 0
  const hasStyleAndLayout = entry.styleAndLayoutStart > 0

  // 렌더링 단계 자체가 없었으면 프레임 전체가 "렌더링 전"이다
  if (!hasRendering) {
    return { beforeRendering: entry.duration, renderingCallbacks: 0, styleLayoutAndPrePaint: 0 }
  }

  const renderingCallbacksEnd = hasStyleAndLayout ? entry.styleAndLayoutStart : frameEnd
  return {
    beforeRendering: entry.renderStart - entry.startTime,
    renderingCallbacks: renderingCallbacksEnd - entry.renderStart,
    styleLayoutAndPrePaint: hasStyleAndLayout ? frameEnd - entry.styleAndLayoutStart : 0,
  }
}

function toFrameBlockingReport(entry: LongAnimationFrameTiming): FrameBlockingReport {
  return {
    startTime: entry.startTime,
    blockingDuration: entry.blockingDuration,
    frameDuration: entry.duration,
    breakdown: toDurationBreakdown(entry),
    culprits: entry.scripts.map((script) => ({
      invoker: script.invoker,
      source: `${script.sourceURL}:${script.sourceFunctionName}`,
      duration: script.duration,
      forcedLayout: script.forcedStyleAndLayoutDuration,
    })),
  }
}

/**
 * 프레임 단위 입력 차단을 관찰한다.
 * @returns 관찰을 중단하는 함수
 */
export function observeFrameBlocking(
  onReport: (report: FrameBlockingReport) => void,
  options: ObserveFrameBlockingOptions = {},
): () => void {
  const { durationThreshold = LONG_FRAME_THRESHOLD_MS, buffered = false } = options

  // 미지원 브라우저에서는 아무것도 하지 않는다
  if (!isFrameBlockingSupported()) {
    return () => {}
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!isLongAnimationFrame(entry)) continue
      onReport(toFrameBlockingReport(entry))
    }
  })

  const init: LongAnimationFrameObserverInit = {
    type: 'long-animation-frame',
    durationThreshold,
    buffered,
  }
  observer.observe(init)

  return () => observer.disconnect()
}
