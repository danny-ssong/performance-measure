'use client'

import { memo } from 'react'
import type { OrderRowResponse } from '../_model/types'
import { OrderTableFrame, OrderTableRow } from './order-table-frame'

type OrderTableProps = {
  rows: OrderRowResponse[]
}

// rows 참조가 바뀔 때만 리렌더되도록 memo — 조회 조건 변경 등 상위 상태 변화가 1000행 렌더로 번지지 않게 한다
export const OrderTable = memo(function OrderTable({ rows }: OrderTableProps) {
  return (
    <OrderTableFrame>
      {rows.map((row) => (
        <OrderTableRow key={row.id} row={row} />
      ))}
    </OrderTableFrame>
  )
})
