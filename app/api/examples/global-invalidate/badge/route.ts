import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { state } from "../store";

export async function GET() {
  await delay(300);
  return NextResponse.json({ count: state.badgeCount });
}
