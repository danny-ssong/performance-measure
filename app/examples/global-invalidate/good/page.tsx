"use client";

import { useState } from "react";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = { theme: string };
type BadgeResponse = { count: number };

function BadgeCount() {
  const { data } = useQuery<BadgeResponse>({
    queryKey: ["badge"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/badge");
      return res.json();
    },
  });

  return <p className="text-muted-foreground">읽지 않은 알림 {data?.count ?? "..."}개</p>;
}

function SettingsForm() {
  const [theme, setTheme] = useState("");

  const { data } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/global-invalidate/settings");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/global-invalidate/settings", {
        method: "POST",
        body: JSON.stringify({ theme: value }),
      });
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">현재 테마: {data?.theme ?? "..."}</p>
      <Label htmlFor="theme">테마</Label>
      <Input
        id="theme"
        placeholder={data?.theme}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />
      <Button type="button" disabled={isPending} onClick={() => mutate(theme)}>
        저장
      </Button>
    </div>
  );
}

export default function GlobalInvalidateGoodPage() {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      mutationCache: new MutationCache({
        onSuccess: () => {
          client.invalidateQueries();
        },
      }),
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ExamplePageLayout>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <BadgeCount />
        <SettingsForm />
      </ExamplePageLayout>
    </QueryClientProvider>
  );
}
