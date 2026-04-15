import { NextResponse } from "next/server";
import { addDaysToDateString, getTodayDateString } from "@/lib/app-date";
import { createClient } from "@/lib/supabase/server";

interface TaskInput {
  day: number;
  description: string;
  resource_url: string | null;
  metric?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, duration_days, tasks } = await request.json();

  if (!title || !duration_days || !tasks?.length) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const startDate = getTodayDateString();
  const endDate = addDaysToDateString(startDate, duration_days - 1);

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      user_id: user.id,
      title,
      description: description ?? "",
      duration_days,
      status: "active",
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }

  const taskRows = (tasks as TaskInput[]).map((t) => {
    const taskDate = addDaysToDateString(startDate, t.day - 1);

    return {
      challenge_id: challenge.id,
      day_number: t.day,
      description: t.description,
      resource_url: t.resource_url ?? null,
      metric: t.metric ?? null,
      completed: false,
      date: taskDate,
    };
  });

  const { error: tasksError } = await supabase
    .from("daily_tasks")
    .insert(taskRows);

  if (tasksError) {
    // Roll back the challenge if tasks failed
    await supabase.from("challenges").delete().eq("id", challenge.id);
    return NextResponse.json(
      { error: "Failed to create tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({ challenge_id: challenge.id });
}
