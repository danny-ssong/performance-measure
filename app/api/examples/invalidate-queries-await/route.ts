import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";
import { addTodo, clearTodos, getTodos } from "./store";

export async function GET() {
  await delay(2500);
  return NextResponse.json(getTodos());
}

export async function POST(request: Request) {
  const body = await request.json();
  await delay(500);
  const todo = addTodo(body.content);
  return NextResponse.json(todo);
}

export async function DELETE() {
  clearTodos();
  return NextResponse.json({ ok: true });
}
