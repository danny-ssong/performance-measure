# React Query 예제 갤러리 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Query(TanStack Query) 사용 시 흔히 겪는 9가지 문제 상황(bad)과 해결 방법(good)을 각각 독립된 페이지로 구현해서, 영상으로 녹화 가능한 데모 갤러리 앱을 만든다.

**Architecture:** Next.js 16 App Router + Route Handler 기반 in-memory mock API. 전역 `Providers`(QueryClientProvider + sonner Toaster + Devtools)를 루트 레이아웃에 씌우고, 홈페이지는 9개 예제로 가는 카드 그리드, 각 예제는 `app/examples/<slug>/bad/page.tsx`, `app/examples/<slug>/good/page.tsx`로 완전히 분리된 파일로 구현한다(한 파일만 열어도 전체 동작이 보이도록 의도적 코드 중복 허용). `global-invalidate` 예제만 예외적으로 페이지 내부에 격리된 로컬 `QueryClient`를 새로 만든다.

**Tech Stack:** Next.js 16.2.12, React 19, TypeScript, Tailwind v4, shadcn/ui, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `react-hook-form`, `sonner`(shadcn 경유 설치).

## Global Constraints

- 모든 화면 텍스트, 커밋 메시지는 한국어로 작성한다 (`~/.claude/CLAUDE.md`).
- Next.js 16에서 동적 `params`는 항상 `Promise`이며 반드시 `await`(서버) 또는 `use()`(클라이언트 컴포넌트)로 unwrap해야 한다 — 동기 접근 불가.
- 자동화 테스트는 작성하지 않는다. 각 태스크의 검증은 `npm run build`로 타입 체크 + `npm run dev`로 브라우저에서 직접 시나리오 재현.
- `bad`/`good` 페이지는 하나의 전역 `QueryClient`(루트 `Providers`)를 공유하므로, 캐시 오염을 막기 위해 모든 `queryKey`의 두 번째 요소에 `'bad'` 또는 `'good'`을 리터럴로 박아넣는다(예: `['refetch-window-focus', 'bad', 'settings']`). `global-invalidate` 예제만 페이지별 로컬 `QueryClient`를 쓰므로 이 규칙에서 예외.
- 각 예제의 mock API는 모듈 스코프 변수로 상태를 유지하는 in-memory 저장소이며, 서버(dev server) 재시작 시 초기화된다. 여러 route.ts 파일이 상태를 공유해야 하면 같은 폴더에 `store.ts`(HTTP 메서드가 아닌 일반 모듈)를 두고 각 `route.ts`에서 import한다 — Next.js는 `route.ts`에서 HTTP 메서드 핸들러 외의 값을 export하는 것을 허용하지 않는다.
- shadcn 컴포넌트는 `components/ui/`에 CLI로 생성된 그대로 두고 수정하지 않는다.
- 이 프로젝트의 shadcn `init -d` 프리셋은 Radix 대신 `@base-ui/react`를 사용한다. 따라서 `Button`/`DialogTrigger` 등을 다른 엘리먼트로 합성할 때는 Radix의 `asChild` + children 패턴이 아니라 Base UI의 `render` prop을 쓴다 — 예: `<Button render={<Link href="/foo" />}>텍스트</Button>` (바깥 컴포넌트의 children이 최종 엘리먼트의 내용이 되고, `render`에 넘긴 엘리먼트가 태그/속성을 제공한다). `asChild`로 작성하면 컴파일도 되고 동작도 하는 것처럼 보이지만 실제로는 두 엘리먼트가 중첩(예: `<button><a>...</a></button>`)되는 것이므로 절대 쓰지 않는다.

---

### Task 1: 의존성 설치 및 shadcn/ui 초기화

