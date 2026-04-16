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

interface ChallengeDetailData {
  challenge: Pick<
    Challenge,
    "id" | "title" | "description" | "duration_days" | "status" | "start_date"
  >;
  tasks: Pick<
    DailyTask,
    | "id"
    | "day_number"
    | "description"
    | "resource_url"
    | "metric"
    | "completed"
    | "date"
  >[];
  completedCount: number;
  progress: number;
  isComplete: boolean;
}

interface HistoryChallengeData {
  challenge: Pick<
    Challenge,
    | "id"
    | "title"
    | "duration_days"
    | "status"
    | "start_date"
    | "end_date"
  >;
  completedCount: number;
  progress: number;
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
    .is("deleted_at", null)
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

export async function getChallengeDetailData(
  challengeId: string
): Promise<ChallengeDetailData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, description, duration_days, status, start_date")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (challengeError) {
    throw new Error("Failed to load challenge details.");
  }

  if (!challenge) {
    return null;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("id, day_number, description, resource_url, metric, completed, date")
    .eq("challenge_id", challenge.id)
    .order("day_number", { ascending: true });

  if (tasksError) {
    throw new Error("Failed to load challenge tasks.");
  }

  const challengeTasks = tasks ?? [];

  const completedCount = challengeTasks.filter((task) => task.completed).length;
  const progress =
    challenge.duration_days > 0
      ? (completedCount / challenge.duration_days) * 100
      : 0;
  const isComplete =
    challenge.status === "completed" ||
    completedCount >= challenge.duration_days;

  return {
    challenge,
    tasks: challengeTasks,
    completedCount,
    progress,
    isComplete,
  };
}

export async function getHistoryData(): Promise<HistoryChallengeData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: challenges, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, duration_days, status, start_date, end_date")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (challengeError || !challenges || challenges.length === 0) {
    return [];
  }

  const challengeIds = challenges.map((challenge) => challenge.id);
  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("challenge_id, completed")
    .in("challenge_id", challengeIds);

  if (tasksError) {
    throw new Error("Failed to load challenge history tasks.");
  }

  const completedByChallenge = new Map<string, number>();

  for (const task of tasks ?? []) {
    if (!task.completed) continue;

    completedByChallenge.set(
      task.challenge_id,
      (completedByChallenge.get(task.challenge_id) ?? 0) + 1
    );
  }

  return challenges.map((challenge) => {
    const completedCount = completedByChallenge.get(challenge.id) ?? 0;
    const progress =
      challenge.duration_days > 0
        ? (completedCount / challenge.duration_days) * 100
        : 0;

    return {
      challenge,
      completedCount,
      progress,
    };
  });
}
