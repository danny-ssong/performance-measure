import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { findTodo, updateTodo } from "../store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  await delay(300);
  const todo = findTodo(Number(id));
  return NextResponse.json(todo);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  await delay(300);
  const todo = updateTodo(Number(id), body.content);
  return NextResponse.json(todo);
}
