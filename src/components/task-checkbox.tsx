"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TaskCheckboxProps {
  taskId: string;
  completed: boolean;
}

export function TaskCheckbox({ taskId, completed: initial }: TaskCheckboxProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initial);
  const [isPending, startTransition] = useTransition();

  async function toggle(checked: boolean | "indeterminate") {
    const next = checked === true;
    const previous = completed;
    setCompleted(next);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });

      if (!response.ok) {
        throw new Error("Nie udalo sie zaktualizowac zadania.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setCompleted(previous);
      toast.error("Nie udalo sie zapisac postepu. Sprobuj ponownie.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={`task-${taskId}`}
        checked={completed}
        onCheckedChange={toggle}
        disabled={isPending}
        className="h-6 w-6"
      />
      <Label
        htmlFor={`task-${taskId}`}
        className="cursor-pointer text-base font-medium"
      >
        {completed ? "Zrobione!" : "Oznacz jako zrobione"}
      </Label>
    </div>
  );
}
