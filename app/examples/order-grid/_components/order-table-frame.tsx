'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import type { OrderRowResponse } from '../_model/types'
import { OrderCell, type OrderCellEditHandler } from './order-cell'
import { ORDER_COLUMNS } from './order-columns'
import { TABLE_VIEWPORT_STYLE } from './table-viewport'

// 일반 테이블과 가상화 테이블이 공유하는 뼈대. 둘의 차이는 tbody를 어떻게 채우느냐뿐이다.

const TABLE_WIDTH = ORDER_COLUMNS.reduce((sum, column) => sum + column.width, 0)

type OrderTableFrameProps = {
  /** 스크롤 컨테이너 ref — 가상화 테이블이 스크롤 위치를 읽는 데 쓴다 */
  viewportRef?: Ref<HTMLDivElement>
  children: ReactNode
}

export function OrderTableFrame({ viewportRef, children }: OrderTableFrameProps) {
  return (
    <div ref={viewportRef} style={TABLE_VIEWPORT_STYLE} className="overflow-auto rounded-lg border">
      {/* table-fixed + colgroup으로 폭을 고정해, 가상화로 행이 바뀌어도 컬럼 폭이 흔들리지 않는다 */}
      <table
        className="table-fixed border-separate border-spacing-0 text-sm"
        style={{ width: TABLE_WIDTH }}
      >
        <colgroup>
          {ORDER_COLUMNS.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {ORDER_COLUMNS.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="border-b px-2 py-2 text-left font-medium whitespace-nowrap text-muted-foreground"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

type OrderTableRowProps = Omit<ComponentProps<'tr'>, 'children'> & {
  row: OrderRowResponse
  onEdit?: OrderCellEditHandler
}

export function OrderTableRow({ row, onEdit, ...trProps }: OrderTableRowProps) {
  return (
    <tr className="hover:bg-muted/40" {...trProps}>
      {ORDER_COLUMNS.map((column) => (
        <td key={column.id} className="border-b px-2 py-1">
          <OrderCell column={column} row={row} onEdit={onEdit} />
        </td>
      ))}
    </tr>
  )
}
