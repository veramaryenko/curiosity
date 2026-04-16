export type ChallengeStatus = "active" | "completed" | "abandoned";

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface Challenge {
  id: string;
  user_id: string;
  title: string;
  description: string;
  duration_days: number;
  status: ChallengeStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface DailyTask {
  id: string;
  challenge_id: string;
  day_number: number;
  description: string;
  resource_url: string | null;
  /**
   * Concrete, measurable goal for the day (e.g. "200 słów", "15 minut").
   * Null for tasks created before the discovery-plan feature landed.
   */
  metric: string | null;
  completed: boolean;
  date: string;
}

export interface MoodEntry {
  id: string;
  task_id: string;
  challenge_id: string;
  user_id: string;
  mood_score: MoodScore;
  note: string | null;
  created_at: string;
}

export interface Reflection {
  id: string;
  challenge_id: string;
  user_id: string;
  overall_feeling: MoodScore;
  liked: string;
  disliked: string;
  obstacles: string;
  wants_to_continue: boolean;
  ai_insight: string | null;
  created_at: string;
}

export interface InterestSuggestion {
  title: string;
  description: string;
  emoji: string;
  estimated_minutes: number;
}

/** One day in a discovery plan — concrete action + measurable goal. */
export interface DiscoveryPlanTask {
  day: number;
  description: string;
  metric: string | null;
  resource_url: string | null;
}

/** Full plan returned by the discovery endpoint. */
export interface DiscoveryPlanResult {
  category: string;
  tasks: DiscoveryPlanTask[];
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  reminder_time: string; // HH:MM format
  email_enabled: boolean;
}
