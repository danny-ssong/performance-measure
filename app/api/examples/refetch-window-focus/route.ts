import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

let settings = {
  companyName: "가비아",
  memo: "초기 메모입니다.",
};

export async function GET() {
  await delay(300);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  settings = { ...settings, ...body };
  await delay(300);
  return NextResponse.json(settings);
}
