"use client";

import { use } from "react";
import { ExamplePageLayout } from "@/components/example-page-layout";

export default function DataAvailabilityFirstBadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ExamplePageLayout
      backHref="/examples/data-availability-first/bad"
      backLabel="← 알림 목록으로"
    >
      <h1 className="text-2xl font-semibold">알림 상세</h1>
      <p className="text-muted-foreground">알림 #{id}</p>
    </ExamplePageLayout>
  );
}
