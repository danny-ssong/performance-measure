import { useQuery } from '@tanstack/react-query'
import { resolveOrderColumns } from '../_components/order-columns'
import type { OrderColumnLayoutResponse } from '../_model/types'

export const orderColumnQueryKeys = {
  layout: ['order-grid', 'column-layout'] as const,
}

async function fetchOrderColumnLayout(): Promise<OrderColumnLayoutResponse> {
  const res = await fetch('/api/examples/order-grid/columns')
  if (!res.ok) {
    throw new Error('컬럼 정보를 불러오지 못했습니다.')
  }
  return res.json()
}

// 모듈 수준에 두어 참조를 고정한다 — 인라인 함수면 렌더마다 select가 다시 돌아 매번 새 컬럼 배열이 만들어진다
function selectOrderColumns(data: OrderColumnLayoutResponse) {
  return resolveOrderColumns(data.columnIds)
}

/**
 * 서버가 정한 순서대로 컬럼 렌더 정의를 불러온다.
 * 페이지 안에서 순서가 바뀌지 않으므로 한 번 받은 뒤 다시 요청하지 않는다.
 */
export function useOrderColumns() {
  return useQuery({
    queryKey: orderColumnQueryKeys.layout,
    queryFn: fetchOrderColumnLayout,
    staleTime: Infinity,
    select: selectOrderColumns,
  })
}
