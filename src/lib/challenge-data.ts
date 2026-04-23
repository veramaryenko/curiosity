import type { Challenge, DailyTask, MoodEntry } from "@/types";
import { getTodayDateString } from "@/lib/app-date";
import { createClient } from "@/lib/supabase/server";

type DashboardChallengeSummary = Pick<
  Challenge,
  "id" | "title" | "description" | "duration_days" | "status" | "start_date"
>;

type DashboardTaskSummary = Pick<
  DailyTask,
  | "id"
  | "day_number"
  | "description"
  | "resources"
  | "metric"
  | "completed"
  | "date"
>;

type DashboardTaskRecord = DashboardTaskSummary & Pick<DailyTask, "challenge_id">;

type DashboardMoodEntrySummary = Pick<MoodEntry, "id" | "mood_score" | "note">;

type DashboardMoodEntryRecord = DashboardMoodEntrySummary &
  Pick<MoodEntry, "task_id">;

export interface DashboardChallengeData {
  challenge: DashboardChallengeSummary;
  task: DashboardTaskSummary;
  completedCount: number;
  currentDay: number;
  progress: number;
  moodEntry: DashboardMoodEntrySummary | null;
  isComplete: boolean;
}

interface DashboardChallengeEntry {
  challenge: DashboardChallengeSummary;
  task: DashboardTaskRecord;
  completedCount: number;
  currentDay: number;
  progress: number;
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
    | "resources"
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

function selectDashboardTask(tasks: DashboardTaskRecord[], today: string) {
  return (
    tasks.find((candidate) => candidate.date === today) ??
    tasks.find((candidate) => !candidate.completed) ??
    tasks[tasks.length - 1]
  );
}

export async function getDashboardData(): Promise<DashboardChallengeData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: rawChallenges, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, description, duration_days, status, start_date")
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const challenges = rawChallenges as DashboardChallengeSummary[] | null;

  if (challengeError || !challenges || challenges.length === 0) {
    return [];
  }

  const challengeIds = challenges.map((challenge) => challenge.id);
  const { data: rawTasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select(
      "id, challenge_id, day_number, description, resources, metric, completed, date"
    )
    .in("challenge_id", challengeIds);

  if (tasksError) {
    return [];
  }

  const tasks = (rawTasks ?? []) as DashboardTaskRecord[];
  const tasksByChallengeId = new Map<string, DashboardTaskRecord[]>();

  for (const task of tasks) {
    const groupedTasks = tasksByChallengeId.get(task.challenge_id) ?? [];
    groupedTasks.push(task);
    tasksByChallengeId.set(task.challenge_id, groupedTasks);
  }

  const today = getTodayDateString();
  const dashboardEntries = challenges
    .map((challenge) => {
      const challengeTasks = [...(tasksByChallengeId.get(challenge.id) ?? [])].sort(
        (left, right) => left.day_number - right.day_number
      );

      if (challengeTasks.length === 0) {
        return null;
      }

      const task = selectDashboardTask(challengeTasks, today);

      if (!task) {
        return null;
      }

      const completedCount = challengeTasks.filter((candidate) => candidate.completed).length;
      const currentDay = task.day_number;
      const progress =
        challenge.duration_days > 0
          ? (completedCount / challenge.duration_days) * 100
          : 0;
      const isComplete = completedCount >= challenge.duration_days;

      return {
        challenge,
        task,
        completedCount,
        currentDay,
        progress,
        isComplete,
      };
    })
    .filter((entry): entry is DashboardChallengeEntry => entry !== null);

  if (dashboardEntries.length === 0) {
    return [];
  }

  const selectedTaskIds = dashboardEntries.map((entry) => entry.task.id);
  const { data: rawMoodEntries, error: moodEntriesError } =
    selectedTaskIds.length > 0
      ? await supabase
          .from("mood_entries")
          .select("id, task_id, mood_score, note")
          .eq("user_id", user.id)
          .in("task_id", selectedTaskIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (moodEntriesError) {
    return [];
  }

  const moodEntries = (rawMoodEntries ?? []) as DashboardMoodEntryRecord[];
  const moodEntryByTaskId = new Map<string, DashboardMoodEntrySummary>();

  for (const moodEntry of moodEntries) {
    if (moodEntryByTaskId.has(moodEntry.task_id)) {
      continue;
    }

    moodEntryByTaskId.set(moodEntry.task_id, {
      id: moodEntry.id,
      mood_score: moodEntry.mood_score,
      note: moodEntry.note,
    });
  }

  const challengesWithMood: DashboardChallengeData[] = dashboardEntries.map((entry) => ({
    challenge: entry.challenge,
    task: {
      id: entry.task.id,
      day_number: entry.task.day_number,
      description: entry.task.description,
      resources: entry.task.resources,
      metric: entry.task.metric,
      completed: entry.task.completed,
      date: entry.task.date,
    },
    completedCount: entry.completedCount,
    currentDay: entry.currentDay,
    progress: entry.progress,
    moodEntry: moodEntryByTaskId.get(entry.task.id) ?? null,
    isComplete: entry.isComplete,
  }));

  return challengesWithMood;
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
    .select("id, day_number, description, resources, metric, completed, date")
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
