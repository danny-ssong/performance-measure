"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Todo = { id: number; title: string };

export default function RefetchOnMountBadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Todo>({
    queryKey: ["refetch-on-mount", "bad", "detail", id],
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
        queryKey: ["refetch-on-mount", "bad", "list"],
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    mutate(title, {
      onSuccess: () => router.push("/examples/refetch-on-mount/bad"),
    });
  };

  if (!data) return <p>불러오는 중...</p>;

  return (
    <ExamplePageLayout
      slug="refetch-on-mount"
      variant="bad"
      title="refetchOnMount와 invalidateQueries"
      description="저장 후 목록으로 돌아가면, 목록 쿼리는 invalidate만 되고(refetchType 기본값) 비활성 상태라 실제로 갱신되지 않습니다."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" defaultValue={data.title} />
        </div>
        <Button type="submit" disabled={isPending}>
          저장하고 목록으로
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
