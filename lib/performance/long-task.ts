/**
 * Long Tasks API 관찰.
 *
 * LoAF가 이미 프레임 길이를 주는데 태스크를 따로 재는 이유:
 * 입력이 막히는 단위는 프레임이 아니라 **태스크**다. 브라우저는 실행 중인 태스크가 끝나야 입력을 배달하므로,
 * 한 프레임이 1,000ms여도 그 안이 5ms짜리 태스크 200개로 쪼개져 있으면 입력은 5ms만 기다린다.
 * 프레임 길이만으로 INP 상한을 잡으면 작업을 잘게 쪼개는 구현(트랜지션·시간 분할)이 부당하게 나쁘게 평가된다.
 *
 * Long Tasks(Chromium 58+)는 LoAF(123+)보다 지원 범위가 넓으므로, LoAF를 쓸 수 있으면 이쪽도 쓸 수 있다.
 */

/** Long Tasks API의 관찰 하한 — 50ms 미만 태스크는 기록 자체가 만들어지지 않는다 */
export const LONG_TASK_THRESHOLD_MS = 50

export interface LongTaskReport {
  /** 태스크 시작 시각 (performance.now() 기준) — 어느 프레임·구간에 속하는지 판단할 때 쓴다 */
  startTime: number
  /** 태스크 길이 (ms). 하한 때문에 항상 50 이상이다 */
  duration: number
}

export function isLongTaskSupported(): boolean {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes('longtask')
  )
}

type ObserveLongTasksOptions = {
  /**
   * 관찰 시작 전에 이미 기록된 태스크까지 받을지 여부.
   * 특정 구간을 재는 용도에서 켜면 이전 태스크가 섞인다.
   */
  buffered?: boolean
}

/**
 * 긴 태스크(50ms 이상)를 관찰한다.
 * @returns 관찰을 중단하는 함수
 */
export function observeLongTasks(
  onReport: (report: LongTaskReport) => void,
  options: ObserveLongTasksOptions = {},
): () => void {
  const { buffered = false } = options

  if (!isLongTaskSupported()) {
    return () => {}
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType !== 'longtask') continue
      onReport({ startTime: entry.startTime, duration: entry.duration })
    }
  })

  observer.observe({ type: 'longtask', buffered })

  return () => observer.disconnect()
}
