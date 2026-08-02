# React Query 예제 갤러리 앱 설계

## 배경 및 목적

React Query(TanStack Query) 사용 시 흔히 겪는 9가지 문제 상황(bad)과 해결 방법(good)을
영상으로 녹화해서 보여주기 위한 데모 앱을 만든다. 각 케이스는 `bad`/`good` 페이지로
완전히 분리하고, 실제로 화면에서 문제/해결이 눈에 보이도록 mock API와 인위적 지연,
"외부에서 데이터를 변경" 시뮬레이션 버튼 등을 포함한다.

기반 프로젝트는 `create-next-app`으로 갓 생성된 Next.js 16.2.12 앱(App Router,
Tailwind v4, TypeScript)이며 아직 React Query, shadcn/ui가 설치되어 있지 않다.

Next.js 16 특이사항(문서 확인 완료, `node_modules/next/dist/docs` 기준):
- 모든 동적 `params`(page, layout, route handler)는 `Promise`이며 반드시 `await`
  (또는 client component에서는 `use()`)해야 한다. 동기 접근 지원 없음.
- Route Handler의 `GET`은 기본적으로 dynamic(캐시 안 됨) — 이번 프로젝트의
  in-memory mock에는 오히려 적합하다.
- `cacheComponents`는 `next.config.ts`에 설정하지 않으므로 `'use cache'` 관련
  규칙은 적용하지 않는다.
- `middleware.ts`는 사용하지 않으므로 `proxy.ts` 리네이밍 이슈는 해당 없음.

## 범위

포함하는 9개 예제 (각 `bad`/`good` 페이지 쌍):

1. `refetch-window-focus` — RHF `values: data` + 탭 포커스 refetch로 인한 폼 덮어씌움
2. `refetch-on-mount` — `refetchOnMount:false` + `invalidateQueries` refetchType
3. `is-pending-vs-loading` — `isLoading` vs `isPending` 안전한 data 접근/로딩 게이팅
4. `data-availability-first` — 백그라운드 refetch 실패 시 캐시 데이터 유지 + 토스트
5. `keep-previous-data` — 페이지네이션 시 `placeholderData: keepPreviousData`
6. `mutate-vs-mutate-async` — RHF 제출 버튼 disabled 상태와 `mutate`/`mutateAsync`
7. `invalidate-queries-await` — `onSuccess`에서 `invalidateQueries` 반환 여부
8. `callback-placement` — 언마운트 후 콜백 실행 여부 (`useMutation` vs `mutate` 콜백)
9. `global-invalidate` — `MutationCache.onSuccess` 전역 invalidate + `meta.skipGlobalInvalidate`

제외: "Query 에러 처리 패턴"의 렌더 중 토스트 안티패턴(별도 bad/good 대비가 약해
`data-availability-first`에 개념적으로 흡수), "있어빌리티"(staleTime/gcTime,
structural sharing — 원문에 코드 예시 없음).

## 공통 아키텍처

### 의존성 추가

- `@tanstack/react-query`
- `@tanstack/react-query-devtools`
- shadcn/ui: `button`, `card`, `input`, `label`, `textarea`, `switch`, `skeleton`,
  `badge`, `sonner`

### 전역 Providers

`app/providers.tsx` (client component):
- `QueryClientProvider` — `QueryClient`는 컴포넌트 내부 `useState(() => new QueryClient())`로 생성
- `ReactQueryDevtools` (개발 환경에서만 렌더링할 필요 없이 항상 노출 — 데모용이므로 단순하게 둔다)
- shadcn `<Toaster />` (sonner)

`app/layout.tsx`는 `<Providers>{children}</Providers>`로 감싸는 것 외 기존 구조 유지.

### Mock API 레이어

- 각 예제 전용 in-memory 데이터는 `app/api/examples/<slug>/route.ts` 모듈
  스코프 변수에 저장한다 (요청 간 유지, 서버 재시작 시 초기화).
