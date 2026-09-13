import { NextResponse } from 'next/server'
import { delay } from '@/lib/delay'
import { isOrderRowCount } from '@/app/examples/order-grid/_model/options'
import type { OrderListResponse } from '@/app/examples/order-grid/_model/types'
import { createMockOrders } from './mock-orders'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const size = Number(searchParams.get('size'))

  if (!isOrderRowCount(size)) {
    return NextResponse.json(
      { error: 'size는 200 또는 1000만 허용됩니다.' },
      { status: 400 },
    )
  }

  await delay(600)
  const body: OrderListResponse = { items: createMockOrders(size), total: size }
  return NextResponse.json(body)
}
