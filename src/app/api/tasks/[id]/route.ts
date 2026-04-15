import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { completed?: unknown };

  if (typeof body.completed !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: task } = await supabase
    .from("daily_tasks")
    .select(
      `
      id,
      challenge_id,
      challenges!inner (
        id,
        user_id
      )
    `
    )
    .eq("id", id)
    .eq("challenges.user_id", user.id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("daily_tasks")
    .update({ completed: body.completed })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/challenge/${task.challenge_id}`);

  return NextResponse.json({ success: true });
}
