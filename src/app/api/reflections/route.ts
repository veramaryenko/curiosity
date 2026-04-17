import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReflectionInsight } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    challenge_id?: unknown;
    overall_feeling?: unknown;
    liked?: unknown;
    disliked?: unknown;
    obstacles?: unknown;
    wants_to_continue?: unknown;
  };

  const challenge_id =
    typeof body.challenge_id === "string" ? body.challenge_id.trim() : "";
  const overall_feeling = body.overall_feeling;
  const wants_to_continue = body.wants_to_continue;
  const liked = typeof body.liked === "string" ? body.liked : "";
  const disliked = typeof body.disliked === "string" ? body.disliked : "";
  const obstacles = typeof body.obstacles === "string" ? body.obstacles : "";

  if (
    !challenge_id ||
    typeof overall_feeling !== "number" ||
    !Number.isInteger(overall_feeling) ||
    overall_feeling < 1 ||
    overall_feeling > 5 ||
    typeof wants_to_continue !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title")
    .eq("id", challenge_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rawMoodEntries } = await supabase
    .from("mood_entries")
    .select("mood_score, note, daily_tasks(day_number)")
    .eq("challenge_id", challenge_id)
    .eq("user_id", user.id);

  const moodEntries = (rawMoodEntries ?? []).map((e) => ({
    day: (e.daily_tasks as unknown as { day_number: number } | null)?.day_number ?? 0,
    mood_score: e.mood_score,
    note: e.note,
  }));

  let ai_insight: string | null = null;
  try {
    ai_insight = await generateReflectionInsight(
      challenge.title,
      moodEntries,
      { overall_feeling, liked, disliked, obstacles }
    );
  } catch (err) {
    console.error("generateReflectionInsight failed:", err);
    ai_insight = null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("reflections")
    .insert({
      challenge_id,
      user_id: user.id,
      overall_feeling,
      liked,
      disliked,
      obstacles,
      wants_to_continue,
      ai_insight,
    })
    .select("ai_insight")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Failed to save reflection" },
      { status: 500 }
    );
  }

  await supabase
    .from("challenges")
    .update({ status: "completed" })
    .eq("id", challenge_id);

  return NextResponse.json({ insight: inserted.ai_insight ?? null });
}
