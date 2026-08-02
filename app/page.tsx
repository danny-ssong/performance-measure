import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const EXAMPLES = [
  { slug: "refetch-window-focus", title: "설정" },
  { slug: "refetch-on-mount", title: "할 일 목록" },
  { slug: "is-pending-vs-loading", title: "내 프로필" },
  { slug: "data-availability-first", title: "알림" },
  { slug: "keep-previous-data", title: "상품 목록" },
  { slug: "mutate-vs-mutate-async", title: "닉네임 변경" },
  { slug: "invalidate-queries-await", title: "메모" },
  { slug: "callback-placement", title: "환경설정" },
  { slug: "global-invalidate", title: "대시보드" },
] as const;

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">React Query 예제 갤러리</h1>
        <p className="text-muted-foreground">
          각 화면을 A안/B안으로 열어서 비교할 수 있습니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((example) => (
          <Card key={example.slug}>
            <CardHeader>
              <CardTitle>{example.title}</CardTitle>
              <CardDescription>{example.slug}</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Link
                href={`/examples/${example.slug}/bad`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                A안
              </Link>
              <Link
                href={`/examples/${example.slug}/good`}
                className={buttonVariants({ size: "sm" })}
              >
                B안
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
