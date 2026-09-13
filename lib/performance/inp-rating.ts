// INP 등급 기준 (web.dev Core Web Vitals): 200ms 이하 좋음, 500ms 이하 개선 필요, 그 초과 나쁨

import type { FrameDurationBreakdown } from './frame-blocking'
import { LONG_FRAME_THRESHOLD_MS } from './frame-blocking'
import { LONG_TASK_THRESHOLD_MS } from './long-task'

export const INP_GOOD_THRESHOLD_MS = 200
export const INP_POOR_THRESHOLD_MS = 500

export type InpRating = 'good' | 'needs-improvement' | 'poor'

export const INP_RATING_LABEL: Record<InpRating, string> = {
  good: '좋음',
  'needs-improvement': '개선 필요',
  poor: '나쁨',
}

export function rateInp(duration: number): InpRating {
  if (duration <= INP_GOOD_THRESHOLD_MS) return 'good'
  if (duration <= INP_POOR_THRESHOLD_MS) return 'needs-improvement'
  return 'poor'
}

/** 입력이 처리된 뒤 화면에 반영되기까지 걸리는 페인트 한 번. 60Hz 기준 한 프레임으로 잡는다 */
const PAINT_BUDGET_MS = 16

/**
 * 입력을 가장 오래 막은 태스크 하나에서 최악 INP를 추정한다.
 *
 * 브라우저는 실행 중인 태스크가 끝나야 입력을 배달하므로, 가장 운 나쁜 사용자는
 * 그 태스크가 끝날 때까지 기다리고, 이어서 자기 입력의 결과가 그려지는 페인트 한 번을 더 기다린다.
 *
 * 하한 없이 태스크를 잴 수 있을 때(CDP 트레이스) 쓰는 식이다.
 * 앱 안에서는 Long Tasks의 50ms 하한 때문에 쪼개진 태스크를 볼 수 없어, 프레임 구간에서 추정하는
 * estimateWorstCaseInp를 쓴다
 */
export function estimateWorstCaseInpFromTask(longestTaskMs: number): number {
  return longestTaskMs + PAINT_BUDGET_MS
}

/** estimateWorstCaseInp가 프레임 하나에서 읽는 값 */
export type FrameInpInput = {
  frameDuration: number
  breakdown: FrameDurationBreakdown
  /**
   * 이 프레임 안에서 가장 길었던 태스크. 긴 태스크로 잡히지 않았으면 null이며,
   * 그때는 "50ms 미만"이라는 사실만 알 수 있다
   */
  longestTaskDuration: number | null
}

export type WorstCaseInpEstimate = {
  /** 추정한 최악 INP (ms) */
  durationMs: number
  /**
   * true면 durationMs "미만"이라는 뜻이다.
   * 긴 프레임이 하나도 없어 관찰 하한(50ms)까지만 알 수 있는 경우로, **측정 실패가 아니라 충분히 빠르다는 뜻**이다.
   * 이 구분이 없으면 "가장 좋은 결과"와 "값을 못 읽음"이 똑같이 빈칸으로 보인다
   */
  isBelowFloor: boolean
}

/**
 * 긴 프레임이 하나도 없었을 때의 상한.
 * 모든 프레임이 50ms 미만이었으므로 그 안의 태스크도 50ms 미만이고, 여기에 페인트 한 번을 더한 값 미만이다
 */
export const WORST_CASE_INP_BELOW_FLOOR: WorstCaseInpEstimate = {
  durationMs: LONG_FRAME_THRESHOLD_MS + PAINT_BUDGET_MS,
  isBelowFloor: true,
}

/**
 * 프레임 하나가 입력을 최대 얼마나 막을 수 있었는지 — INP의 상한을 계산한다.
 *
 * 실측이 아니라 계산값이다. 실제 INP는 입력이 언제 도착했느냐에 따라 0부터 이 값 사이 어디든 되므로,
 * 여기서 내는 값은 "가장 운 나쁜 사용자"의 경우다.
 *
 *   가장 긴 태스크 + 그 프레임의 렌더링 비용 + 페인트 한 번
 *
 * 프레임 길이가 아니라 **태스크** 길이에서 출발하는 이유: 브라우저는 실행 중인 태스크가 끝나야 입력을
 * 배달하므로, 입력이 기다리는 시간은 "프레임이 끝날 때까지"가 아니라 "지금 태스크가 끝날 때까지"다.
 * 프레임 전체를 하나의 차단으로 보면 작업을 잘게 쪼개는 구현(트랜지션·시간 분할)이 부당하게 나쁘게 나온다.
 * 태스크가 끝난 뒤에는 핸들러가 돌고(가볍다고 전제), 그 프레임의 렌더링이 끝나야 결과가 보이므로 둘을 더한다.
 *
 * 주의: 입력 핸들러 자체가 무거우면(예: 상태를 올려둔 controlled input) 그 비용이 더해지므로
 * 이 상한을 넘을 수 있다. 핸들러가 가볍다는 전제의 값이다
 */
export function estimateWorstCaseInp(frame: FrameInpInput): number {
  const { beforeRendering, renderingCallbacks, styleLayoutAndPrePaint } = frame.breakdown

  // 긴 태스크로 잡히지 않았다면 50ms 미만이다. 다만 태스크는 렌더링 전 구간보다 길 수 없으므로 더 작은 쪽을 쓴다
  const blockingTaskDuration =
    frame.longestTaskDuration ?? Math.min(LONG_TASK_THRESHOLD_MS, beforeRendering)

  const taskBasedEstimate =
    blockingTaskDuration + renderingCallbacks + styleLayoutAndPrePaint + PAINT_BUDGET_MS

  // 프레임 길이도 언제나 유효한 상한이다 (태스크가 프레임보다 길 수는 없다). 두 상한 중 더 좁은 쪽을 취한다
  return Math.min(taskBasedEstimate, frame.frameDuration + PAINT_BUDGET_MS)
}
