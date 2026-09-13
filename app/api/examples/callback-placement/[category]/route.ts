import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { getItemsByCategory, updateItem, type SettingsCategory } from "../store";

type RouteContext = { params: Promise<{ category: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { category } = await params;
  await delay(300);
  return NextResponse.json(getItemsByCategory(category as SettingsCategory));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { category } = await params;
  const body: { updates: { id: string; enabled: boolean }[] } = await request.json();
  await delay(2000);
  for (const update of body.updates) {
    updateItem(update.id, update.enabled);
  }
  return NextResponse.json(getItemsByCategory(category as SettingsCategory));
}
