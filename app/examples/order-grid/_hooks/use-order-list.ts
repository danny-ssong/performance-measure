import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'
import type { OrderRowCount } from '../_model/options'
import type { OrderListResponse } from '../_model/types'

export const orderQueryKeys = {
  all: ['order-grid', 'orders'] as const,
  list: (size: OrderRowCount | null) => [...orderQueryKeys.all, { size }] as const,
}

async function fetchOrderList(size: OrderRowCount): Promise<OrderListResponse> {
  const res = await fetch(`/api/examples/order-grid?size=${size}`)
  if (!res.ok) {
    throw new Error('주문 목록을 불러오지 못했습니다.')
  }
  return res.json()
}

/**
 * 조회 버튼으로 확정된 건수(size)로 주문 목록을 불러온다.
 * size가 null이면 아직 조회 전이므로 요청하지 않는다.
 */
export function useOrderList(size: OrderRowCount | null) {
  return useQuery({
    queryKey: orderQueryKeys.list(size),
    queryFn: size === null ? skipToken : () => fetchOrderList(size),
    // 건수를 바꿔 재조회하는 동안 기존 테이블을 유지해 화면이 비지 않게 한다
    placeholderData: keepPreviousData,
  })
}
