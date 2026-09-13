import {
  MANAGER_OPTIONS,
  SHIPPING_STATUS_OPTIONS,
  VENDOR_OPTIONS,
} from '@/app/examples/order-grid/_model/options'
import type { OrderRowResponse } from '@/app/examples/order-grid/_model/types'

const CUSTOMER_NAMES = ['김하늘', '이바다', '박산들', '최보라', '정가람', '강나래', '조은별', '윤다솜', '장한결', '임새롬']
const PRODUCTS = [
  { code: 'EL-1001', name: '무선 이어폰', category: '전자기기', unitPrice: 89000 },
  { code: 'EL-1002', name: '블루투스 스피커', category: '전자기기', unitPrice: 59000 },
  { code: 'LV-2001', name: '메모리폼 베개', category: '생활용품', unitPrice: 32000 },
  { code: 'LV-2002', name: '극세사 이불', category: '생활용품', unitPrice: 74000 },
  { code: 'FD-3001', name: '유기농 현미 10kg', category: '식품', unitPrice: 42000 },
  { code: 'FD-3002', name: '제주 감귤 5kg', category: '식품', unitPrice: 27000 },
  { code: 'FS-4001', name: '린넨 셔츠', category: '패션', unitPrice: 39000 },
  { code: 'FS-4002', name: '캔버스 스니커즈', category: '패션', unitPrice: 65000 },
  { code: 'OF-5001', name: '모니터 받침대', category: '사무용품', unitPrice: 25000 },
  { code: 'OF-5002', name: '인체공학 의자', category: '사무용품', unitPrice: 289000 },
] as const
const PAYMENT_METHODS = ['신용카드', '계좌이체', '간편결제', '무통장입금', '휴대폰결제']
const ADDRESSES = [
  { address: '서울특별시 강남구 테헤란로 152', zipCode: '06236' },
  { address: '서울특별시 마포구 월드컵북로 396', zipCode: '03925' },
  { address: '경기도 성남시 분당구 판교역로 235', zipCode: '13494' },
  { address: '부산광역시 해운대구 센텀중앙로 97', zipCode: '48058' },
  { address: '대구광역시 수성구 동대구로 330', zipCode: '42020' },
  { address: '인천광역시 연수구 컨벤시아대로 165', zipCode: '21998' },
  { address: '광주광역시 서구 상무중앙로 110', zipCode: '61949' },
  { address: '대전광역시 유성구 대학로 99', zipCode: '34134' },
]
const WAREHOUSES = ['이천 1센터', '용인 2센터', '평택 3센터', '칠곡 센터', '김해 센터']
const MEMOS = ['', '', '', '문 앞에 놓아주세요', '부재 시 경비실', '배송 전 연락 바랍니다', '선물 포장 요청']

const BASE_DATE = new Date('2026-09-10T09:00:00+09:00')
const DAY_MS = 24 * 60 * 60 * 1000

// 인덱스 기반으로 항목을 고르므로 같은 요청에는 항상 같은 데이터가 내려간다
function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length]
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatDateTime(date: Date) {
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

function padNumber(value: number, length: number) {
  return String(value).padStart(length, '0')
}

function createMockOrder(index: number): OrderRowResponse {
  const product = pick(PRODUCTS, index * 7)
  const destination = pick(ADDRESSES, index * 3)
  const orderedAt = new Date(BASE_DATE.getTime() - (index % 90) * DAY_MS)
  const updatedAt = new Date(orderedAt.getTime() + ((index * 37) % 48) * 60 * 60 * 1000)

  return {
    id: `ORD-${padNumber(index + 1, 6)}`,
    orderedAt: formatDate(orderedAt),
    customerName: pick(CUSTOMER_NAMES, index),
    customerPhone: `010-${padNumber(1000 + ((index * 37) % 9000), 4)}-${padNumber(1000 + ((index * 91) % 9000), 4)}`,
    vendor: pick(VENDOR_OPTIONS, index * 11),
    manager: pick(MANAGER_OPTIONS, index * 5),
    productCode: product.code,
    productName: product.name,
    category: product.category,
    quantity: 1 + ((index * 13) % 20),
    unitPrice: product.unitPrice,
    paymentMethod: pick(PAYMENT_METHODS, index * 2),
    shippingStatus: pick(SHIPPING_STATUS_OPTIONS, index).value,
    address: destination.address,
    zipCode: destination.zipCode,
    warehouse: pick(WAREHOUSES, index * 3),
    createdBy: pick(MANAGER_OPTIONS, index * 3),
    updatedAt: formatDateTime(updatedAt),
    memo: pick(MEMOS, index),
  }
}

export function createMockOrders(count: number): OrderRowResponse[] {
  return Array.from({ length: count }, (_, index) => createMockOrder(index))
}
