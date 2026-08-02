"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button, buttonVariants } from "@/components/ui/button";

export default function CallbackPlacementBadPage() {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/examples/callback-placement", {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("저장되었습니다.");
    },
  });

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">환경설정</h1>
      <div className="flex gap-3">
        <Button type="button" onClick={() => mutate()} disabled={isPending}>
          저장
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          취소
        </Link>
      </div>
    </ExamplePageLayout>
  );
}
