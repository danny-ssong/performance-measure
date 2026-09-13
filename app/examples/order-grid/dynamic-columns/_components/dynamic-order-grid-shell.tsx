'use client'

import type { ReactNode } from 'react'
import { OrderGridShell, type ResultPriority } from '../../_components/order-grid-shell'
import type { OrderColumn } from '../../_components/order-columns'
import { useOrderColumns } from '../../_hooks/use-order-columns'
import type { OrderRowResponse } from '../../_model/types'

type DynamicOrderGridShellProps = {
  /** 측정 이벤트에서 어느 그리드인지 구분하는 이름 */
  measurementScope: string
  resultPriority?: ResultPriority
  /** 서버가 정한 컬럼 순서로 조회된 행을 어떤 테이블로 그릴지 */
  renderTable: (columns: readonly OrderColumn[], rows: OrderRowResponse[]) => ReactNode
}

/**
 * 서버에서 컬럼 순서를 받아온 뒤에 조회 셸을 띄운다.
 * 컬럼이 없으면 테이블 뼈대(colgroup·헤더)를 그릴 수 없으므로, 조회 UI도 그 전에는 띄우지 않는다.
 */
export function DynamicOrderGridShell({
  measurementScope,
  resultPriority,
  renderTable,
}: DynamicOrderGridShellProps) {
  const { data: columns, isPending, isError } = useOrderColumns()

  if (isPending) {
    return <p className="text-sm text-muted-foreground">컬럼 정보를 불러오는 중입니다.</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">컬럼 정보를 불러오지 못했습니다.</p>
  }

  return (
    <OrderGridShell
      measurementScope={measurementScope}
      resultPriority={resultPriority}
      renderTable={(rows) => renderTable(columns, rows)}
    />
  )
}
