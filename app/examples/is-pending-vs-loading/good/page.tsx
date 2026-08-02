"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Profile = { id: number; name: string };

export default function IsPendingVsLoadingGoodPage() {
  const [enabled, setEnabled] = useState(true);

  const { data, isPending, isError } = useQuery<Profile>({
    queryKey: ["is-pending-vs-loading", "good", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/is-pending-vs-loading");
      return res.json();
    },
    enabled,
  });

  return (
    <ExamplePageLayout
      slug="is-pending-vs-loading"
      variant="good"
      title="isPending vs isLoading"
      description="isPending으로 게이팅하면 쿼리가 비활성화된 동안에도 안전하게 data 이전 상태로 남아있어, data에 타입 에러 없이 접근하고 명확한 안내 문구를 보여줄 수 있습니다."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="enabled">쿼리 활성화</Label>
      </div>
      {isPending ? (
        <Skeleton className="h-6 w-40" />
      ) : isError ? (
        <p className="text-destructive">불러오지 못했습니다.</p>
      ) : (
        <p>이름: {data.name}</p>
      )}
    </ExamplePageLayout>
  );
}
