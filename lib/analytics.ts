import type { FrameBlockingReport } from '@/lib/performance/frame-blocking'
import type { InpRating } from '@/lib/performance/inp-rating'
import type { InteractionLatency } from '@/lib/performance/responsiveness-tracker'

/** 측정 이벤트가 어느 화면·조건에서 났는지 구분하는 값 (예: { scope: 'order-grid/virtualized', rowCount: 1000 }) */
export type AnalyticsContext = Readonly<Record<string, string | number>>

/** 이벤트 이름별 페이로드 — 새 이벤트는 여기에 추가한다 */
type AnalyticsEventPayloads = {
  /** 입력을 오래 막은 프레임과 그 원인 스크립트 */
  'frame-blocked': FrameBlockingReport & { context: AnalyticsContext }
  /** 측정 구간에서 가장 느렸던 상호작용(INP 방식)과, 그 시간에 겹친 긴 프레임의 원인 스크립트 */
  'slow-interaction': InteractionLatency & {
    rating: InpRating
    culprits: FrameBlockingReport['culprits']
    context: AnalyticsContext
  }
}

export type AnalyticsEventName = keyof AnalyticsEventPayloads

/**
 * 분석 이벤트 전송 지점.
 *
 * 아직 수집 도구가 연결되지 않아 개발 환경에서만 콘솔에 남긴다.
 * 실제 도구(GA4, Amplitude, Datadog RUM, Sentry 등)를 붙일 때는 이 함수 본문만 바꾸면 되고,
 * 호출하는 쪽은 수정할 필요가 없다.
 */
export function reportToAnalytics<TName extends AnalyticsEventName>(
  name: TName,
  payload: AnalyticsEventPayloads[TName],
): void {
  if (process.env.NODE_ENV === 'development') {
    console.info(`[analytics] ${name}`, payload)
  }
}
