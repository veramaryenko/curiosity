"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TaskCheckboxProps {
  taskId: string;
  completed: boolean;
}

export function TaskCheckbox({ taskId, completed: initial }: TaskCheckboxProps) {
  const [completed, setCompleted] = useState(initial);

  async function toggle() {
    const next = !completed;
    setCompleted(next);
    // TODO: Update in Supabase
    console.log("Toggle task", taskId, next);
  }

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={`task-${taskId}`}
        checked={completed}
        onCheckedChange={toggle}
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
