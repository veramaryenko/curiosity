import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClarifyGoal = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai", () => ({
  clarifyGoal: mockClarifyGoal,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
  ),
}));

// Import after mocks
const { POST } = await import("@/app/api/ai/clarify-goal/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai/clarify-goal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", email: "test@test.com" };

const mockResult = {
  category: "Jazda na rowerze",
  questions: [
    {
      id: "level",
      question: "Jak oceniasz swój poziom?",
      type: "single",
      options: ["Nigdy nie jeździłam/em", "Podstawy", "Średni", "Zaawansowany"],
    },
    {
      id: "intent",
      question: "W jakim celu chcesz jeździć?",
      type: "text",
      placeholder: "np. dojazdy do pracy",
    },
  ],
};

const mockEmptyResult = {
  category: "Czytanie",
  questions: [],
};

describe("POST /api/ai/clarify-goal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ title: "rower" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak title", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy title pusty / same białe znaki", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({ title: "   " }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy title za długi (>200 znaków)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({ title: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy description za długi (>1000 znaków)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(
      makeRequest({ title: "rower", description: "a".repeat(1001) })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca kategorię i pytania przy poprawnym żądaniu", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockClarifyGoal.mockResolvedValue(mockResult);
    const res = await POST(
      makeRequest({ title: "rower", description: "chcę zacząć jeździć" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockResult);
  });

  it("zwraca pustą listę pytań gdy cel jest jednoznaczny", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockClarifyGoal.mockResolvedValue(mockEmptyResult);
    const res = await POST(
      makeRequest({ title: "przeczytać 3 książki w 30 dni" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockEmptyResult);
    expect(body.questions).toEqual([]);
  });

  it("wywołuje clarifyGoal z przyciętym title i description ?? \"\"", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockClarifyGoal.mockResolvedValue(mockEmptyResult);
    await POST(makeRequest({ title: "  rower  " }));
    expect(mockClarifyGoal).toHaveBeenCalledWith("rower", "");
  });

  it("przekazuje description gdy podany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockClarifyGoal.mockResolvedValue(mockEmptyResult);
    await POST(makeRequest({ title: "rower", description: "weekendy" }));
    expect(mockClarifyGoal).toHaveBeenCalledWith("rower", "weekendy");
  });

  it("zwraca 500 gdy clarifyGoal rzuca błąd", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockClarifyGoal.mockRejectedValue(new Error("AI did not return valid JSON"));
    const res = await POST(makeRequest({ title: "rower" }));
    expect(res.status).toBe(500);
  });
});
