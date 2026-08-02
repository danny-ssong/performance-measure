"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileForm = { name: string };

export default function MutateVsMutateAsyncGoodPage() {
  const { mutateAsync } = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/examples/mutate-vs-mutate-async", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({ defaultValues: { name: "" } });

  const onSubmit = async (values: ProfileForm) => {
    await mutateAsync(values.name);
  };

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">닉네임 변경</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">이름</Label>
          <Input id="name" {...register("name")} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          저장
        </Button>
      </form>
    </ExamplePageLayout>
  );
}
