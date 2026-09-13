import {
  MANAGER_OPTIONS,
  SHIPPING_STATUS_OPTIONS,
  VENDOR_OPTIONS,
  type SelectOption,
} from '../_model/options'
import type { OrderRowResponse, OrderStringField } from '../_model/types'

type BaseColumn = {
  id: string
  header: string
  width: number
}

export type TextColumn = BaseColumn & {
  kind: 'text'
  getValue: (row: OrderRowResponse) => string
  align?: 'left' | 'right'
}

export type AutocompleteColumn = BaseColumn & {
  kind: 'autocomplete'
  field: OrderStringField
  options: readonly string[]
}

export type SelectColumn = BaseColumn & {
  kind: 'select'
  field: OrderStringField
  options: ReadonlyArray<SelectOption>
}

export type InputColumn = BaseColumn & {
  kind: 'input'
  field: OrderStringField
  placeholder?: string
}

export type OrderColumn = TextColumn | AutocompleteColumn | SelectColumn | InputColumn

const numberFormatter = new Intl.NumberFormat('ko-KR')

// 컬럼 추가/순서 변경은 이 배열만 수정하면 된다
export const ORDER_COLUMNS: readonly OrderColumn[] = [
  { kind: 'text', id: 'id', header: '주문번호', width: 120, getValue: (row) => row.id },
  { kind: 'text', id: 'orderedAt', header: '주문일자', width: 110, getValue: (row) => row.orderedAt },
  { kind: 'text', id: 'customerName', header: '고객명', width: 90, getValue: (row) => row.customerName },
  { kind: 'text', id: 'customerPhone', header: '연락처', width: 130, getValue: (row) => row.customerPhone },
  { kind: 'autocomplete', id: 'vendor', header: '거래처', width: 180, field: 'vendor', options: VENDOR_OPTIONS },
  { kind: 'autocomplete', id: 'manager', header: '담당자', width: 150, field: 'manager', options: MANAGER_OPTIONS },
  { kind: 'text', id: 'productCode', header: '상품코드', width: 110, getValue: (row) => row.productCode },
  { kind: 'text', id: 'productName', header: '상품명', width: 170, getValue: (row) => row.productName },
  { kind: 'text', id: 'category', header: '카테고리', width: 100, getValue: (row) => row.category },
  {
    kind: 'text',
    id: 'quantity',
    header: '수량',
    width: 70,
    align: 'right',
    getValue: (row) => numberFormatter.format(row.quantity),
  },
  {
    kind: 'text',
    id: 'unitPrice',
    header: '단가',
    width: 100,
    align: 'right',
    getValue: (row) => numberFormatter.format(row.unitPrice),
  },
  {
    kind: 'text',
    id: 'amount',
    header: '금액',
    width: 110,
    align: 'right',
    getValue: (row) => numberFormatter.format(row.quantity * row.unitPrice),
  },
  { kind: 'text', id: 'paymentMethod', header: '결제수단', width: 100, getValue: (row) => row.paymentMethod },
  {
    kind: 'select',
    id: 'shippingStatus',
    header: '배송상태',
    width: 140,
    field: 'shippingStatus',
    options: SHIPPING_STATUS_OPTIONS,
  },
  { kind: 'text', id: 'address', header: '배송지', width: 260, getValue: (row) => row.address },
  { kind: 'text', id: 'zipCode', header: '우편번호', width: 90, getValue: (row) => row.zipCode },
  { kind: 'text', id: 'warehouse', header: '출고창고', width: 110, getValue: (row) => row.warehouse },
  { kind: 'text', id: 'createdBy', header: '등록자', width: 90, getValue: (row) => row.createdBy },
  { kind: 'text', id: 'updatedAt', header: '수정일시', width: 150, getValue: (row) => row.updatedAt },
  { kind: 'input', id: 'memo', header: '비고', width: 220, field: 'memo', placeholder: '비고 입력' },
]

const ORDER_COLUMN_BY_ID = new Map(ORDER_COLUMNS.map((column) => [column.id, column]))

/**
 * 서버가 내려준 컬럼 id 순서를 렌더 정의로 바꾼다.
 * 클라이언트가 모르는 id는 헤더·폭·셀 렌더 방식을 알 수 없으므로 제외한다
 */
export function resolveOrderColumns(columnIds: readonly string[]): OrderColumn[] {
  return columnIds.flatMap((id) => {
    const column = ORDER_COLUMN_BY_ID.get(id)
    return column ? [column] : []
  })
}
