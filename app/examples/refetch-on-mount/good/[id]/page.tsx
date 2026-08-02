"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Todo = { id: number; title: string };

export default function RefetchOnMountGoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Todo>({
    queryKey: ["refetch-on-mount", "good", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`);
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/examples/refetch-on-mount/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["refetch-on-mount", "good", "list"],
        refetchType: "all",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    mutate(title, {
      onSuccess: () => router.push("/examples/refetch-on-mount/good"),
    });
  };

  return (
    <ExamplePageLayout>
      {!data ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">할 일 수정</h1>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" name="title" defaultValue={data.title} />
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
