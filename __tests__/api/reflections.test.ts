import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockGenerateInsight = vi.hoisted(() => vi.fn());
const mockChallengeMaybeSingle = vi.hoisted(() => vi.fn());
const mockMoodSelect = vi.hoisted(() => vi.fn());
const mockReflectionInsert = vi.hoisted(() => vi.fn());
const mockReflectionMaybeSingle = vi.hoisted(() => vi.fn());
const mockChallengeUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai", () => ({
  generateReflectionInsight: mockGenerateInsight,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: (table: string) => {
        if (table === "challenges") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: mockChallengeMaybeSingle,
                }),
              }),
            }),
            update: (payload: unknown) => {
              mockChallengeUpdate(payload);
              return {
                eq: () => Promise.resolve({ error: null }),
              };
            },
          };
        }
        if (table === "mood_entries") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => mockMoodSelect(),
              }),
            }),
          };
        }
        if (table === "reflections") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: mockReflectionMaybeSingle,
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: mockReflectionInsert,
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    })
  ),
}));

const { POST } = await import("@/app/api/reflections/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reflections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", email: "test@test.com" };

const validBody = {
  challenge_id: "ch-1",
  overall_feeling: 4,
  liked: "spoko",
  disliked: "",
  obstacles: "",
  wants_to_continue: true,
};

describe("POST /api/reflections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 dla niepoprawnych danych", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({ ...validBody, overall_feeling: 9 })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 200 i insight przy poprawnym żądaniu", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockChallengeMaybeSingle.mockResolvedValue({
      data: { id: "ch-1", title: "Akwarele" },
      error: null,
    });
    mockReflectionMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockMoodSelect.mockResolvedValue({ data: [], error: null });
    mockGenerateInsight.mockResolvedValue("Świetna robota!");
    mockReflectionInsert.mockResolvedValue({
      data: { ai_insight: "Świetna robota!" },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ insight: "Świetna robota!" });
    expect(mockChallengeUpdate).toHaveBeenCalledWith({ status: "completed" });
  });

  it("zwraca istniejący insight bez wywołania AI gdy refleksja już istnieje", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockChallengeMaybeSingle.mockResolvedValue({
      data: { id: "ch-1", title: "Akwarele" },
      error: null,
    });
    mockReflectionMaybeSingle.mockResolvedValue({
      data: { ai_insight: "Poprzedni insight" },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ insight: "Poprzedni insight" });
    expect(mockGenerateInsight).not.toHaveBeenCalled();
    expect(mockReflectionInsert).not.toHaveBeenCalled();
    expect(mockChallengeUpdate).not.toHaveBeenCalled();
  });
});
