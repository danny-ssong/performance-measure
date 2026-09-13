/**
 * 화면이 실제로 그려진 뒤에 콜백을 실행한다.
 *
 * 커밋 직후(useEffect)가 아니라 페인트 뒤를 잡아야 하는 이유:
 * 렌더 비용의 상당 부분은 커밋 다음에 브라우저가 하는 스타일 계산·레이아웃·페인트다.
 * 커밋 시점을 끝으로 삼으면 그 비용이 측정 구간에서 빠진다.
 *
 * rAF를 두 번 겹치는 이유:
 * 첫 콜백은 이번 프레임이 그려지기 **전에** 돌고, 두 번째 콜백은 그 프레임이 그려진 **뒤**
 * (= 다음 프레임의 시작)에 돈다. "페인트 직후"를 알려주는 표준 API가 없어 쓰는 관용적인 방법이다.
 *
 * 그래서 실행 시각은 실제 페인트보다 한 프레임(~16ms) 늦다. 측정 구간의 끝으로 쓸 때는
 * 페인트한 프레임을 온전히 포함하게 되므로 안전한 방향의 오차다.
 *
 * @returns 예약을 취소하는 함수 (effect cleanup에서 부른다)
 */
export function runAfterNextPaint(callback: () => void): () => void {
  let innerFrame = 0
  const outerFrame = requestAnimationFrame(() => {
    innerFrame = requestAnimationFrame(callback)
  })

  return () => {
    cancelAnimationFrame(outerFrame)
    cancelAnimationFrame(innerFrame)
  }
}
