import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

let profile = {
  nickname: "가비아유저",
  introduction: "안녕하세요, 잘 부탁드립니다.",
};

export async function GET() {
  await delay(300);
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  profile = { ...profile, ...body };
  await delay(300);
  return NextResponse.json(profile);
}
