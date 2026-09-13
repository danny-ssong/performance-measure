import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { ALL_ITEMS, PAGE_SIZE, TOTAL_PAGES } from "./store";

export async function GET(request: Request) {
  await delay(600);
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const start = (page - 1) * PAGE_SIZE;
  const items = ALL_ITEMS.slice(start, start + PAGE_SIZE);
  return NextResponse.json({ items, page, totalPages: TOTAL_PAGES });
}
