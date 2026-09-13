"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type Notification = { id: number; message: string };

export default function DataAvailabilityFirstBadPage() {
  const [fail] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("fail") === "true",
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ["data-availability-first", "bad", "notifications"],
    queryFn: async () => {
      const res = await fetch(
        `/api/examples/data-availability-first?variant=bad&fail=${fail}`,
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
      {isPending ? (
        <p>불러오는 중...</p>
      ) : isError ? (
        <p className="text-destructive">불러오지 못했습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((n) => (
            <li key={n.id}>
              <Link
                href={`/examples/data-availability-first/bad/${n.id}`}
                className="block rounded-md border p-3 hover:bg-accent"
              >
                {n.message}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        className="fixed right-6 bottom-6"
        onClick={async () => {
          await fetch("/api/examples/data-availability-first?variant=bad", {
            method: "DELETE",
          });
          window.location.reload();
        }}
      >
        테스트 초기화
      </Button>
    </ExamplePageLayout>
  );
}
