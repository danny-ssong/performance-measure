import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { state } from "../store";

export async function GET() {
  await delay(300);
  return NextResponse.json(state.settings);
}

export async function POST(request: Request) {
  const body = await request.json();
  await delay(300);
  state.settings = { ...state.settings, ...body };
  state.badgeCount += 1;
  return NextResponse.json(state.settings);
}
