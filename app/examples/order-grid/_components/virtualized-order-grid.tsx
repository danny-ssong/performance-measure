'use client'

import { OrderGridShell } from './order-grid-shell'
import { VirtualizedOrderTable } from './virtualized-order-table'

/** 스크롤 영역에 보이는 행만 DOM에 그리는 주문 그리드 (TanStack Virtual) */
export function VirtualizedOrderGrid() {
  return (
    <OrderGridShell
      measurementScope="order-grid/virtualized"
      renderTable={(rows) => <VirtualizedOrderTable rows={rows} />}
    />
  )
}
