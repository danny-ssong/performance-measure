// 주문 그리드 API 계약 타입 (서버 ↔ 클라이언트가 주고받는 형태 그대로)

export type ShippingStatus =
  | 'pending'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'canceled'

export type OrderRowResponse = {
  id: string
  orderedAt: string
  customerName: string
  customerPhone: string
  vendor: string
  manager: string
  productCode: string
  productName: string
  category: string
  quantity: number
  unitPrice: number
  paymentMethod: string
  shippingStatus: ShippingStatus
  address: string
  zipCode: string
  warehouse: string
  createdBy: string
  updatedAt: string
  memo: string
}

export type OrderListResponse = {
  items: OrderRowResponse[]
  total: number
}

// 서버가 정한 컬럼 노출 순서. 헤더·폭·셀 렌더 방식은 클라이언트가 id로 매핑한다
export type OrderColumnLayoutResponse = {
  columnIds: string[]
}

// 값이 문자열인 필드만 추린 키 — 편집 셀과 편집값 보관소가 다룰 수 있는 필드를 제한한다
export type OrderStringField = {
  [K in keyof OrderRowResponse]: OrderRowResponse[K] extends string ? K : never
}[keyof OrderRowResponse]
