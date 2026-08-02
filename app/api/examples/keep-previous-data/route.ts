import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

const ALL_ITEMS = Array.from({ length: 20 }, (_, i) => `상품 ${i + 1}`);
const PAGE_SIZE = 5;

export async function GET(request: Request) {
  await delay(600);
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const start = (page - 1) * PAGE_SIZE;
  const items = ALL_ITEMS.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(ALL_ITEMS.length / PAGE_SIZE);
  return NextResponse.json({ items, page, totalPages });
}
