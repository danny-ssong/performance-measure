import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { todos } from "../store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  await delay(400);
  const todo = todos.find((t) => t.id === Number(id));
  return NextResponse.json(todo);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  await delay(400);
  const todo = todos.find((t) => t.id === Number(id));
  if (todo) {
    todo.title = body.title;
  }
  return NextResponse.json(todo);
}
