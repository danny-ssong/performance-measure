"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Profile = { id: number; name: string };

export default function IsPendingVsLoadingGoodPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { data, isPending, isError } = useQuery<Profile>({
    queryKey: ["is-pending-vs-loading", "good", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/examples/is-pending-vs-loading");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  return (
    <ExamplePageLayout>
      <h1 className="text-2xl font-semibold">내 프로필</h1>
      <div className="flex items-center gap-3 rounded-md border p-4">
        <Switch
          id="isLoggedIn"
          checked={isLoggedIn}
          onCheckedChange={setIsLoggedIn}
        />
        <Label htmlFor="isLoggedIn">로그인 상태 유지</Label>
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
