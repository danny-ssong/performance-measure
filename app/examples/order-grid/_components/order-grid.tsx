'use client'

import { OrderGridShell } from './order-grid-shell'
import { OrderTable } from './order-table'

/** 조회된 모든 행을 한 번에 DOM에 그리는 기본 주문 그리드 */
export function OrderGrid() {
  return (
    <OrderGridShell
      measurementScope="order-grid/plain"
      renderTable={(rows) => <OrderTable rows={rows} />}
    />
  )
}
