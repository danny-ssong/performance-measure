import { NextResponse } from 'next/server'
import { delay } from '@/lib/delay'
import type { OrderColumnLayoutResponse } from '@/app/examples/order-grid/_model/types'

// 서버가 정한 컬럼 노출 순서
const ORDER_COLUMN_IDS = [
  'id',
  'orderedAt',
  'customerName',
  'customerPhone',
  'vendor',
  'manager',
  'productCode',
  'productName',
  'category',
  'quantity',
  'unitPrice',
  'amount',
  'paymentMethod',
  'shippingStatus',
  'address',
  'zipCode',
  'warehouse',
  'createdBy',
  'updatedAt',
  'memo',
]

export async function GET() {
  await delay(300)
  const body: OrderColumnLayoutResponse = { columnIds: ORDER_COLUMN_IDS }
  return NextResponse.json(body)
}
