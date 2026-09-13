import type { ResponsivenessSummary } from './responsiveness-tracker'

/**
 * 반응성 측정 결과를 자동화 측정(e2e/order-grid)으로 내보내는 통로.
 *
 * 화면(DOM)이나 콘솔 대신 전역 함수 호출을 쓰는 이유:
 * 사용자에게 아무것도 노출하지 않고, 표시용 문자열을 파싱하지 않고 객체를 그대로 넘길 수 있다.
 * 함수는 Playwright가 page.exposeFunction으로 주입하며, 실사용자 브라우저에는 없으므로 아무 일도 하지 않는다.
 * 이름을 바꾸면 e2e/order-grid/order-grid-page.ts도 이 상수를 그대로 쓰므로 따로 고칠 곳은 없다
 */
export const RESPONSIVENESS_PROBE_KEY = '__onResponsivenessReport'

/** 측정 지원 여부와 조회 상태에 따라 모양이 다른 보고 */
export type ResponsivenessProbeReport =
  | { status: 'unsupported' }
  | { status: 'measuring'; summary: ResponsivenessSummary | null }
  | { status: 'idle'; summary: ResponsivenessSummary | null }

declare global {
  interface Window {
    [RESPONSIVENESS_PROBE_KEY]?: (report: ResponsivenessProbeReport) => void
  }
}

/** 수신자(자동화 측정)가 있을 때만 보고를 넘긴다. 다른 수신처가 필요해지면 여기서 늘린다 */
export function publishResponsivenessReport(report: ResponsivenessProbeReport) {
  window[RESPONSIVENESS_PROBE_KEY]?.(report)
}