- `lib/delay.ts`: `export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))`
- 각 route handler는 실제 지연(500ms~2000ms, 예제별로 명시)을 흉내내기 위해 `delay()`를 호출한다.
- 동적 세그먼트가 필요한 route(`refetch-on-mount`)는 `context: { params: Promise<{ id: string }> }`
  형태로 작성하고 `await params`.

### 홈페이지 (`app/page.tsx`)

- 9개 예제를 shadcn `Card` 그리드로 나열
- 각 카드: 제목, 한 줄 설명, "문제 상황 보기"(→ `/examples/<slug>/bad`) /
  "해결 방법 보기"(→ `/examples/<slug>/good`) 버튼 2개

### 공통 페이지 레이아웃 (`components/example-page-layout.tsx`)

- props: `title`, `description`, `variant: 'bad' | 'good'`, `slug`, `children`
- 상단에 제목/설명, `variant`에 따라 Badge("문제 상황" 빨강 / "해결됨" 초록),
  bad↔good 전환 링크, "← 홈으로" 링크를 표준화해서 렌더링
- 각 `bad/page.tsx`, `good/page.tsx`는 이 레이아웃으로 감싼 본문만 작성

## 예제별 상세 설계

### 1. refetch-window-focus

- **데이터**: `{ companyName: string; memo: string }`
- **API**: `GET /api/examples/refetch-window-focus` (조회), `PATCH` (관리자가 외부에서 변경하는 것을 흉내내는 별도 버튼용)
- **화면**: RHF 폼(`values: data`)으로 바인딩된 `companyName`, `memo` 입력 필드 + 저장 버튼. 별도 "🧑‍💻 다른 사람이 서버 데이터를 변경했습니다" 버튼(PATCH 호출, 폼과 무관하게 서버 값만 변경).
- **bad**: 쿼리 옵션 기본값 (`refetchOnWindowFocus` 미지정 → true). 사용자가 폼 입력 중 다른 탭으로 갔다가 돌아오면 (또는 "변경 시뮬레이션" 버튼 클릭 후 브라우저 탭 전환) 입력 중이던 값이 서버 값으로 덮어써짐.
- **good**: `refetchOnWindowFocus: false`.
- **안내 문구**: 페이지에 "이 버튼을 누른 뒤 다른 브라우저 탭으로 갔다가 돌아와보세요"라고 명시.

### 2. refetch-on-mount

- **데이터**: todo 리스트 `{ id: number; title: string }[]`
- **API**: `GET /api/examples/refetch-on-mount` (목록), `GET/PATCH /api/examples/refetch-on-mount/[id]` (상세/수정)
- **화면 구성**: `bad/page.tsx`(목록, `refetchOnMount: false`) → 항목 클릭 시 `bad/[id]/page.tsx`(수정 폼)로 이동 → 저장 시 `invalidateQueries({ queryKey })` (refetchType 기본값) → 목록으로 돌아가기 링크.
- **bad**: 목록이 언마운트된 상태에서 상세 페이지가 invalidate만 하고(refetchType 기본 'active' → 비활성 쿼리라 실제로는 refetch 안 됨), 목록으로 돌아왔을 때 `refetchOnMount:false`라 자동 재요청도 안 되어 예전 제목이 그대로 보임.
- **good**: 상세 페이지의 `invalidateQueries({ queryKey, refetchType: 'all' })`로 비활성 상태에서도 즉시 백그라운드 refetch, 목록으로 돌아오면 최신 제목이 보임.

### 3. is-pending-vs-loading

- **데이터**: `{ id: number; name: string }`
- **API**: `GET /api/examples/is-pending-vs-loading?enabled=<bool>` (400ms 지연)
- **화면**: "쿼리 활성화" `Switch` 토글로 `enabled` 옵션을 제어.
- **bad**: `if (isLoading) return <Skeleton />` 후 바로 `data.name` 렌더링. `enabled=false`일 때 `isLoading`이 `false`(데이터 요청 자체가 없으므로 `isFetching=false`)라서 분기를 통과해 `data`가 `undefined`인 채로 접근 → 런타임에서 빈 값/에러 표시.
- **good**: `if (isPending) return <Skeleton />`으로 게이팅 후 `data.name` 접근. `enabled=false`일 때도 `isPending`이 `true`로 유지되어 안전하게 로딩/비활성 상태 문구를 보여줌.

