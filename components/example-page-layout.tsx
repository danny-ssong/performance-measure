import Link from 'next/link'

type ExamplePageLayoutProps = {
  children: React.ReactNode
}

export function ExamplePageLayout({ children }: ExamplePageLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← 홈
      </Link>
      {children}
    </div>
  )
}
