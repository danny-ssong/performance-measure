"use client";

import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  companyName: string;
  memo: string;
};

function SimulateExternalChangeButton() {
  const handleClick = async () => {
    await fetch("/api/examples/refetch-window-focus", {
      method: "PATCH",
      body: JSON.stringify({
        memo: `관리자가 ${new Date().toLocaleTimeString()}에 변경함`,
      }),
    });
  };

  return (
    <Button type="button" variant="secondary" onClick={handleClick}>
      🧑‍💻 다른 사람이 서버 데이터를 변경했습니다
    </Button>
  );
}

export default function RefetchWindowFocusBadPage() {
  const { data } = useQuery<Settings>({
    queryKey: ["refetch-window-focus", "bad", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/examples/refetch-window-focus");
      return res.json();
    },
  });

  const form = useForm<Settings>({ values: data });

  return (
    <ExamplePageLayout
      slug="refetch-window-focus"
      variant="bad"
      title="탭 포커스 refetch와 RHF 폼 덮어씌움"
      description="폼을 입력하는 도중 탭을 전환했다가 돌아오면 refetchOnWindowFocus 기본값(true) 때문에 입력 중이던 값이 서버 값으로 덮어써집니다."
    >
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">회사명</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea id="memo" rows={6} {...form.register("memo")} />
        </div>
      </form>
      <div className="flex flex-col gap-3 rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          메모 입력 필드에 텍스트를 입력한 뒤, 아래 버튼을 누르고 다른 브라우저 탭으로
          이동했다가 돌아와보세요. 입력 중이던 내용이 서버 값으로 사라집니다.
        </p>
        <SimulateExternalChangeButton />
      </div>
    </ExamplePageLayout>
  );
}
