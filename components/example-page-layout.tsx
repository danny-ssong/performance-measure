import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

type ExamplePageLayoutProps = {
  slug: string
  title: string
  description: string
  variant: 'bad' | 'good'
  children: React.ReactNode
}

export function ExamplePageLayout({
  slug,
  title,
  description,
  variant,
  children,
}: ExamplePageLayoutProps) {
  const isBad = variant === 'bad'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← 홈으로
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <Badge variant={isBad ? 'destructive' : 'default'}>
            {isBad ? '문제 상황' : '해결됨'}
          </Badge>
        </div>
        <p className="text-muted-foreground">{description}</p>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/examples/${slug}/bad`}
            className={isBad ? 'font-semibold underline' : 'text-muted-foreground hover:underline'}
          >
            문제 상황
          </Link>
          <Link
            href={`/examples/${slug}/good`}
            className={!isBad ? 'font-semibold underline' : 'text-muted-foreground hover:underline'}
          >
            해결 방법
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}
