import { ExamplePageLayout } from '@/components/example-page-layout'
import { DynamicOrderGrid } from './_components/dynamic-order-grid'

export default function OrderGridDynamicColumnsPage() {
  return (
    <ExamplePageLayout width="full" backHref="/examples/order-grid" backLabel="← 목록">
      <h1 className="text-2xl font-semibold">주문 관리 (서버 컬럼 순서)</h1>
      <DynamicOrderGrid />
    </ExamplePageLayout>
  )
}
