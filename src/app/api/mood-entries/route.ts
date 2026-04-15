import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    task_id?: unknown;
    mood_score?: unknown;
    note?: unknown;
  };

  const taskId = typeof body.task_id === "string" ? body.task_id : "";
  const moodScore =
    typeof body.mood_score === "number"
      ? body.mood_score
      : Number(body.mood_score);
  const note =
    typeof body.note === "string" ? body.note.trim() : body.note === null ? null : "";

  if (!taskId || !Number.isInteger(moodScore) || moodScore < 1 || moodScore > 5) {
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
    .eq("id", taskId)
    .eq("challenges.user_id", user.id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("mood_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    mood_score: moodScore,
    note: note || null,
  };

  const { error } = existing
    ? await supabase.from("mood_entries").update(payload).eq("id", existing.id)
    : await supabase.from("mood_entries").insert({
        ...payload,
        task_id: taskId,
        challenge_id: task.challenge_id,
        user_id: user.id,
      });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save mood entry" },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/challenge/${task.challenge_id}`);

  return NextResponse.json({ success: true });
}
