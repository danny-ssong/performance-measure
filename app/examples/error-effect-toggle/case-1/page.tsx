"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

export default function ErrorEffectCase1Page() {
  const { isError, isFetching, refetch } = useQuery({
    queryKey: ["error-effect-toggle", "case1"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      throw new Error("네트워크 오류");
    },
  });

  // Bad: isError만 의존. data가 한 번도 없었으므로 매 요청 시작 시 status가
  // 'pending'으로 리셋된다 → isError가 false → true를 반복해서 매번 재실행된다.
  useEffect(() => {
    if (isError) {
      toast.error("오류가 발생했습니다.");
    }
  }, [isError]);

  return (
    <ExamplePageLayout
      backHref="/examples/error-effect-toggle"
      backLabel="← 케이스 목록"
    >
      <h1 className="text-2xl font-semibold">
        Case 1 — 최초 로드부터 계속 실패
      </h1>
      <p className="text-muted-foreground">
        한 번도 성공한 적 없는 쿼리입니다. &quot;재시도&quot;를 여러 번
        눌러보세요. data가 없는 동안은 매 요청마다 isError가 false → true를
        반복하므로 실패할 때마다 토스트가 뜹니다.
      </p>

      <Button type="button" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? "요청 중..." : "재시도"}
      </Button>

      <p className="text-sm text-muted-foreground">isError: {String(isError)}</p>
    </ExamplePageLayout>
  );
}
