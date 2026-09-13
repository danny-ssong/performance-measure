'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import { OrderCell, type OrderCellEditHandler } from '../../_components/order-cell'
import type { OrderColumn } from '../../_components/order-columns'
import { TABLE_VIEWPORT_STYLE } from '../../_components/table-viewport'
import type { OrderRowResponse } from '../../_model/types'

// OrderTableFrame과 같은 뼈대지만, 고정 컬럼 대신 서버가 정한 컬럼 순서를 받아 그린다.
// 일반 테이블과 가상화 테이블이 이 뼈대를 공유한다.

type DynamicOrderTableFrameProps = {
  /** 서버가 정한 순서로 매핑된 컬럼 */
  columns: readonly OrderColumn[]
  /** 스크롤 컨테이너 ref — 가상화 테이블이 스크롤 위치를 읽는 데 쓴다 */
  viewportRef?: Ref<HTMLDivElement>
  children?: ReactNode
}

export function DynamicOrderTableFrame({
  columns,
  viewportRef,
  children,
}: DynamicOrderTableFrameProps) {
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)

  return (
    <div ref={viewportRef} style={TABLE_VIEWPORT_STYLE} className="overflow-auto rounded-lg border">
      {/* table-fixed + colgroup으로 폭을 고정해, 가상화로 행이 바뀌어도 컬럼 폭이 흔들리지 않는다 */}
      <table
        className="table-fixed border-separate border-spacing-0 text-sm"
        style={{ width: tableWidth }}
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {columns.map((column) => (
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

type DynamicOrderTableRowProps = Omit<ComponentProps<'tr'>, 'children'> & {
  columns: readonly OrderColumn[]
  row: OrderRowResponse
  onEdit?: OrderCellEditHandler
}

export function DynamicOrderTableRow({
  columns,
  row,
  onEdit,
  ...trProps
}: DynamicOrderTableRowProps) {
  return (
    <tr className="hover:bg-muted/40" {...trProps}>
      {columns.map((column) => (
        <td key={column.id} className="border-b px-2 py-1">
          <OrderCell column={column} row={row} onEdit={onEdit} />
        </td>
      ))}
    </tr>
  )
}
