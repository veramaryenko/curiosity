import type {
  Challenge,
  ChallengeStatus,
  DailyTask,
  MoodEntry,
  MoodScore,
} from "@/types";
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

export interface HistoryItem {
  id: string;
  title: string;
  duration_days: number;
  completed_days: number;
  status: ChallengeStatus;
  start_date: string;
  end_date: string;
  overall_feeling: MoodScore | null;
  wants_to_continue: boolean | null;
}

export async function getHistoryData(): Promise<HistoryItem[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: challenges, error: challengesError } = await supabase
    .from("challenges")
    .select("id, title, duration_days, status, start_date, end_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (challengesError) {
    throw new Error("Failed to load history.");
  }

  if (!challenges || challenges.length === 0) {
    return [];
  }

  const ids = challenges.map((c) => c.id);

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("challenge_id, completed")
    .in("challenge_id", ids);

  if (tasksError) {
    throw new Error("Failed to load history.");
  }

  const completedByChallenge = new Map<string, number>();
  for (const task of tasks ?? []) {
    if (task.completed === true) {
      completedByChallenge.set(
        task.challenge_id,
        (completedByChallenge.get(task.challenge_id) ?? 0) + 1
      );
    }
  }

  const { data: reflections, error: reflectionsError } = await supabase
    .from("reflections")
    .select("challenge_id, overall_feeling, wants_to_continue")
    .in("challenge_id", ids);

  if (reflectionsError) {
    throw new Error("Failed to load history.");
  }

  const reflectionByChallenge = new Map<
    string,
    { overall_feeling: MoodScore | null; wants_to_continue: boolean | null }
  >();
  for (const reflection of reflections ?? []) {
    reflectionByChallenge.set(reflection.challenge_id, {
      overall_feeling: reflection.overall_feeling as MoodScore | null,
      wants_to_continue: reflection.wants_to_continue,
    });
  }

  return challenges.map((challenge) => {
    const reflection = reflectionByChallenge.get(challenge.id);
    return {
      id: challenge.id,
      title: challenge.title,
      duration_days: challenge.duration_days,
      completed_days: completedByChallenge.get(challenge.id) ?? 0,
      status: challenge.status as ChallengeStatus,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      overall_feeling: reflection?.overall_feeling ?? null,
      wants_to_continue: reflection?.wants_to_continue ?? null,
    };
  });
}
