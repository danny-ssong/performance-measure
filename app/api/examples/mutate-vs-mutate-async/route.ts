import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

export async function POST(request: Request) {
  const body = await request.json();
  await delay(2000);
  return NextResponse.json({ name: body.name });
}
