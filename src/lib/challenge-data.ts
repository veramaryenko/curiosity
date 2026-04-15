import type { Challenge, DailyTask, MoodEntry } from "@/types";
import { getTodayDateString } from "@/lib/app-date";
import { createClient } from "@/lib/supabase/server";

interface DashboardData {
  challenge: Pick<
    Challenge,
    "id" | "title" | "description" | "duration_days" | "status" | "start_date"
  >;
  task: Pick<
    DailyTask,
    | "id"
    | "day_number"
    | "description"
    | "resource_url"
    | "metric"
    | "completed"
    | "date"
  >;
  completedCount: number;
  currentDay: number;
  progress: number;
  moodEntry: Pick<MoodEntry, "id" | "mood_score" | "note"> | null;
  isComplete: boolean;
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: challenges, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, description, duration_days, status, start_date")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (challengeError || !challenges || challenges.length === 0) {
    return null;
  }

  const challenge = challenges[0];

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("id, day_number, description, resource_url, metric, completed, date")
    .eq("challenge_id", challenge.id)
    .order("day_number", { ascending: true });

  if (tasksError || !tasks || tasks.length === 0) {
    return null;
  }

  const today = getTodayDateString();
  const completedCount = tasks.filter((task) => task.completed).length;
  const task =
    tasks.find((candidate) => candidate.date === today) ??
    tasks.find((candidate) => !candidate.completed) ??
    tasks[tasks.length - 1];

  const currentDay =
    task?.day_number ?? Math.min(completedCount + 1, challenge.duration_days);
  const progress =
    challenge.duration_days > 0
      ? (completedCount / challenge.duration_days) * 100
      : 0;
  const isComplete = completedCount >= challenge.duration_days;

  const { data: moodEntry } = await supabase
    .from("mood_entries")
    .select("id, mood_score, note")
    .eq("user_id", user.id)
    .eq("task_id", task.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    challenge,
    task,
    completedCount,
    currentDay,
    progress,
    moodEntry,
    isComplete,
  };
}
