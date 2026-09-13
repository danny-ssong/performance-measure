'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useRef, useState, type ComponentProps } from 'react'
import type { OrderColumn } from '../../_components/order-columns'
import { estimateTableViewportRect } from '../../_components/table-viewport'
import { createOrderEditStore, type OrderEditStore } from '../../_model/order-edit-store'
import type { OrderRowResponse } from '../../_model/types'
import { DynamicOrderTableFrame, DynamicOrderTableRow } from './dynamic-order-table-frame'

// 편집 셀 높이(h-7 = 28px) + 셀 상하 패딩(8px) + 하단 보더(1px).
// 실제 높이는 measureElement로 다시 재므로 초기 스크롤 높이 계산용 추정치다.
const ESTIMATED_ROW_HEIGHT = 37
// 빠르게 스크롤할 때 빈 영역이 비치지 않도록 화면 위아래로 미리 그려둘 행 수
const OVERSCAN_ROW_COUNT = 10

type DynamicVirtualizedOrderTableProps = {
  columns: readonly OrderColumn[]
  rows: OrderRowResponse[]
}

// VirtualizedOrderTable의 서버 컬럼 순서 버전 — 차이는 컬럼을 prop으로 받는다는 점뿐이다
export const DynamicVirtualizedOrderTable = memo(function DynamicVirtualizedOrderTable({
  columns,
  rows,
}: DynamicVirtualizedOrderTableProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  // 화면 밖으로 나가 언마운트된 행의 입력값을 잃지 않도록 보관 (자세한 이유는 createOrderEditStore 참고)
  const [editStore] = useState(createOrderEditStore)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN_ROW_COUNT,
    // 첫 렌더에는 스크롤 컨테이너가 아직 없어 높이를 0으로 보므로, 미리 계산한 크기를 넘긴다 (자세한 이유는 함수 주석 참고)
    initialRect: estimateTableViewportRect(rows.length * ESTIMATED_ROW_HEIGHT),
    // 인덱스 대신 주문번호를 키로 써서, 재조회로 순서가 바뀌어도 측정한 행 높이가 엉뚱한 행에 붙지 않게 한다
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const firstVirtualRow = virtualRows.at(0)
  const lastVirtualRow = virtualRows.at(-1)

  // 행을 absolute로 띄우면 table 레이아웃(colgroup 폭, sticky 헤더)이 깨지므로,
  // 그려지지 않은 위/아래 구간을 빈 여백 행으로 채워 전체 스크롤 높이를 유지한다
  const paddingTop = firstVirtualRow?.start ?? 0
  const paddingBottom = lastVirtualRow ? virtualizer.getTotalSize() - lastVirtualRow.end : 0

  return (
    <DynamicOrderTableFrame columns={columns} viewportRef={viewportRef}>
      {paddingTop > 0 && <SpacerRow height={paddingTop} columnCount={columns.length} />}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index]
        if (!row) return null

        return (
          <DynamicVirtualizedOrderRow
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            columns={columns}
            row={row}
            editStore={editStore}
          />
        )
      })}
      {paddingBottom > 0 && <SpacerRow height={paddingBottom} columnCount={columns.length} />}
    </DynamicOrderTableFrame>
  )
})

type DynamicVirtualizedOrderRowProps = Omit<
  ComponentProps<typeof DynamicOrderTableRow>,
  'onEdit'
> & {
  editStore: OrderEditStore
}

function DynamicVirtualizedOrderRow({
  row,
  editStore,
  ...rowProps
}: DynamicVirtualizedOrderRowProps) {
  // 편집값은 행이 마운트되는 순간의 것만 반영한다.
  // 마운트 이후의 입력까지 반영하면 비제어 셀의 defaultValue가 바뀌어 Base UI가 경고를 낸다.
  const [editsAtMount] = useState(() => editStore.getEdits(row.id))

  return (
    <DynamicOrderTableRow
      {...rowProps}
      row={editsAtMount ? { ...row, ...editsAtMount } : row}
      onEdit={(field, value) => editStore.recordEdit(row.id, field, value)}
    />
  )
}

function SpacerRow({ height, columnCount }: { height: number; columnCount: number }) {
  return (
    <tr aria-hidden>
      <td colSpan={columnCount} style={{ height, padding: 0 }} />
    </tr>
  )
}
