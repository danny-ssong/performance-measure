'use client'

import { DynamicOrderGridShell } from './dynamic-order-grid-shell'
import { DynamicVirtualizedOrderTable } from './dynamic-virtualized-order-table'

/**
 * 서버 컬럼 순서 + 가상화에 트랜지션을 더한 주문 그리드.
 *
 * 결과 렌더를 급하지 않은 작업으로 미뤄, 렌더 도중 들어온 입력을 먼저 처리하게 한다.
 * 미루기 자체는 셸이 한다 — 이유는 OrderGridShell의 resultPriority 주석 참고
 */
export function DynamicVirtualizedTransitionOrderGrid() {
  return (
    <DynamicOrderGridShell
      measurementScope="order-grid/dynamic-columns-virtualized-transition"
      resultPriority="deferred"
      renderTable={(columns, rows) => (
        <DynamicVirtualizedOrderTable columns={columns} rows={rows} />
      )}
    />
  )
}
