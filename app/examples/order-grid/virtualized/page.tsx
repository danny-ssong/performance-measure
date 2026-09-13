import Link from 'next/link'
import { ExamplePageLayout } from '@/components/example-page-layout'
import { VirtualizedOrderGrid } from '../_components/virtualized-order-grid'

export default function VirtualizedOrderGridPage() {
  return (
    <ExamplePageLayout width="full" backHref="/examples/order-grid" backLabel="← 목록">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">주문 관리 (가상화)</h1>
        <Link href="/examples/order-grid/table" className="text-sm text-muted-foreground hover:underline">
          기본 버전 보기
        </Link>
      </div>
      <VirtualizedOrderGrid />
    </ExamplePageLayout>
  )
}
