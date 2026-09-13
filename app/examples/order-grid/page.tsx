import Link from 'next/link'
import { ExamplePageLayout } from '@/components/example-page-layout'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

const PAGES = [
  {
    href: '/examples/order-grid/table',
    title: '테이블 렌더',
    description: '전체 로우를 그대로 렌더링하는 기본 버전',
  },
  {
    href: '/examples/order-grid/virtualized',
    title: '가상화',
    description: '화면에 보이는 로우만 렌더링하는 가상화 버전',
  },
  {
    href: '/examples/order-grid/virtualized-transition',
    title: '가상화 + 트랜지션',
    description: '결과 렌더를 미뤄 입력을 먼저 처리하는 가상화 버전',
  },
  {
    href: '/examples/order-grid/dynamic-columns',
    title: '서버 컬럼 순서',
    description: '서버에서 받은 컬럼 순서대로 렌더링하는 버전',
  },
  {
    href: '/examples/order-grid/dynamic-columns/virtualized',
    title: '서버 컬럼 순서 + 가상화',
    description: '서버 컬럼 순서로 보이는 로우만 렌더링하는 버전',
  },
  {
    href: '/examples/order-grid/dynamic-columns/virtualized-transition',
    title: '서버 컬럼 순서 + 가상화 + 트랜지션',
    description: '서버 컬럼 순서로 결과 렌더를 미루는 가상화 버전',
  },
] as const

export default function OrderGridListPage() {
  return (
    <ExamplePageLayout width="full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">주문 관리</h1>
        <p className="text-muted-foreground">
          렌더링 방식별로 성능 차이를 비교할 수 있습니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PAGES.map((page) => (
          <Card key={page.href}>
            <CardHeader>
              <CardTitle>{page.title}</CardTitle>
              <CardDescription>{page.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href={page.href} className={buttonVariants({ size: 'sm' })}>
                열기
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ExamplePageLayout>
  )
}
