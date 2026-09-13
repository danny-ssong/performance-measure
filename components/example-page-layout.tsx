import Link from 'next/link'
import { cn } from '@/lib/utils'

const WIDTH_CLASS_NAMES = {
  default: 'max-w-2xl',
  // 가로로 긴 테이블 등 화면 폭을 모두 써야 하는 예제용
  full: 'max-w-none',
} as const

type ExamplePageLayoutProps = {
  children: React.ReactNode
  backHref?: string
  backLabel?: string
  width?: keyof typeof WIDTH_CLASS_NAMES
}

export function ExamplePageLayout({
  children,
  backHref = '/',
  backLabel = '← 홈',
  width = 'default',
}: ExamplePageLayoutProps) {
  return (
    <div className={cn('mx-auto flex w-full flex-col gap-6 px-6 py-10', WIDTH_CLASS_NAMES[width])}>
      <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
        {backLabel}
      </Link>
      {children}
    </div>
  )
}
