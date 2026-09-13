import Link from "next/link";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { buttonVariants } from "@/components/ui/button";

export default function ErrorEffectTogglePage() {
  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">isError useEffect 토글 테스트</h1>
      <p className="text-muted-foreground">
        {"useEffect(() => { if (isError) toast.error(...) }, [isError])"} 패턴이
        data 존재 여부에 따라 반복 실패 시 다르게 동작하는지 케이스별로 확인합니다.
      </p>

      <div className="flex flex-col gap-3">
        <Link
          href="/examples/error-effect-toggle/case-1"
          className={buttonVariants({ variant: "outline" })}
        >
          Case 1 — 최초 로드부터 계속 실패 (data 없음)
        </Link>
        <Link
          href="/examples/error-effect-toggle/case-2"
          className={buttonVariants({ variant: "outline" })}
        >
          Case 2 — 최초 로드 성공 후 반복 실패 (data 있음)
        </Link>
      </div>
    </ExamplePageLayout>
  );
}
