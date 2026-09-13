import type { ShippingStatus } from './types'

// 서버(목 데이터 생성)와 클라이언트(편집 셀 옵션)가 공유하는 선택지 목록

export const ORDER_ROW_COUNT_OPTIONS = [200, 1000] as const

export type OrderRowCount = (typeof ORDER_ROW_COUNT_OPTIONS)[number]

export function isOrderRowCount(value: unknown): value is OrderRowCount {
  return ORDER_ROW_COUNT_OPTIONS.some((option) => option === value)
}

export const VENDOR_OPTIONS = [
  '한빛상사',
  '대성물산',
  '미래유통',
  '청솔무역',
  '가온산업',
  '누리테크',
  '다온푸드',
  '라온리빙',
  '마루전자',
  '바른제약',
  '새봄패션',
  '아라케미칼',
  '온누리마트',
  '제일기계',
  '참좋은식품',
  '큰길물류',
  '태양에너지',
  '푸른농산',
  '하늘항공',
  '동방무역',
  '서진산업',
  '남도수산',
  '북악유통',
  '은하전자',
  '금강건설',
  '한결가구',
  '보람문구',
  '초록생활',
  '해오름상사',
  '별빛코스메틱',
] as const

export const MANAGER_OPTIONS = [
  '김민준',
  '이서연',
  '박도윤',
  '최지우',
  '정하준',
  '강서윤',
  '조시우',
  '윤하은',
  '장주원',
  '임지민',
  '한예준',
  '오수아',
  '서지호',
  '신채원',
  '권유준',
  '황다은',
  '안건우',
  '송아린',
  '전우진',
  '홍소율',
] as const

export type SelectOption<TValue extends string = string> = {
  value: TValue
  label: string
}

export const SHIPPING_STATUS_OPTIONS: ReadonlyArray<SelectOption<ShippingStatus>> = [
  { value: 'pending', label: '결제대기' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'canceled', label: '주문취소' },
]
