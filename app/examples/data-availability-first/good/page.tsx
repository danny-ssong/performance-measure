"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type Notification = { id: number; message: string };

export default function DataAvailabilityFirstGoodPage() {
  const [fail] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("fail") === "true",
  );

  const { data, isError, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ["data-availability-first", "good", "notifications"],
    queryFn: async () => {
      const res = await fetch(
        `/api/examples/data-availability-first?variant=good&fail=${fail}`,
      );
      if (!res.ok) throw new Error("요청 실패");
      return res.json();
    },
  });

  return (
    <ExamplePageLayout>
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
