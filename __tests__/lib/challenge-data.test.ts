import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockGetTodayDateString = vi.hoisted(() => vi.fn());

vi.mock("@/lib/app-date", () => ({
  getTodayDateString: mockGetTodayDateString,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

const { getDashboardData } = await import("@/lib/challenge-data");

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTodayDateString.mockReturnValue("2026-04-16");
  });

  it("returns all active challenges with one selected dashboard task per challenge", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const challenges = [
      {
        id: "challenge-2",
        title: "Pisanie",
        description: "Codzienna praktyka",
        duration_days: 3,
        status: "active",
        start_date: "2026-04-15",
      },
      {
        id: "challenge-1",
        title: "Rysowanie",
        description: "Szkice",
        duration_days: 2,
        status: "active",
        start_date: "2026-04-16",
      },
      {
        id: "challenge-3",
        title: "Bez taskow",
        description: "",
        duration_days: 5,
        status: "active",
        start_date: "2026-04-16",
      },
    ];

    const tasks = [
      {
        id: "task-1-1",
        challenge_id: "challenge-1",
        day_number: 1,
        description: "10 minut szkicow",
        resource_url: null,
        metric: "10 minut",
        completed: false,
        date: "2026-04-16",
      },
      {
        id: "task-1-2",
        challenge_id: "challenge-1",
        day_number: 2,
        description: "20 minut szkicow",
        resource_url: null,
        metric: "20 minut",
        completed: false,
        date: "2026-04-17",
      },
      {
        id: "task-2-1",
        challenge_id: "challenge-2",
        day_number: 1,
        description: "Napisz 100 slow",
        resource_url: null,
        metric: "100 slow",
        completed: true,
        date: "2026-04-15",
      },
      {
        id: "task-2-2",
        challenge_id: "challenge-2",
        day_number: 2,
        description: "Napisz 150 slow",
        resource_url: "https://www.youtube.com/results?search_query=writing",
        metric: "150 slow",
        completed: false,
        date: "2026-04-17",
      },
      {
        id: "task-2-3",
        challenge_id: "challenge-2",
        day_number: 3,
        description: "Napisz 200 slow",
        resource_url: null,
        metric: "200 slow",
        completed: false,
        date: "2026-04-18",
      },
    ];

    const moodEntries = [
      {
        id: "mood-new",
        task_id: "task-2-2",
        mood_score: 5,
        note: "Poszlo dobrze",
      },
      {
        id: "mood-old",
        task_id: "task-2-2",
        mood_score: 3,
        note: "Starszy wpis",
      },
      {
        id: "mood-task-1",
        task_id: "task-1-1",
        mood_score: 4,
        note: "Jest okej",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "challenges") {
        const order = vi.fn().mockResolvedValue({ data: challenges, error: null });
        const is = vi.fn().mockReturnValue({ order });
        const eqStatus = vi.fn().mockReturnValue({ is });
        const eqUser = vi.fn().mockReturnValue({ eq: eqStatus });

        return {
          select: vi.fn().mockReturnValue({ eq: eqUser }),
        };
      }

      if (table === "daily_tasks") {
        const inByChallenge = vi.fn().mockResolvedValue({ data: tasks, error: null });

        return {
          select: vi.fn().mockReturnValue({ in: inByChallenge }),
        };
      }

      if (table === "mood_entries") {
        const order = vi.fn().mockResolvedValue({ data: moodEntries, error: null });
        const inByTask = vi.fn().mockReturnValue({ order });
        const eqUser = vi.fn().mockReturnValue({ in: inByTask });

        return {
          select: vi.fn().mockReturnValue({ eq: eqUser }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const data = await getDashboardData();

    expect(data).toHaveLength(2);
    expect(data.map((entry) => entry.challenge.id)).toEqual([
      "challenge-2",
      "challenge-1",
    ]);

    expect(data[0]).toMatchObject({
      challenge: { id: "challenge-2" },
      task: { id: "task-2-2", day_number: 2 },
      completedCount: 1,
      currentDay: 2,
      isComplete: false,
      moodEntry: { id: "mood-new", mood_score: 5, note: "Poszlo dobrze" },
    });
    expect(data[0].progress).toBeCloseTo(100 / 3);

    expect(data[1]).toMatchObject({
      challenge: { id: "challenge-1" },
      task: { id: "task-1-1", day_number: 1 },
      completedCount: 0,
      currentDay: 1,
      isComplete: false,
      moodEntry: { id: "mood-task-1", mood_score: 4, note: "Jest okej" },
    });
    expect(data[1].progress).toBe(0);
  });

  it("returns an empty list for unauthenticated users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const data = await getDashboardData();

    expect(data).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