**Files:**
- Modify: `package.json` (의존성 추가)
- Create: `components.json`, `lib/utils.ts` (shadcn CLI 자동 생성)
- Create: `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `switch.tsx`, `skeleton.tsx`, `badge.tsx`, `sonner.tsx`, `dialog.tsx` (shadcn CLI 자동 생성)

**Interfaces:**
- Produces: 이후 모든 태스크에서 사용할 `@/components/ui/*` 컴포넌트, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `react-hook-form`, `sonner` 패키지.

- [ ] **Step 1: React Query 관련 패키지 설치**

Run: `npm install @tanstack/react-query @tanstack/react-query-devtools react-hook-form`

- [ ] **Step 2: shadcn/ui 초기화 (기본 설정, 프롬프트 없이)**

Run: `npx shadcn@latest init -d`

Expected: `components.json`, `lib/utils.ts` 생성, `app/globals.css`에 CSS 변수 추가됨.

- [ ] **Step 3: 사용할 shadcn 컴포넌트 설치**

Run: `npx shadcn@latest add button card input label textarea switch skeleton badge sonner dialog -y`

Expected: `components/ui/` 아래에 10개 컴포넌트 파일 생성, `sonner`/`next-themes`/`@radix-ui/*` 등 필요한 패키지가 `package.json`에 자동 추가됨.

- [ ] **Step 4: 타입 체크로 설치 검증**

Run: `npm run build`

Expected: 기존 `app/page.tsx`, `app/layout.tsx`가 아직 그대로라 에러 없이 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components.json lib/utils.ts components/ui app/globals.css
git commit -m "chore: React Query와 shadcn/ui 의존성 설치"
```

---

### Task 2: 공통 유틸(delay) + Providers + 루트 레이아웃 연결

**Files:**
- Create: `lib/delay.ts`
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `components/ui/sonner.tsx`의 `Toaster` (Task 1)
- Produces: `delay(ms: number): Promise<void>` (모든 route handler 태스크에서 사용), `Providers` 컴포넌트(모든 페이지에서 `useQuery`/`useMutation`/`toast`를 쓸 수 있게 함)

- [ ] **Step 1: `lib/delay.ts` 작성**

```ts
export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
```

- [ ] **Step 2: `app/providers.tsx` 작성**

```tsx
'use client'

import { useState } from 'react'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (_error, query) => {
            if (query.state.data !== undefined) {
              toast.error('데이터 최신화에 실패했습니다.')
            }
          },
        }),
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: `app/layout.tsx`에 `Providers` 연결**

`app/layout.tsx`의 `<body className="min-h-full flex flex-col">{children}</body>`를 아래로 교체:

```tsx
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
```

파일 상단 import에 추가:

```tsx
import { Providers } from "./providers";
```

- [ ] **Step 4: 빌드로 검증**

Run: `npm run build`

Expected: 에러 없이 빌드 성공 (아직 `app/page.tsx`는 기본 템플릿이라 참조 오류 없음).

- [ ] **Step 5: Commit**

```bash
git add lib/delay.ts app/providers.tsx app/layout.tsx
git commit -m "feat: React Query Providers와 공통 delay 유틸 추가"
```

---

### Task 3: 공통 예제 페이지 레이아웃 컴포넌트

**Files:**
- Create: `components/example-page-layout.tsx`

**Interfaces:**
- Consumes: `components/ui/badge.tsx` (Task 1)
- Produces: `ExamplePageLayout({ slug, title, description, variant, children })` — 이후 모든 예제 페이지(Task 5~13)에서 사용.

- [ ] **Step 1: `components/example-page-layout.tsx` 작성**

```tsx
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
```

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`

Expected: 에러 없이 빌드 성공 (아직 사용하는 페이지가 없어도 컴파일은 통과함).

- [ ] **Step 3: Commit**

```bash
git add components/example-page-layout.tsx
git commit -m "feat: 예제 페이지 공통 레이아웃 컴포넌트 추가"
```

---

### Task 4: 홈페이지 갤러리

**Files:**
- Modify: `app/page.tsx` (기존 `create-next-app` 기본 템플릿 전체 교체)

**Interfaces:**
- Consumes: `components/ui/card.tsx`, `components/ui/button.tsx` (Task 1)
- Produces: 없음 (최상위 진입점)

- [ ] **Step 1: `app/page.tsx` 전체 교체**

```tsx
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  {
    slug: "refetch-window-focus",
    title: "탭 포커스 refetch와 RHF 폼 덮어씌움",
    description:
      "refetchOnWindowFocus 기본값 때문에 입력 중이던 폼이 서버 값으로 덮어써지는 문제",
  },
  {
    slug: "refetch-on-mount",
    title: "refetchOnMount와 invalidateQueries",
    description:
      "비활성 쿼리를 invalidate해도 refetchType 설정에 따라 갱신 여부가 달라지는 문제",
  },
  {
    slug: "is-pending-vs-loading",
    title: "isPending vs isLoading",
    description: "enabled 옵션과 함께 쓸 때 안전하게 data에 접근하는 방법",
  },
  {
    slug: "data-availability-first",
    title: "data-availability-first 패턴",
    description:
      "백그라운드 refetch 실패 시 캐시된 데이터를 유지하고 토스트로만 알리는 패턴",
  },
  {
    slug: "keep-previous-data",
    title: "keepPreviousData",
    description: "페이지네이션 시 로딩 화면 깜빡임을 없애는 방법",
  },
  {
    slug: "mutate-vs-mutate-async",
    title: "mutate vs mutateAsync",
    description: "RHF 제출 버튼의 disabled 상태가 응답 전에 풀려버리는 문제",
  },
  {
    slug: "invalidate-queries-await",
    title: "invalidateQueries await",
    description: "onSuccess에서 invalidateQueries를 반환하지 않아 생기는 타이밍 문제",
  },
  {
    slug: "callback-placement",
    title: "뮤테이션 콜백 위치",
    description: "언마운트 이후에도 실행되는 콜백과 실행되지 않는 콜백의 차이",
  },
  {
    slug: "global-invalidate",
    title: "전역 invalidate",
    description: "MutationCache로 모든 쿼리를 자동 invalidate하는 패턴",
  },
] as const;

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">React Query 예제 갤러리</h1>
        <p className="text-muted-foreground">
          각 카드에서 문제 상황과 해결 방법을 비교해서 확인할 수 있습니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((example) => (
          <Card key={example.slug}>
            <CardHeader>
              <CardTitle>{example.title}</CardTitle>
              <CardDescription>{example.description}</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Button
                render={<Link href={`/examples/${example.slug}/bad`} />}
                variant="destructive"
                size="sm"
              >
                문제 상황 보기
              </Button>
              <Button
                render={<Link href={`/examples/${example.slug}/good`} />}
                size="sm"
              >
                해결 방법 보기
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 기존 기본 템플릿 이미지/에셋 참조 제거 확인**

`app/page.tsx`에 더 이상 `next/image`, `/next.svg`, `/vercel.svg`를 참조하지 않는지 확인한다(위 코드에는 없음). `public/*.svg` 파일 자체는 삭제하지 않아도 무방하다.

- [ ] **Step 3: 개발 서버로 확인**

Run: `npm run dev` 후 `http://localhost:3000` 접속

Expected: 9개 카드가 그리드로 보이고, 각 카드의 두 버튼이 `/examples/<slug>/bad`, `/examples/<slug>/good`로 링크됨 (이 시점엔 해당 페이지가 없어 404가 뜨는 것이 정상 — Task 5부터 순서대로 만든다).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: 예제 갤러리 홈페이지 추가"
```

---

### Task 5: 예제 1 — refetch-window-focus

**Files:**
- Create: `app/api/examples/refetch-window-focus/route.ts`
- Create: `app/examples/refetch-window-focus/bad/page.tsx`
- Create: `app/examples/refetch-window-focus/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Input`/`Label`/`Textarea`/`Button` (Task 1)
- Produces: 없음 (독립 예제)

- [ ] **Step 1: mock API 작성**

`app/api/examples/refetch-window-focus/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

let settings = {
  companyName: "가비아",
  memo: "초기 메모입니다.",
};

export async function GET() {
  await delay(300);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  settings = { ...settings, ...body };
  await delay(300);
  return NextResponse.json(settings);
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/refetch-window-focus/bad/page.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  companyName: string;
  memo: string;
};

function SimulateExternalChangeButton() {
  const handleClick = async () => {
    await fetch("/api/examples/refetch-window-focus", {
      method: "PATCH",
      body: JSON.stringify({
        memo: `관리자가 ${new Date().toLocaleTimeString()}에 변경함`,
      }),
    });
  };

  return (
    <Button type="button" variant="secondary" onClick={handleClick}>
      🧑‍💻 다른 사람이 서버 데이터를 변경했습니다
    </Button>
  );
}

export default function RefetchWindowFocusBadPage() {
  const { data } = useQuery<Settings>({
    queryKey: ["refetch-window-focus", "bad", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-window-focus");
      return res.json();
    },
  });

  const form = useForm<Settings>({ values: data });

  return (
    <ExamplePageLayout
      slug="refetch-window-focus"
      variant="bad"
      title="탭 포커스 refetch와 RHF 폼 덮어씌움"
      description="폼을 입력하는 도중 탭을 전환했다가 돌아오면 refetchOnWindowFocus 기본값(true) 때문에 입력 중이던 값이 서버 값으로 덮어써집니다."
    >
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">회사명</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea id="memo" rows={6} {...form.register("memo")} />
        </div>
      </form>
      <div className="flex flex-col gap-3 rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          메모 입력 필드에 텍스트를 입력한 뒤, 아래 버튼을 누르고 다른 브라우저 탭으로
          이동했다가 돌아와보세요. 입력 중이던 내용이 서버 값으로 사라집니다.
        </p>
        <SimulateExternalChangeButton />
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/refetch-window-focus/good/page.tsx` — bad와 동일하되 `useQuery`에 `refetchOnWindowFocus: false`를 추가하고 variant/설명/queryKey만 변경:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  companyName: string;
  memo: string;
};

function SimulateExternalChangeButton() {
  const handleClick = async () => {
    await fetch("/api/examples/refetch-window-focus", {
      method: "PATCH",
      body: JSON.stringify({
        memo: `관리자가 ${new Date().toLocaleTimeString()}에 변경함`,
      }),
    });
  };

  return (
    <Button type="button" variant="secondary" onClick={handleClick}>
      🧑‍💻 다른 사람이 서버 데이터를 변경했습니다
    </Button>
  );
}

export default function RefetchWindowFocusGoodPage() {
  const { data } = useQuery<Settings>({
    queryKey: ["refetch-window-focus", "good", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-window-focus");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const form = useForm<Settings>({ values: data });

  return (
    <ExamplePageLayout
      slug="refetch-window-focus"
      variant="good"
      title="탭 포커스 refetch와 RHF 폼 덮어씌움"
      description="refetchOnWindowFocus: false로 설정하면 탭을 전환했다가 돌아와도 입력 중이던 값이 유지됩니다."
    >
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">회사명</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea id="memo" rows={6} {...form.register("memo")} />
        </div>
      </form>
      <div className="flex flex-col gap-3 rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          메모 입력 필드에 텍스트를 입력한 뒤, 아래 버튼을 누르고 다른 브라우저 탭으로
          이동했다가 돌아와보세요. 이번에는 입력 중이던 내용이 그대로 유지됩니다.
        </p>
        <SimulateExternalChangeButton />
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/refetch-window-focus/bad` 접속, 메모 필드에 아무 텍스트 입력
2. "다른 사람이 서버 데이터를 변경했습니다" 버튼 클릭
3. 다른 브라우저 탭으로 이동했다가 이 탭으로 돌아옴
4. Expected: 메모 필드가 입력했던 텍스트가 아닌 서버가 변경한 값으로 바뀜
5. `/examples/refetch-window-focus/good`에서 동일하게 재현
6. Expected: 탭 전환 후에도 입력했던 텍스트가 그대로 유지됨

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/refetch-window-focus app/examples/refetch-window-focus
git commit -m "feat: refetch-window-focus 예제 추가"
```

---

### Task 6: 예제 2 — refetch-on-mount

**Files:**
- Create: `app/api/examples/refetch-on-mount/store.ts`
- Create: `app/api/examples/refetch-on-mount/route.ts`
- Create: `app/api/examples/refetch-on-mount/[id]/route.ts`
- Create: `app/examples/refetch-on-mount/bad/page.tsx`
- Create: `app/examples/refetch-on-mount/bad/[id]/page.tsx`
- Create: `app/examples/refetch-on-mount/good/page.tsx`
- Create: `app/examples/refetch-on-mount/good/[id]/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Card`/`Input`/`Label`/`Button` (Task 1)
- Produces: 없음

- [ ] **Step 1: 공유 in-memory 스토어 작성**

`app/api/examples/refetch-on-mount/store.ts`:

```ts
export type RefetchOnMountTodo = { id: number; title: string };

export const todos: RefetchOnMountTodo[] = [
  { id: 1, title: "장보기" },
  { id: 2, title: "운동하기" },
  { id: 3, title: "독서하기" },
];
```

- [ ] **Step 2: 목록 route handler 작성**

`app/api/examples/refetch-on-mount/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { todos } from "./store";

export async function GET() {
  await delay(400);
  return NextResponse.json(todos);
}
```

- [ ] **Step 3: 상세 route handler 작성**

`app/api/examples/refetch-on-mount/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { todos } from "../store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  await delay(400);
  const todo = todos.find((t) => t.id === Number(id));
  return NextResponse.json(todo);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  await delay(400);
  const todo = todos.find((t) => t.id === Number(id));
  if (todo) {
    todo.title = body.title;
  }
  return NextResponse.json(todo);
}
```

- [ ] **Step 4: bad 목록 페이지 작성**

`app/examples/refetch-on-mount/bad/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Card, CardContent } from "@/components/ui/card";

type Todo = { id: number; title: string };

export default function RefetchOnMountBadPage() {
  const { data, isPending } = useQuery<Todo[]>({
    queryKey: ["refetch-on-mount", "bad", "list"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-on-mount");
      return res.json();
    },
    refetchOnMount: false,
  });

  return (
    <ExamplePageLayout
      slug="refetch-on-mount"
      variant="bad"
      title="refetchOnMount와 invalidateQueries"
      description="항목을 클릭해서 제목을 수정하고 목록으로 돌아와도 refetchOnMount:false 때문에 예전 제목이 그대로 보입니다."
    >
      {isPending ? (
        <p>불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.map((todo) => (
            <Link key={todo.id} href={`/examples/refetch-on-mount/bad/${todo.id}`}>
              <Card>
                <CardContent className="py-4">{todo.title}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 5: bad 상세 페이지 작성**

`app/examples/refetch-on-mount/bad/[id]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Todo = { id: number; title: string };

export default function RefetchOnMountBadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Todo>({
    queryKey: ["refetch-on-mount", "bad", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`);
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["refetch-on-mount", "bad", "list"],
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    mutate(title, {
      onSuccess: () => router.push("/examples/refetch-on-mount/bad"),
    });
  };

  if (!data) return <p>불러오는 중...</p>;

  return (
    <ExamplePageLayout
      slug="refetch-on-mount"
      variant="bad"
      title="refetchOnMount와 invalidateQueries"
      description="저장 후 목록으로 돌아가면, 목록 쿼리는 invalidate만 되고(refetchType 기본값) 비활성 상태라 실제로 갱신되지 않습니다."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" defaultValue={data.title} />
        </div>
        <Button type="submit" disabled={isPending}>
          저장하고 목록으로
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 6: good 목록 페이지 작성**

`app/examples/refetch-on-mount/good/page.tsx` — bad 목록 페이지와 동일하되 `queryKey`를 `["refetch-on-mount", "good", "list"]`로, 링크를 `/examples/refetch-on-mount/good/${todo.id}`로, `variant="good"`으로, 컴포넌트명을 `RefetchOnMountGoodPage`로 변경:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Card, CardContent } from "@/components/ui/card";

type Todo = { id: number; title: string };

export default function RefetchOnMountGoodPage() {
  const { data, isPending } = useQuery<Todo[]>({
    queryKey: ["refetch-on-mount", "good", "list"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-on-mount");
      return res.json();
    },
    refetchOnMount: false,
  });

  return (
    <ExamplePageLayout
      slug="refetch-on-mount"
      variant="good"
      title="refetchOnMount와 invalidateQueries"
      description="상세 페이지에서 invalidateQueries에 refetchType: 'all'을 주면, 목록이 비활성 상태여도 즉시 백그라운드에서 갱신되어 돌아왔을 때 최신 제목이 보입니다."
    >
      {isPending ? (
        <p>불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.map((todo) => (
            <Link key={todo.id} href={`/examples/refetch-on-mount/good/${todo.id}`}>
              <Card>
                <CardContent className="py-4">{todo.title}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 7: good 상세 페이지 작성**

`app/examples/refetch-on-mount/good/[id]/page.tsx` — bad 상세 페이지와 동일하되 `queryKey` 네임스페이스를 `"good"`으로, `invalidateQueries`에 `refetchType: "all"`을 추가:

```tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Todo = { id: number; title: string };

export default function RefetchOnMountGoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Todo>({
    queryKey: ["refetch-on-mount", "good", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`);
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["refetch-on-mount", "good", "list"],
        refetchType: "all",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    mutate(title, {
      onSuccess: () => router.push("/examples/refetch-on-mount/good"),
    });
  };

  if (!data) return <p>불러오는 중...</p>;

  return (
    <ExamplePageLayout
      slug="refetch-on-mount"
      variant="good"
      title="refetchOnMount와 invalidateQueries"
      description="refetchType: 'all'로 invalidate하면 목록이 비활성 상태여도 즉시 갱신됩니다."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" defaultValue={data.title} />
        </div>
        <Button type="submit" disabled={isPending}>
          저장하고 목록으로
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 8: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 9: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/refetch-on-mount/bad` 목록에서 아무 항목 클릭 → 제목 수정 → 저장
2. Expected: 목록으로 돌아왔을 때 예전 제목이 그대로 보임 (새로고침하면 실제로는 바뀌어 있음)
3. `/examples/refetch-on-mount/good`에서 동일하게 재현
4. Expected: 목록으로 돌아왔을 때 바로 수정된 제목이 보임

- [ ] **Step 10: Commit**

```bash
git add app/api/examples/refetch-on-mount app/examples/refetch-on-mount
git commit -m "feat: refetch-on-mount 예제 추가"
```

---

### Task 7: 예제 3 — is-pending-vs-loading

**Files:**
- Create: `app/api/examples/is-pending-vs-loading/route.ts`
- Create: `app/examples/is-pending-vs-loading/bad/page.tsx`
- Create: `app/examples/is-pending-vs-loading/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Switch`/`Label`/`Skeleton` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/is-pending-vs-loading/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function GET() {
  await delay(400);
  return NextResponse.json({ id: 1, name: "홍길동" });
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/is-pending-vs-loading/bad/page.tsx`. TypeScript는 `data`가 `undefined`일 수 있다고 보기 때문에 `data.name`은 컴파일 에러(`'data' is possibly 'undefined'`)가 난다 — 실무에서 이 에러를 피하려고 무심코 `data?.name`을 붙이는 것이 바로 문제의 시작이므로, 아래 코드도 그렇게 작성한다. `enabled=false`일 때 `isLoading`이 `false`로 유지되어(`isFetching`이 `false`이므로) 로딩 분기를 통과해버리고, `data`가 없는데도 "이름: (아무것도 표시되지 않음)"이라는 애매한 빈 화면이 보인다:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Profile = { id: number; name: string };

export default function IsPendingVsLoadingBadPage() {
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = useQuery<Profile>({
    queryKey: ["is-pending-vs-loading", "bad", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/is-pending-vs-loading");
      return res.json();
    },
    enabled,
  });

  return (
    <ExamplePageLayout
      slug="is-pending-vs-loading"
      variant="bad"
      title="isPending vs isLoading"
      description="isLoading으로 로딩을 게이팅하면, 쿼리가 비활성화(enabled:false)됐을 때 isLoading이 false가 되어 data가 없는 채로 렌더링을 시도합니다."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="enabled">쿼리 활성화</Label>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-40" />
      ) : (
        <p>이름: {data?.name ?? "(아무것도 표시되지 않음)"}</p>
      )}
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/is-pending-vs-loading/good/page.tsx` — `isLoading` 대신 `isPending`으로 게이팅:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Profile = { id: number; name: string };

export default function IsPendingVsLoadingGoodPage() {
  const [enabled, setEnabled] = useState(true);

  const { data, isPending } = useQuery<Profile>({
    queryKey: ["is-pending-vs-loading", "good", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/is-pending-vs-loading");
      return res.json();
    },
    enabled,
  });

  return (
    <ExamplePageLayout
      slug="is-pending-vs-loading"
      variant="good"
      title="isPending vs isLoading"
      description="isPending으로 게이팅하면 쿼리가 비활성화된 동안에도 안전하게 data 이전 상태로 남아있어, data에 타입 에러 없이 접근하고 명확한 안내 문구를 보여줄 수 있습니다."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="enabled">쿼리 활성화</Label>
      </div>
      {isPending ? (
        <Skeleton className="h-6 w-40" />
      ) : (
        <p>이름: {data.name}</p>
      )}
    </ExamplePageLayout>
  );
}
```

`isPending`이 `true`인 동안에는 `data`가 항상 `undefined`이고, `false`가 되는 순간에는 타입 좁히기(narrowing)로 `data`가 `Profile`로 보장되므로 `data.name`에 `?.` 없이 안전하게 접근할 수 있다 — 이것이 "안전한 접근" 부분의 데모다. `enabled=false`일 때는 `isPending`이 계속 `true`로 유지되어 스켈레톤이 계속 보인다(무한 로딩처럼 보일 수 있다는 점도 트레이드오프로 남는데, 화면에 "쿼리가 비활성화되어 있습니다" 같은 문구를 추가하고 싶다면 `enabled` 상태를 직접 분기에 반영해도 된다 — 여기서는 `isPending` vs `isLoading`의 핵심 차이만 보여주는 것이 목적이므로 최소 구현으로 둔다).

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공 (good 페이지의 `data.name`은 `isPending` 분기 덕분에 타입 에러 없음).

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/is-pending-vs-loading/bad` 접속 → 정상적으로 이름이 보임
2. "쿼리 활성화" 스위치를 끔
3. Expected: 스켈레톤도 아니고 에러도 아닌 "(아무것도 표시되지 않음)" 문구가 보임(데이터가 없는데도 로딩 분기를 통과해버린 상태)
4. `/examples/is-pending-vs-loading/good`에서 동일하게 스위치를 끔
5. Expected: 스켈레톤이 계속 유지되어(로딩 중으로 안전하게 처리됨) 잘못된 값에 접근하지 않음

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/is-pending-vs-loading app/examples/is-pending-vs-loading
git commit -m "feat: is-pending-vs-loading 예제 추가"
```

---

### Task 8: 예제 4 — data-availability-first

**Files:**
- Create: `app/api/examples/data-availability-first/route.ts`
- Create: `app/examples/data-availability-first/bad/page.tsx`
- Create: `app/examples/data-availability-first/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), 전역 `QueryCache.onError` 토스트 (Task 2), shadcn `Switch`/`Label`/`Button` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/data-availability-first/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

const notifications = [
  { id: 1, message: "새로운 댓글이 달렸습니다." },
  { id: 2, message: "결제가 완료되었습니다." },
  { id: 3, message: "새 팔로워가 생겼습니다." },
];

export async function GET(request: Request) {
  await delay(300);
  const { searchParams } = new URL(request.url);
  const fail = searchParams.get("fail") === "true";
  if (fail) {
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
  return NextResponse.json(notifications);
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/data-availability-first/bad/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Notification = { id: number; message: string };

export default function DataAvailabilityFirstBadPage() {
  const [willFail, setWillFail] = useState(false);

  const { data, isPending, isError, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ["data-availability-first", "bad", "notifications"],
    queryFn: async () => {
      const res = await fetch(
        `/api/examples/data-availability-first?fail=${willFail}`,
      );
      if (!res.ok) throw new Error("요청 실패");
      return res.json();
    },
  });

  return (
    <ExamplePageLayout
      slug="data-availability-first"
      variant="bad"
      title="data-availability-first 패턴"
      description="새로고침이 실패하면 이미 가지고 있던 목록까지 에러 화면으로 통째로 대체됩니다."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="willFail" checked={willFail} onCheckedChange={setWillFail} />
        <Label htmlFor="willFail">다음 새로고침 실패하게 만들기</Label>
        <Button type="button" onClick={() => refetch()} disabled={isFetching}>
          새로고침
        </Button>
      </div>
      {isPending ? (
        <p>불러오는 중...</p>
      ) : isError ? (
        <p className="text-destructive">불러오지 못했습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              {n.message}
            </li>
          ))}
        </ul>
      )}
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/data-availability-first/good/page.tsx` — 분기 순서를 `data` 우선으로 변경:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Notification = { id: number; message: string };

export default function DataAvailabilityFirstGoodPage() {
  const [willFail, setWillFail] = useState(false);

  const { data, isError, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ["data-availability-first", "good", "notifications"],
    queryFn: async () => {
      const res = await fetch(
        `/api/examples/data-availability-first?fail=${willFail}`,
      );
      if (!res.ok) throw new Error("요청 실패");
      return res.json();
    },
  });

  return (
    <ExamplePageLayout
      slug="data-availability-first"
      variant="good"
      title="data-availability-first 패턴"
      description="data가 있으면 항상 목록을 우선 보여주고, 백그라운드 실패는 전역 토스트로만 알립니다(Task 2의 QueryCache.onError 참고)."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="willFail" checked={willFail} onCheckedChange={setWillFail} />
        <Label htmlFor="willFail">다음 새로고침 실패하게 만들기</Label>
        <Button type="button" onClick={() => refetch()} disabled={isFetching}>
          새로고침
        </Button>
      </div>
      {data ? (
        <ul className="flex flex-col gap-2">
          {data.map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              {n.message}
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p className="text-destructive">불러오지 못했습니다.</p>
      ) : (
        <p>불러오는 중...</p>
      )}
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/data-availability-first/bad` 접속 → 목록이 보임
2. "다음 새로고침 실패하게 만들기" 스위치 켜고 "새로고침" 클릭
3. Expected: 목록이 사라지고 "불러오지 못했습니다." 에러 화면으로 대체됨 (전역 토스트도 함께 뜰 수 있음)
4. `/examples/data-availability-first/good`에서 동일하게 재현
5. Expected: 목록이 그대로 유지되고 토스트로만 실패가 알려짐

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/data-availability-first app/examples/data-availability-first
git commit -m "feat: data-availability-first 예제 추가"
```

---

### Task 9: 예제 5 — keep-previous-data

**Files:**
- Create: `app/api/examples/keep-previous-data/route.ts`
- Create: `app/examples/keep-previous-data/bad/page.tsx`
- Create: `app/examples/keep-previous-data/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Button` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/keep-previous-data/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

const ALL_ITEMS = Array.from({ length: 20 }, (_, i) => `아이템 ${i + 1}`);
const PAGE_SIZE = 5;

export async function GET(request: Request) {
  await delay(600);
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const start = (page - 1) * PAGE_SIZE;
  const items = ALL_ITEMS.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(ALL_ITEMS.length / PAGE_SIZE);
  return NextResponse.json({ items, page, totalPages });
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/keep-previous-data/bad/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type PageResult = { items: string[]; page: number; totalPages: number };

export default function KeepPreviousDataBadPage() {
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery<PageResult>({
    queryKey: ["keep-previous-data", "bad", "items", page],
    queryFn: async () => {
      const res = await fetch(`/api/examples/keep-previous-data?page=${page}`);
      return res.json();
    },
  });

  return (
    <ExamplePageLayout
      slug="keep-previous-data"
      variant="bad"
      title="keepPreviousData"
      description="페이지를 넘길 때마다 이전 데이터가 사라지고 로딩 화면이 깜빡입니다."
    >
      {isPending ? (
        <p>불러오는 중...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data?.items.map((item) => (
            <li key={item} className="rounded-md border p-3">
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          이전
        </Button>
        <span>
          {page} / {data?.totalPages ?? "?"}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={data ? page >= data.totalPages : true}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </Button>
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/keep-previous-data/good/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type PageResult = { items: string[]; page: number; totalPages: number };

export default function KeepPreviousDataGoodPage() {
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery<PageResult>({
    queryKey: ["keep-previous-data", "good", "items", page],
    queryFn: async () => {
      const res = await fetch(`/api/examples/keep-previous-data?page=${page}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  return (
    <ExamplePageLayout
      slug="keep-previous-data"
      variant="good"
      title="keepPreviousData"
      description="placeholderData: keepPreviousData를 쓰면 새 페이지를 불러오는 동안 이전 페이지 데이터가 그대로 유지됩니다."
    >
      {!data ? (
        <p>불러오는 중...</p>
      ) : (
        <ul
          className={
            isFetching
              ? "flex flex-col gap-2 opacity-50"
              : "flex flex-col gap-2"
          }
        >
          {data.items.map((item) => (
            <li key={item} className="rounded-md border p-3">
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          이전
        </Button>
        <span>
          {page} / {data?.totalPages ?? "?"}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={data ? page >= data.totalPages : true}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </Button>
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/keep-previous-data/bad`에서 "다음" 클릭
2. Expected: 목록이 사라지고 "불러오는 중..."이 잠깐 보임
3. `/examples/keep-previous-data/good`에서 "다음" 클릭
4. Expected: 이전 페이지 목록이 흐릿하게(opacity-50) 유지된 채 새 데이터로 전환됨(깜빡임 없음)

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/keep-previous-data app/examples/keep-previous-data
git commit -m "feat: keep-previous-data 예제 추가"
```

---

### Task 10: 예제 6 — mutate-vs-mutate-async

**Files:**
- Create: `app/api/examples/mutate-vs-mutate-async/route.ts`
- Create: `app/examples/mutate-vs-mutate-async/bad/page.tsx`
- Create: `app/examples/mutate-vs-mutate-async/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), `react-hook-form` (Task 1), shadcn `Input`/`Label`/`Button` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/mutate-vs-mutate-async/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function POST(request: Request) {
  const body = await request.json();
  await delay(2000);
  return NextResponse.json({ name: body.name });
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/mutate-vs-mutate-async/bad/page.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileForm = { name: string };

export default function MutateVsMutateAsyncBadPage() {
  const { mutate } = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/examples/mutate-vs-mutate-async", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({ defaultValues: { name: "" } });

  const onSubmit = (values: ProfileForm) => {
    mutate(values.name);
  };

  return (
    <ExamplePageLayout
      slug="mutate-vs-mutate-async"
      variant="bad"
      title="mutate vs mutateAsync"
      description="mutate는 즉시 반환되기 때문에 RHF가 요청 완료 전에 isSubmitting을 false로 바꿔서 버튼이 먼저 활성화됩니다."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">이름</Label>
          <Input id="name" {...register("name")} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          저장 (2초 소요)
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/mutate-vs-mutate-async/good/page.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileForm = { name: string };

export default function MutateVsMutateAsyncGoodPage() {
  const { mutateAsync } = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/examples/mutate-vs-mutate-async", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({ defaultValues: { name: "" } });

  const onSubmit = async (values: ProfileForm) => {
    await mutateAsync(values.name);
  };

  return (
    <ExamplePageLayout
      slug="mutate-vs-mutate-async"
      variant="good"
      title="mutate vs mutateAsync"
      description="mutateAsync를 await하면 RHF가 요청이 끝날 때까지 isSubmitting을 true로 유지합니다."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">이름</Label>
          <Input id="name" {...register("name")} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          저장 (2초 소요)
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/mutate-vs-mutate-async/bad`에서 이름 입력 후 저장 클릭
2. Expected: 버튼이 거의 즉시 다시 활성화됨 (2초 응답을 기다리지 않음)
3. `/examples/mutate-vs-mutate-async/good`에서 동일하게 재현
4. Expected: 버튼이 2초 동안 계속 disabled 상태로 유지됨

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/mutate-vs-mutate-async app/examples/mutate-vs-mutate-async
git commit -m "feat: mutate-vs-mutate-async 예제 추가"
```

---

### Task 11: 예제 7 — invalidate-queries-await

**Files:**
- Create: `app/api/examples/invalidate-queries-await/route.ts`
- Create: `app/examples/invalidate-queries-await/bad/page.tsx`
- Create: `app/examples/invalidate-queries-await/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Dialog`/`Input`/`Button` (Task 1), `sonner`의 `toast` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/invalidate-queries-await/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

let todos = [
  { id: 1, content: "첫 번째 할 일" },
  { id: 2, content: "두 번째 할 일" },
];
let nextId = 3;

export async function GET() {
  await delay(500);
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  const body = await request.json();
  await delay(500);
  const todo = { id: nextId, content: body.content };
  nextId += 1;
  todos = [...todos, todo];
  return NextResponse.json(todo);
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/invalidate-queries-await/bad/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Todo = { id: number; content: string };

export default function InvalidateQueriesAwaitBadPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const { data } = useQuery<Todo[]>({
    queryKey: ["invalidate-queries-await", "bad", "todos"],
    queryFn: async () => {
      const res = await fetch("/api/examples/invalidate-queries-await");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/invalidate-queries-await", {
        method: "POST",
        body: JSON.stringify({ content: value }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["invalidate-queries-await", "bad", "todos"],
      });
    },
  });

  const handleSubmit = () => {
    mutate(content, {
      onSuccess: () => {
        toast.success("추가되었습니다.");
        setOpen(false);
        setContent("");
      },
    });
  };

  return (
    <ExamplePageLayout
      slug="invalidate-queries-await"
      variant="bad"
      title="invalidateQueries await"
      description="onSuccess에서 invalidateQueries를 반환하지 않아서, 목록이 갱신되기 전에 모달이 먼저 닫힙니다."
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" />}>추가</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>할 일 추가</DialogTitle>
          </DialogHeader>
          <Input value={content} onChange={(e) => setContent(e.target.value)} />
          <DialogFooter>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ul className="flex flex-col gap-2">
        {data?.map((todo) => (
          <li key={todo.id} className="rounded-md border p-3">
            {todo.content}
          </li>
        ))}
      </ul>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/invalidate-queries-await/good/page.tsx` — `onSuccess`에서 `invalidateQueries`를 **반환**:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Todo = { id: number; content: string };

export default function InvalidateQueriesAwaitGoodPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const { data } = useQuery<Todo[]>({
    queryKey: ["invalidate-queries-await", "good", "todos"],
    queryFn: async () => {
      const res = await fetch("/api/examples/invalidate-queries-await");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/invalidate-queries-await", {
        method: "POST",
        body: JSON.stringify({ content: value }),
      });
      return res.json();
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ["invalidate-queries-await", "good", "todos"],
      });
    },
  });

  const handleSubmit = () => {
    mutate(content, {
      onSuccess: () => {
        toast.success("추가되었습니다.");
        setOpen(false);
        setContent("");
      },
    });
  };

  return (
    <ExamplePageLayout
      slug="invalidate-queries-await"
      variant="good"
      title="invalidateQueries await"
      description="useMutation의 onSuccess에서 invalidateQueries를 반환하면, refetch가 끝난 뒤에야 mutate 호출부의 onSuccess(모달 닫기)가 실행됩니다."
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" />}>추가</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>할 일 추가</DialogTitle>
          </DialogHeader>
          <Input value={content} onChange={(e) => setContent(e.target.value)} />
          <DialogFooter>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ul className="flex flex-col gap-2">
        {data?.map((todo) => (
          <li key={todo.id} className="rounded-md border p-3">
            {todo.content}
          </li>
        ))}
      </ul>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/invalidate-queries-await/bad`에서 "추가" → 내용 입력 → "저장"
2. Expected: 모달이 닫히는 순간 목록에는 아직 새 항목이 안 보이다가 곧이어 나타남(짧은 깜빡임/지연)
3. `/examples/invalidate-queries-await/good`에서 동일하게 재현
4. Expected: 모달이 닫히는 시점에 이미 새 항목이 목록에 있음

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/invalidate-queries-await app/examples/invalidate-queries-await
git commit -m "feat: invalidate-queries-await 예제 추가"
```

---

### Task 12: 예제 8 — callback-placement

**Files:**
- Create: `app/api/examples/callback-placement/route.ts`
- Create: `app/examples/callback-placement/bad/page.tsx`
- Create: `app/examples/callback-placement/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Button` (Task 1), `sonner`의 `toast` (Task 1)
- Produces: 없음

- [ ] **Step 1: mock API 작성**

`app/api/examples/callback-placement/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function POST() {
  await delay(2000);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: bad 페이지 작성**

`app/examples/callback-placement/bad/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

export default function CallbackPlacementBadPage() {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/examples/callback-placement", {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("저장되었습니다. (2초 후 표시됨)");
    },
  });

  return (
    <ExamplePageLayout
      slug="callback-placement"
      variant="bad"
      title="뮤테이션 콜백 위치"
      description="저장 버튼을 누르고 바로 다른 페이지로 이동해보세요. useMutation의 onSuccess는 언마운트 후에도 실행되어, 이미 떠난 화면에서 토스트가 뜹니다."
    >
      <div className="flex gap-3">
        <Button type="button" onClick={() => mutate()} disabled={isPending}>
          저장 (2초 소요)
        </Button>
        <Button type="button" variant="outline" render={<Link href="/" />}>
          다른 페이지로 이동
        </Button>
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 3: good 페이지 작성**

`app/examples/callback-placement/good/page.tsx` — 토스트를 `mutate()` 호출부 콜백으로 이동:

```tsx
"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

export default function CallbackPlacementGoodPage() {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/examples/callback-placement", {
        method: "POST",
      });
      return res.json();
    },
  });

  const handleSave = () => {
    mutate(undefined, {
      onSuccess: () => {
        toast.success("저장되었습니다. (2초 후 표시됨)");
      },
    });
  };

  return (
    <ExamplePageLayout
      slug="callback-placement"
      variant="good"
      title="뮤테이션 콜백 위치"
      description="저장 버튼을 누르고 바로 다른 페이지로 이동해보세요. mutate 호출부의 onSuccess는 언마운트 후 실행되지 않아 토스트가 뜨지 않습니다."
    >
      <div className="flex gap-3">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          저장 (2초 소요)
        </Button>
        <Button type="button" variant="outline" render={<Link href="/" />}>
          다른 페이지로 이동
        </Button>
      </div>
    </ExamplePageLayout>
  );
}
```

- [ ] **Step 4: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/callback-placement/bad`에서 "저장" 클릭 직후 바로 "다른 페이지로 이동" 클릭 (홈으로 이동)
2. Expected: 홈 화면에 있는 상태에서 2초 후 "저장되었습니다" 토스트가 뜸
3. `/examples/callback-placement/good`에서 동일하게 재현
4. Expected: 홈으로 이동한 뒤에는 토스트가 뜨지 않음

- [ ] **Step 6: Commit**

```bash
git add app/api/examples/callback-placement app/examples/callback-placement
git commit -m "feat: callback-placement 예제 추가"
```

---

### Task 13: 예제 9 — global-invalidate

**Files:**
- Create: `app/api/examples/global-invalidate/store.ts`
- Create: `app/api/examples/global-invalidate/badge/route.ts`
- Create: `app/api/examples/global-invalidate/settings/route.ts`
- Create: `app/examples/global-invalidate/bad/page.tsx`
- Create: `app/examples/global-invalidate/good/page.tsx`

**Interfaces:**
- Consumes: `ExamplePageLayout` (Task 3), `delay` (Task 2), shadcn `Input`/`Label`/`Button` (Task 1)
- Produces: 없음 (이 예제만 페이지 내부에서 자체 로컬 `QueryClient`를 만들어 전역 `Providers`의 캐시와 분리한다)

- [ ] **Step 1: 공유 in-memory 스토어 작성**

`app/api/examples/global-invalidate/store.ts`:

```ts
export const state = {
  settings: { theme: "라이트" },
  badgeCount: 0,
};
```

- [ ] **Step 2: badge route handler 작성**

`app/api/examples/global-invalidate/badge/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { state } from "../store";

export async function GET() {
  await delay(300);
  return NextResponse.json({ count: state.badgeCount });
}
```

- [ ] **Step 3: settings route handler 작성**

`app/api/examples/global-invalidate/settings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { state } from "../store";

export async function GET() {
  await delay(300);
  return NextResponse.json(state.settings);
}

export async function POST(request: Request) {
  const body = await request.json();
  await delay(300);
  state.settings = { ...state.settings, ...body };
  state.badgeCount += 1;
  return NextResponse.json(state.settings);
}
```

- [ ] **Step 4: bad 페이지 작성**

`app/examples/global-invalidate/bad/page.tsx` — 저장 시 `settings` 쿼리만 invalidate:

```tsx
"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = { theme: string };
type BadgeResponse = { count: number };

function BadgeCount() {
  const { data } = useQuery<BadgeResponse>({
    queryKey: ["badge"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/badge");
      return res.json();
    },
  });

  return <p>알림 배지: {data?.count ?? "..."}</p>;
}

function SettingsForm() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState("");

  const { data } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/settings");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/global-invalidate/settings", {
        method: "POST",
        body: JSON.stringify({ theme: value }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="theme">테마</Label>
      <Input
        id="theme"
        placeholder={data?.theme}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />
      <Button type="button" disabled={isPending} onClick={() => mutate(theme)}>
        저장
      </Button>
    </div>
  );
}

export default function GlobalInvalidateBadPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ExamplePageLayout
        slug="global-invalidate"
        variant="bad"
        title="전역 invalidate"
        description="설정을 저장하면 settings 쿼리만 invalidate되어, 함께 갱신되어야 할 배지 카운트는 그대로 남습니다."
      >
        <BadgeCount />
        <SettingsForm />
      </ExamplePageLayout>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: good 페이지 작성**

`app/examples/global-invalidate/good/page.tsx` — 로컬 `QueryClient`의 `mutationCache.onSuccess`에서 모든 쿼리를 자동 invalidate하고, 개별 뮤테이션에서는 수동 invalidate를 하지 않음:

```tsx
"use client";

import { useState } from "react";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = { theme: string };
type BadgeResponse = { count: number };

function BadgeCount() {
  const { data } = useQuery<BadgeResponse>({
    queryKey: ["badge"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/badge");
      return res.json();
    },
  });

  return <p>알림 배지: {data?.count ?? "..."}</p>;
}

function SettingsForm() {
  const [theme, setTheme] = useState("");

  const { data } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/settings");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/global-invalidate/settings", {
        method: "POST",
        body: JSON.stringify({ theme: value }),
      });
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="theme">테마</Label>
      <Input
        id="theme"
        placeholder={data?.theme}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />
      <Button type="button" disabled={isPending} onClick={() => mutate(theme)}>
        저장
      </Button>
    </div>
  );
}

export default function GlobalInvalidateGoodPage() {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      mutationCache: new MutationCache({
        onSuccess: () => {
          client.invalidateQueries();
        },
      }),
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ExamplePageLayout
        slug="global-invalidate"
        variant="good"
        title="전역 invalidate"
        description="MutationCache의 onSuccess에서 모든 쿼리를 자동으로 invalidate하기 때문에, 설정을 저장하면 배지 카운트도 함께 갱신됩니다."
      >
        <BadgeCount />
        <SettingsForm />
      </ExamplePageLayout>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: 빌드로 타입 체크**

Run: `npm run build`

Expected: 에러 없이 성공.

- [ ] **Step 7: 개발 서버에서 수동 검증**

Run: `npm run dev`

1. `/examples/global-invalidate/bad` 접속, 현재 배지 숫자 확인
2. 테마 값을 입력하고 저장
3. Expected: 설정 값(placeholder)은 바뀌지만 배지 숫자는 그대로임 (새로고침해야 반영됨)
4. `/examples/global-invalidate/good`에서 동일하게 재현
5. Expected: 저장하자마자 배지 숫자도 함께 올라감

- [ ] **Step 8: Commit**

```bash
git add app/api/examples/global-invalidate app/examples/global-invalidate
git commit -m "feat: global-invalidate 예제 추가"
```

---

## 전체 완료 후 최종 확인

- [ ] `npm run build`가 9개 예제 전부 포함된 상태로 에러 없이 성공하는지 다시 한 번 확인한다.
- [ ] 홈페이지(`/`)에서 9개 카드의 "문제 상황 보기"/"해결 방법 보기" 링크가 모두 올바른 페이지로 연결되는지 클릭해서 확인한다.
