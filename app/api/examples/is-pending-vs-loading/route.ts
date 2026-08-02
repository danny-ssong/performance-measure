import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function GET() {
  await delay(400);
  return NextResponse.json({ id: 1, name: "홍길동" });
}
