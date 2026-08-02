import { NextResponse } from "next/server";
import { delay } from "@/lib/delay";

let todos = [
  { id: 1, content: "첫 번째 할 일" },
  { id: 2, content: "두 번째 할 일" },
];
let nextId = 3;

export async function GET() {
  await delay(2500);
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  const body = await request.json();
  await delay(2500);
  const todo = { id: nextId, content: body.content };
  nextId += 1;
  todos = [...todos, todo];
  return NextResponse.json(todo);
}
