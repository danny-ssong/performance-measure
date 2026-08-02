import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { todos } from "./store";

export async function GET() {
  await delay(400);
  return NextResponse.json(todos);
}
