import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function POST() {
  await delay(2000);
  return NextResponse.json({ ok: true });
}
