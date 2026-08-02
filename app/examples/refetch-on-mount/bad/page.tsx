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
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">할 일 목록</h1>
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
