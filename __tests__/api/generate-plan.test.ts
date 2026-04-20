import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateChallengePlan = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai", () => ({
  generateChallengePlan: mockGenerateChallengePlan,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
  ),
}));

// Import after mocks
const { POST } = await import("@/app/api/ai/generate-plan/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", email: "test@test.com" };

const mockTasks = [
  { day: 1, description: "Przejedź 1 km w wolnym tempie.", resource_url: null },
  { day: 2, description: "Przejedź 2 km w wolnym tempie.", resource_url: null },
];

describe("POST /api/ai/generate-plan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      makeRequest({ title: "rower", duration_days: 14 })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak title", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({ duration_days: 14 }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy duration_days < 7", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({ title: "rower", duration_days: 3 })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca plan gdy context jest pominięty (kompatybilność wsteczna)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockGenerateChallengePlan.mockResolvedValue(mockTasks);
    const res = await POST(
      makeRequest({ title: "rower", duration_days: 14 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toEqual(mockTasks);
    expect(mockGenerateChallengePlan).toHaveBeenCalledWith(
      "rower",
      "",
      14,
      undefined
    );
  });

  it("przekazuje context do generateChallengePlan", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockGenerateChallengePlan.mockResolvedValue(mockTasks);
    const ctx = { level: "Podstawy", intent: "weekendy" };
    const res = await POST(
      makeRequest({
        title: "rower",
        description: "kontekst",
        duration_days: 14,
        context: ctx,
      })
    );
    expect(res.status).toBe(200);
    expect(mockGenerateChallengePlan).toHaveBeenCalledWith(
      "rower",
      "kontekst",
      14,
      ctx
    );
  });

  it("zwraca 400 gdy context jest stringiem", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({
        title: "rower",
        duration_days: 14,
        context: "not an object",
      })
    );
    expect(res.status).toBe(400);
    expect(mockGenerateChallengePlan).not.toHaveBeenCalled();
  });

  it("zwraca 400 gdy context jest tablicą", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({
        title: "rower",
        duration_days: 14,
        context: ["a", "b"],
      })
    );
    expect(res.status).toBe(400);
    expect(mockGenerateChallengePlan).not.toHaveBeenCalled();
  });

  it("zwraca 400 gdy context ma wartości nie-stringowe", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({
        title: "rower",
        duration_days: 14,
        context: { level: 5 },
      })
    );
    expect(res.status).toBe(400);
    expect(mockGenerateChallengePlan).not.toHaveBeenCalled();
  });

  it("zwraca 500 gdy generateChallengePlan rzuca błąd", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockGenerateChallengePlan.mockRejectedValue(new Error("AI failed"));
    const res = await POST(
      makeRequest({ title: "rower", duration_days: 14 })
    );
    expect(res.status).toBe(500);
  });
});
