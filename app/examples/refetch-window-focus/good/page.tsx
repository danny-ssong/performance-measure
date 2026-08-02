"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  companyName: string;
  memo: string;
};

export default function RefetchWindowFocusGoodPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery<Settings>({
    queryKey: ["refetch-window-focus", "good", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-window-focus");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const form = useForm<Settings>({ values: data });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Settings) => {
      const res = await fetch("/api/examples/refetch-window-focus", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["refetch-window-focus", "good", "settings"],
      });
    },
  });

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">설정</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => mutate(values))}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">회사명</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea id="memo" rows={6} {...form.register("memo")} />
        </div>
        <Button type="submit" disabled={isPending}>
          저장
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
