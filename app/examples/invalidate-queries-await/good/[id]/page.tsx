"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Todo = { id: number; content: string };

export default function InvalidateQueriesAwaitGoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Todo>({
    queryKey: ["invalidate-queries-await", "good", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/examples/invalidate-queries-await/${id}`);
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/examples/invalidate-queries-await/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["invalidate-queries-await", "good", "todos"],
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "");
    mutate(content, {
      onSuccess: () => router.push("/examples/invalidate-queries-await/good"),
    });
  };

  return (
    <ExamplePageLayout>
      {!data ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">메모 수정</h1>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content">내용</Label>
              <Input id="content" name="content" defaultValue={data.content} />
            </div>
            <Button type="submit" disabled={isPending}>
              저장하고 목록으로
            </Button>
          </form>
        </>
      )}
    </ExamplePageLayout>
  );
}
