'use client'

import { DynamicOrderGridShell } from './dynamic-order-grid-shell'
import { DynamicVirtualizedOrderTable } from './dynamic-virtualized-order-table'

/** 서버에서 받은 컬럼 순서로, 화면에 보이는 행만 그리는 주문 그리드 (TanStack Virtual) */
export function DynamicVirtualizedOrderGrid() {
  return (
    <DynamicOrderGridShell
      measurementScope="order-grid/dynamic-columns-virtualized"
      renderTable={(columns, rows) => (
        <DynamicVirtualizedOrderTable columns={columns} rows={rows} />
      )}
    />
  )
}
