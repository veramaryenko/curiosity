import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockCreateAdminClient = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

const { POST } = await import("@/app/api/challenges/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/challenges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: "Nowe wyzwanie",
  description: "Opis",
  duration_days: 2,
  tasks: [
    {
      day: 1,
      description: "Dzien 1",
      resources: {
        video: {
          url: "https://www.youtube.com/watch?v=abc",
          title: "Tytuł",
          channel: "Kanał",
          thumbnail: null,
          published_at: null,
        },
        article: { url: "https://example.com/art", title: "Artykuł", source: "example.com" },
      },
      metric: null,
    },
    { day: 2, description: "Dzien 2", resources: null, metric: null },
  ],
};

describe("POST /api/challenges", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("still creates a challenge when service-role rollback config is missing", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "challenge-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const challengeInsert = vi.fn().mockReturnValue({ select });
    const taskInsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "challenges") {
        return { insert: challengeInsert };
      }

      if (table === "daily_tasks") {
        return { insert: taskInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    expect(challengeInsert).toHaveBeenCalled();
    expect(taskInsert).toHaveBeenCalled();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("falls back to a soft delete when task creation fails without admin rollback config", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "challenge-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const challengeInsert = vi.fn().mockReturnValue({ select });
    const taskInsert = vi.fn().mockResolvedValue({
      error: { message: "insert failed" },
    });
    const softDeleteIs = vi.fn().mockResolvedValue({ error: null });
    const softDeleteEqUser = vi.fn().mockReturnValue({ is: softDeleteIs });
    const softDeleteEqId = vi.fn().mockReturnValue({ eq: softDeleteEqUser });
    const challengeUpdate = vi.fn().mockReturnValue({ eq: softDeleteEqId });

    mockFrom.mockImplementation((table: string) => {
      if (table === "challenges") {
        return {
          insert: challengeInsert,
          update: challengeUpdate,
        };
      }

      if (table === "daily_tasks") {
        return { insert: taskInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    expect(challengeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    expect(softDeleteEqId).toHaveBeenCalledWith("id", "challenge-1");
    expect(softDeleteEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(softDeleteIs).toHaveBeenCalledWith("deleted_at", null);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("uses the admin client for deterministic rollback when task creation fails", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const single = vi.fn().mockResolvedValue({
      data: { id: "challenge-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const challengeInsert = vi.fn().mockReturnValue({ select });
    const taskInsert = vi.fn().mockResolvedValue({
      error: { message: "insert failed" },
    });

    const adminEq = vi.fn().mockResolvedValue({ error: null });
    const adminDelete = vi.fn().mockReturnValue({ eq: adminEq });
    const adminFrom = vi.fn().mockReturnValue({ delete: adminDelete });

    mockFrom.mockImplementation((table: string) => {
      if (table === "challenges") {
        return { insert: challengeInsert };
      }

      if (table === "daily_tasks") {
        return { insert: taskInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateAdminClient.mockReturnValue({
      from: adminFrom,
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    expect(mockCreateAdminClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role",
      expect.any(Object)
    );
    expect(adminFrom).toHaveBeenCalledWith("challenges");
    expect(adminDelete).toHaveBeenCalled();
    expect(adminEq).toHaveBeenCalledWith("id", "challenge-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
