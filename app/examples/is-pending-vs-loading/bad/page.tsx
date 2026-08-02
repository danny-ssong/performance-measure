"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Profile = { id: number; name: string };

export default function IsPendingVsLoadingBadPage() {
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = useQuery<Profile>({
    queryKey: ["is-pending-vs-loading", "bad", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/is-pending-vs-loading");
      return res.json();
    },
    enabled,
  });

  return (
    <ExamplePageLayout
      slug="is-pending-vs-loading"
      variant="bad"
      title="isPending vs isLoading"
      description="isLoading으로 로딩을 게이팅하면, 쿼리가 비활성화(enabled:false)됐을 때 isLoading이 false가 되어 data가 없는 채로 렌더링을 시도합니다."
    >
      <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="enabled">쿼리 활성화</Label>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-40" />
      ) : (
        <p>이름: {data?.name ?? "(아무것도 표시되지 않음)"}</p>
      )}
    </ExamplePageLayout>
  );
}
