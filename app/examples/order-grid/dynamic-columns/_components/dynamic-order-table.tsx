'use client'

import { memo } from 'react'
import type { OrderColumn } from '../../_components/order-columns'
import type { OrderRowResponse } from '../../_model/types'
import { DynamicOrderTableFrame, DynamicOrderTableRow } from './dynamic-order-table-frame'

type DynamicOrderTableProps = {
  columns: readonly OrderColumn[]
  rows: OrderRowResponse[]
}

// OrderTable과 같은 이유로 memo — columns는 쿼리 결과로 참조가 고정되므로 rows가 바뀔 때만 리렌더된다
export const DynamicOrderTable = memo(function DynamicOrderTable({
  columns,
  rows,
}: DynamicOrderTableProps) {
  return (
    <DynamicOrderTableFrame columns={columns}>
      {rows.map((row) => (
        <DynamicOrderTableRow key={row.id} columns={columns} row={row} />
      ))}
    </DynamicOrderTableFrame>
  )
})
