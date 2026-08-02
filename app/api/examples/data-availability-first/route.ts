import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

const notifications = [
  { id: 1, message: "새로운 댓글이 달렸습니다." },
  { id: 2, message: "결제가 완료되었습니다." },
  { id: 3, message: "새 팔로워가 생겼습니다." },
];

const requestCounts: Record<string, number> = { bad: 0, good: 0 };

export async function GET(request: Request) {
  await delay(300);
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "good" ? "good" : "bad";
  const forceFail = searchParams.get("fail") === "true";

  requestCounts[variant] += 1;
  const isFirstRequest = requestCounts[variant] === 1;

  if (forceFail || !isFirstRequest) {
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
  return NextResponse.json(notifications);
}
