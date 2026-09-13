import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

const notifications = [
  { id: 1, message: "새로운 댓글이 달렸습니다." },
  { id: 2, message: "결제가 완료되었습니다." },
  { id: 3, message: "새 팔로워가 생겼습니다." },
];

// 화면마다 독립적인 요청 카운터를 갖는다. 한 화면에서 테스트해도 다른 화면의 "첫 요청"이 소진되지 않는다.
const VARIANTS = ["bad", "good", "error-effect"] as const;
type Variant = (typeof VARIANTS)[number];

const isVariant = (value: string | null): value is Variant =>
  VARIANTS.some((variant) => variant === value);

const resolveVariant = (request: Request): Variant => {
  const value = new URL(request.url).searchParams.get("variant");
  return isVariant(value) ? value : "bad";
};

const requestCounts: Record<Variant, number> = {
  bad: 0,
  good: 0,
  "error-effect": 0,
};

export async function GET(request: Request) {
  await delay(300);
  const { searchParams } = new URL(request.url);
  const variant = resolveVariant(request);
  const forceFail = searchParams.get("fail") === "true";

  requestCounts[variant] += 1;
  const isFirstRequest = requestCounts[variant] === 1;

  if (forceFail || !isFirstRequest) {
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
  return NextResponse.json(notifications);
}

export async function DELETE(request: Request) {
  requestCounts[resolveVariant(request)] = 0;
  return NextResponse.json({ ok: true });
}
