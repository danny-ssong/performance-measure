'use client'

import { DynamicOrderGridShell } from './dynamic-order-grid-shell'
import { DynamicOrderTable } from './dynamic-order-table'

/** 서버에서 받은 컬럼 순서로 조회된 모든 행을 한 번에 그리는 주문 그리드 */
export function DynamicOrderGrid() {
  return (
    <DynamicOrderGridShell
      measurementScope="order-grid/dynamic-columns"
      renderTable={(columns, rows) => <DynamicOrderTable columns={columns} rows={rows} />}
    />
  )
}
