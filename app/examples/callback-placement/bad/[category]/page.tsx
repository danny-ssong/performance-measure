"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CATEGORIES } from "@/app/api/examples/callback-placement/store";

type SettingsItem = { id: string; category: string; name: string; enabled: boolean };

export default function CallbackPlacementBadCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, boolean>>({});

  const categoryName = CATEGORIES.find((c) => c.id === category)?.name ?? category;

  const { data } = useQuery<SettingsItem[]>({
    queryKey: ["callback-placement", "bad", category],
    queryFn: async () => {
      const res = await fetch(`/api/examples/callback-placement/${category}`);
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (updates: { id: string; enabled: boolean }[]) => {
      const res = await fetch(`/api/examples/callback-placement/${category}`, {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["callback-placement", "bad", category],
      });
      toast.success(`${categoryName} 설정이 저장되었습니다.`);
      router.push("/examples/callback-placement/bad");
    },
  });

  const handleSave = () => {
    const updates = (data ?? []).map((item) => ({
      id: item.id,
      enabled: edits[item.id] ?? item.enabled,
    }));
    mutate(updates);
  };

  return (
    <ExamplePageLayout
      backHref="/examples/callback-placement/bad"
      backLabel="← 환경설정 목록"
    >
      {!data ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{categoryName}</h1>
          <div className="flex flex-col gap-3">
            {data.map((item) => {
              const value = (edits[item.id] ?? item.enabled) ? "enabled" : "disabled";
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <span className="shrink-0 whitespace-nowrap">{item.name}</span>
                  <RadioGroup
                    value={value}
                    onValueChange={(next: string) =>
                      setEdits((prev) => ({ ...prev, [item.id]: next === "enabled" }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="enabled" id={`${item.id}-enabled`} />
                      <Label htmlFor={`${item.id}-enabled`}>사용</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="disabled" id={`${item.id}-disabled`} />
                      <Label htmlFor={`${item.id}-disabled`}>사용 안 함</Label>
                    </div>
                  </RadioGroup>
                </div>
              );
            })}
          </div>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            저장
          </Button>
        </>
      )}
    </ExamplePageLayout>
  );
}
