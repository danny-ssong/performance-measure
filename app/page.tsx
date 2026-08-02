import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

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
              <Link
                href={`/examples/${example.slug}/bad`}
                className={buttonVariants({ variant: "destructive", size: "sm" })}
              >
                문제 상황 보기
              </Link>
              <Link
                href={`/examples/${example.slug}/good`}
                className={buttonVariants({ size: "sm" })}
              >
                해결 방법 보기
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
