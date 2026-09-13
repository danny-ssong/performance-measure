import { NextResponse } from "next/server";
import { TOTAL_PAGES } from "../store";

export async function GET() {
  return NextResponse.json({ totalPages: TOTAL_PAGES });
}
