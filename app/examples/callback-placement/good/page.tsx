import Link from "next/link";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { CATEGORIES } from "@/app/api/examples/callback-placement/store";

export default function CallbackPlacementGoodPage() {
  return (
    <ExamplePageLayout backHref="/examples/global-invalidate/good" backLabel="← 대시보드">
      <h1 className="text-2xl font-semibold">환경설정</h1>
      <ul className="flex flex-col gap-2">
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link
              href={`/examples/callback-placement/good/${category.id}`}
              className="block rounded-md border p-3 hover:bg-accent"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </ExamplePageLayout>
  );
}
