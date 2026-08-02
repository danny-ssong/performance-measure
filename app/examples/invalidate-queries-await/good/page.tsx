"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExamplePageLayout } from "@/components/example-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Todo = { id: number; content: string };

export default function InvalidateQueriesAwaitGoodPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const { data } = useQuery<Todo[]>({
    queryKey: ["invalidate-queries-await", "good", "todos"],
    queryFn: async () => {
      const res = await fetch("/api/examples/invalidate-queries-await");
      return res.json();
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/examples/invalidate-queries-await", {
        method: "POST",
        body: JSON.stringify({ content: value }),
      });
      return res.json();
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ["invalidate-queries-await", "good", "todos"],
      });
    },
  });

  const handleSubmit = () => {
    mutate(content, {
      onSuccess: () => {
        toast.success("추가되었습니다.");
        setOpen(false);
        setContent("");
      },
    });
  };

  return (
    <ExamplePageLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">메모</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" />}>추가</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>메모 추가</DialogTitle>
            </DialogHeader>
            <Input value={content} onChange={(e) => setContent(e.target.value)} />
            <DialogFooter>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map((todo) => (
          <li key={todo.id} className="rounded-md border p-3">
            {todo.content}
          </li>
        ))}
      </ul>
    </ExamplePageLayout>
  );
}
