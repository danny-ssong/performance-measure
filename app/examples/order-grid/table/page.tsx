import Link from 'next/link'
import { ExamplePageLayout } from '@/components/example-page-layout'
import { OrderGrid } from '../_components/order-grid'

export default function OrderGridTablePage() {
  return (
    <ExamplePageLayout width="full" backHref="/examples/order-grid" backLabel="← 목록">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">주문 관리 (테이블 렌더)</h1>
        <Link
          href="/examples/order-grid/virtualized"
          className="text-sm text-muted-foreground hover:underline"
        >
          가상화 버전 보기
        </Link>
      </div>
      <OrderGrid />
    </ExamplePageLayout>
  )
}
