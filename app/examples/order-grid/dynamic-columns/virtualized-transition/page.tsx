import Link from 'next/link'
import { ExamplePageLayout } from '@/components/example-page-layout'
import { DynamicVirtualizedTransitionOrderGrid } from '../_components/dynamic-virtualized-transition-order-grid'

export default function DynamicColumnsVirtualizedTransitionPage() {
  return (
    <ExamplePageLayout width="full" backHref="/examples/order-grid" backLabel="← 목록">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">주문 관리 (서버 컬럼 순서 · 가상화 + 트랜지션)</h1>
        <Link
          href="/examples/order-grid/dynamic-columns/virtualized"
          className="text-sm text-muted-foreground hover:underline"
        >
          가상화 버전 보기
        </Link>
      </div>
      <DynamicVirtualizedTransitionOrderGrid />
    </ExamplePageLayout>
  )
}
