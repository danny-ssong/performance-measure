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
