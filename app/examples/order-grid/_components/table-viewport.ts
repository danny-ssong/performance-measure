// 주문 테이블 스크롤 뷰포트의 높이 규칙.
// 프레임(실제 높이)과 가상화 테이블(첫 렌더 추정치)이 같은 값을 써야 하므로 한 곳에서 소유한다.

/** 뷰포트 최대 높이 = 화면 높이의 70% */
const MAX_HEIGHT_RATIO = 0.7

/** 프레임의 스크롤 컨테이너에 그대로 얹는다 — Tailwind 클래스로 두면 아래 추정치와 값이 갈라진다 */
export const TABLE_VIEWPORT_STYLE = { maxHeight: `${MAX_HEIGHT_RATIO * 100}vh` } as const

/**
 * 가상화 첫 렌더에 쓸 뷰포트 크기 추정치.
 *
 * 테이블을 마운트하는 렌더에서는 스크롤 컨테이너 ref가 아직 비어 있어 virtualizer가 높이를 0으로 본다.
 * 그러면 오버스캔만큼의 행만 그려 뷰포트 아래쪽이 한 프레임 동안 빈 여백으로 남고,
 * 다음 프레임에 실제 높이를 재면서 그 여백이 채워져 레이아웃 시프트가 된다.
 * 실제 높이와 같은 규칙으로 미리 계산해 넘겨 첫 프레임부터 화면을 채운다.
 *
 * @param contentHeight 전체 행을 다 그렸을 때의 높이 (행 수 × 행 높이 추정치)
 */
export function estimateTableViewportRect(contentHeight: number) {
  // 서버 렌더에는 화면 높이가 없다. 이 테이블은 조회 응답 후 클라이언트에서만 마운트되므로 실제로 타지 않는 경로다
  const maxHeight =
    typeof window === 'undefined' ? contentHeight : window.innerHeight * MAX_HEIGHT_RATIO

  // 가로 가상화는 하지 않으므로 width는 쓰이지 않는다
  return { width: 0, height: Math.min(contentHeight, maxHeight) }
}
