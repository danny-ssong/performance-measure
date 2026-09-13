"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type Notification = { id: number; message: string };

// 첫 요청만 성공하고 이후 요청은 500을 반환한다. 초기화는 DELETE로 한다.
const NOTIFICATIONS_URL =
  "/api/examples/data-availability-first?variant=error-effect";

export default function ErrorEffectCase2Page() {
  const { data, isError, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ["error-effect-toggle", "case2", "notifications"],
    queryFn: async () => {
      const res = await fetch(NOTIFICATIONS_URL);
      if (!res.ok) throw new Error("요청 실패");
      return res.json();
    },
  });

  // Bad: isError만 의존한다. 최초 로드가 성공해 data가 캐시된 뒤에는 재실패해도
  // status가 'error' → 'error'로 유지되어 isError 값이 바뀌지 않는다.
  // 그래서 첫 실패에만 토스트가 뜨고, 이후 연속 실패는 조용히 묻힌다.
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">알림</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          새로고침
        </Button>
      </div>
      {data ? (
        <ul className="flex flex-col gap-2">
          {data.map((notification) => (
            <li key={notification.id} className="rounded-md border p-3">
              {notification.message}
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p className="text-destructive">불러오지 못했습니다.</p>
      ) : (
        <p>불러오는 중...</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="fixed right-6 bottom-6"
        onClick={async () => {
          await fetch(NOTIFICATIONS_URL, { method: "DELETE" });
          window.location.reload();
        }}
      >
        테스트 초기화
      </Button>
    </ExamplePageLayout>
  );
}