### 4. data-availability-first

- **데이터**: 알림 리스트 `{ id: number; message: string }[]`
- **API**: `GET /api/examples/data-availability-first?fail=<bool>` — `fail=true`면 500 에러 반환(300ms 지연 후)
- **화면**: 최초 로드는 성공, "다음 refetch 실패하게 만들기" 체크박스 + "새로고침" 버튼(`refetch()` 호출).
- **bad**: `if (isPending) ...; if (isError) return <FullPageError />; return <List data={data}/>` 순서라 실패 시 기존 리스트가 에러 화면으로 통째로 대체됨.
- **good**: `if (data) return <List data={data} />; if (isError) ...; return <Loading/>` 순서 + `QueryCache.onError`에서 `data.state.data !== undefined`일 때만 sonner 토스트 표시. 리스트는 유지되고 토스트만 뜬다.

### 5. keep-previous-data

- **데이터**: 아이템 20개를 페이지당 5개씩 `{ items, page, totalPages }`
- **API**: `GET /api/examples/keep-previous-data?page=<n>` (600ms 지연)
- **화면**: 이전/다음 페이지 버튼.
- **bad**: `placeholderData` 미지정 → 페이지 전환마다 `data`가 `undefined`가 되어 리스트 자리에 스켈레톤이 깜빡임.
- **good**: `placeholderData: keepPreviousData` → 새 데이터 로딩 중에도 이전 페이지 데이터가 유지되고, 로딩 중임을 나타내는 은은한 opacity 처리만 추가.

### 6. mutate-vs-mutate-async

- **데이터**: 프로필 이름 저장 `{ name: string }`
- **API**: `POST /api/examples/mutate-vs-mutate-async` (2000ms 지연)
- **화면**: RHF 폼 + 저장 버튼(`disabled={isSubmitting}`).
- **bad**: `submitForm`이 `mutate(...)`만 호출하고 await 없이 종료 → RHF가 즉시 `isSubmitting=false` 처리 → 버튼이 요청 완료 전에 다시 활성화됨(2초 지연 동안 눈에 보임).
- **good**: `await mutateAsync(...)` 사용 → 버튼이 요청이 끝날 때까지 disabled 유지.

### 7. invalidate-queries-await

- **데이터**: todo 리스트 `{ id: number; content: string }[]`
- **API**: `GET /api/examples/invalidate-queries-await` (목록), `POST` (추가, 500ms 지연)
- **화면**: 리스트 + "추가" 버튼 → shadcn Dialog(모달) 열림 → 입력 후 제출.
- **bad**: `useMutation`의 `onSuccess`가 `queryClient.invalidateQueries({ queryKey })`를 호출만 하고 반환하지 않음 → `mutate`의 `onSuccess`(모달 닫기 + 토스트)가 refetch 완료를 기다리지 않고 먼저 실행되어, 모달이 닫혔을 때 리스트에 새 항목이 아직 안 보임(짧은 순간 리스트가 이전 상태로 보임).
- **good**: `onSuccess: () => queryClient.invalidateQueries({ queryKey })`를 **반환**하여 mutation 파이프라인이 refetch까지 기다리게 함 → 모달이 닫힐 때 이미 새 항목이 리스트에 있음.

### 8. callback-placement

