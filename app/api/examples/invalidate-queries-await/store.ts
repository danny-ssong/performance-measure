export type InvalidateQueriesAwaitTodo = { id: number; content: string };

let todos: InvalidateQueriesAwaitTodo[] = [
  { id: 1, content: "첫 번째 할 일" },
  { id: 2, content: "두 번째 할 일" },
];
let nextId = 3;

export function getTodos() {
  return todos;
}

export function findTodo(id: number) {
  return todos.find((todo) => todo.id === id);
}

export function addTodo(content: string) {
  const todo = { id: nextId, content };
  nextId += 1;
  todos = [...todos, todo];
  return todo;
}

export function updateTodo(id: number, content: string) {
  const todo = findTodo(id);
  if (todo) {
    todo.content = content;
  }
  return todo;
}

export function clearTodos() {
  todos = [];
  nextId = 1;
}
