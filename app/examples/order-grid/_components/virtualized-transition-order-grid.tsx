'use client'

import { OrderGridShell } from './order-grid-shell'
import { VirtualizedOrderTable } from './virtualized-order-table'

/**
 * 가상화에 트랜지션을 더한 주문 그리드.
 *
 * 결과 렌더를 급하지 않은 작업으로 미뤄, 렌더 도중 들어온 입력을 먼저 처리하게 한다.
 * 대신 표가 다 그려지기까지는 더 걸릴 수 있으므로, 측정할 때 결과 표시 시간을 함께 본다.
 *
 * 미루기 자체는 셸이 한다 — 이유는 OrderGridShell의 resultPriority 주석 참고
 */
export function VirtualizedTransitionOrderGrid() {
  return (
    <OrderGridShell
      measurementScope="order-grid/virtualized-transition"
      resultPriority="deferred"
      renderTable={(rows) => <VirtualizedOrderTable rows={rows} />}
    />
  )
}
