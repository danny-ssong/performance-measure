"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  nickname: string;
  introduction: string;
};

export default function RefetchWindowFocusBadPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery<Profile>({
    queryKey: ["refetch-window-focus", "bad", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-window-focus");
      return res.json();
    },
  });

  const form = useForm<Profile>({ values: data });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Profile) => {
      const res = await fetch("/api/examples/refetch-window-focus", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["refetch-window-focus", "bad", "profile"],
      });
    },
  });

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">프로필 수정</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => mutate(values))}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname">닉네임</Label>
          <Input id="nickname" {...form.register("nickname")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="introduction">소개</Label>
          <Textarea id="introduction" rows={6} {...form.register("introduction")} />
        </div>
        <Button type="submit" disabled={isPending}>
          저장
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
