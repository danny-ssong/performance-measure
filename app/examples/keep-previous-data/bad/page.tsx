"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";

type PageResult = { items: string[]; page: number; totalPages: number };
type PageMeta = { totalPages: number };

export default function KeepPreviousDataBadPage() {
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery<PageResult>({
    queryKey: ["keep-previous-data", "bad", "items", page],
    queryFn: async () => {
      const res = await fetch(`/api/examples/keep-previous-data?page=${page}`);
      return res.json();
    },
  });

  const { data: meta } = useQuery<PageMeta>({
    queryKey: ["keep-previous-data", "meta"],
    queryFn: async () => {
      const res = await fetch("/api/examples/keep-previous-data/meta");
      return res.json();
    },
    staleTime: Infinity,
  });

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">상품 목록</h1>
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
          {page} / {meta?.totalPages ?? "?"}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={meta ? page >= meta.totalPages : true}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </Button>
      </div>
    </ExamplePageLayout>
  );
}