- **데이터**: 저장 액션만 있고 별도 조회 데이터 없음 (또는 간단한 카운터)
- **API**: `POST /api/examples/callback-placement` (2000ms 지연)
- **화면**: 저장 버튼 + "다른 페이지로 이동" 링크(Home으로 이동하는 `<Link>`).
- **시나리오**: 저장 버튼 클릭 직후(2초 응답 대기 중) 바로 "다른 페이지로 이동"을 클릭해서 현재 페이지를 언마운트시킨다.
- **bad**: 토스트 호출이 `useMutation({ onSuccess })`(훅 레벨)에 있음 → 컴포넌트가 언마운트되어 다른 페이지로 이동한 뒤에도 2초 후 sonner 토스트가 떠서(화면은 이미 홈인데 "저장되었습니다" 토스트가 나타남) 사용자를 혼란스럽게 만듦.
- **good**: 토스트 호출을 `mutate(vars, { onSuccess })`(호출부 레벨)로 이동 → 언마운트 후에는 해당 콜백이 실행되지 않아 토스트가 뜨지 않음.

### 9. global-invalidate

- **데이터**: 두 개의 독립적인 리소스 — 알림 개수(`badge`), 설정 값(`settings`)
- **API**: `GET /api/examples/global-invalidate/badge`, `GET /api/examples/global-invalidate/settings`, `POST /api/examples/global-invalidate/settings`(설정 저장, 이 요청은 badge에도 영향을 준다고 가정)
- **화면**: 상단에 badge 카운트 표시 + 설정 저장 폼. `bad`, `good` 페이지 모두 루트 `Providers`의 전역 `QueryClient`를 그대로 쓰지 않고, 각 페이지 내부에서 **자신만의 로컬 `QueryClient`**를 새로 만들어(`useState(() => new QueryClient(...))`) 한 겹 더 `QueryClientProvider`로 감싼다. 이렇게 해야 `bad`/`good` 사이에 캐시가 공유되지 않아 `MutationCache` 설정 차이(있음/없음)를 서로 간섭 없이 독립적으로 보여줄 수 있다.
- **bad**: 설정 저장 `useMutation`이 `settings` 쿼리 키만 `invalidateQueries` — badge는 갱신되지 않아 오래된 카운트가 보임.
- **good**: 로컬 `QueryClient`의 `mutationCache: new MutationCache({ onSuccess: () => queryClient.invalidateQueries() })`로 모든 활성 쿼리를 자동 invalidate. `badge` 쿼리에는 `meta: { skipGlobalInvalidate: true }`를 걸어두고 `predicate`로 제외하는 대비군을 같은 페이지에서 토글로 비교 가능하게 한다(선택적 심화 데모).

## 폴더 구조

```
app/
  layout.tsx
  providers.tsx
  page.tsx
  examples/
    refetch-window-focus/{bad,good}/page.tsx
    refetch-on-mount/{bad,good}/page.tsx
             {bad,good}/[id]/page.tsx
    is-pending-vs-loading/{bad,good}/page.tsx
    data-availability-first/{bad,good}/page.tsx
    keep-previous-data/{bad,good}/page.tsx
    mutate-vs-mutate-async/{bad,good}/page.tsx
    invalidate-queries-await/{bad,good}/page.tsx
    callback-placement/{bad,good}/page.tsx
    global-invalidate/{bad,good}/page.tsx
  api/
    examples/
      refetch-window-focus/route.ts
      refetch-on-mount/route.ts
      refetch-on-mount/[id]/route.ts
      is-pending-vs-loading/route.ts
      data-availability-first/route.ts
      keep-previous-data/route.ts
      mutate-vs-mutate-async/route.ts
      invalidate-queries-await/route.ts
      callback-placement/route.ts
      global-invalidate/badge/route.ts
      global-invalidate/settings/route.ts
components/
  ui/                        # shadcn 컴포넌트
  example-page-layout.tsx
lib/
  delay.ts
```

## 검증 방법

자동화 테스트는 작성하지 않는다(데모/영상 녹화용 앱이며 각 케이스가 "실제 브라우저
동작을 눈으로 확인"하는 것이 목적). 대신 각 예제 구현 후 `npm run dev`로 직접
시나리오를 재현해서 bad에서 문제가 실제로 보이고 good에서 해결되는지 수동 확인한다.
빌드 검증은 `npm run build`로 타입 에러 여부만 확인한다.
