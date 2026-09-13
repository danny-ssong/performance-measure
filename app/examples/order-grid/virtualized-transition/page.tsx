import { ExamplePageLayout } from '@/components/example-page-layout'
import { VirtualizedTransitionOrderGrid } from '../_components/virtualized-transition-order-grid'

export default function VirtualizedTransitionOrderGridPage() {
  return (
    <ExamplePageLayout width="full" backHref="/examples/order-grid" backLabel="← 목록">
      <h1 className="text-2xl font-semibold">주문 관리 (가상화 + 트랜지션)</h1>
      <VirtualizedTransitionOrderGrid />
    </ExamplePageLayout>
  )
}
