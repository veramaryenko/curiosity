import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDiscoverInterests = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai", () => ({
  discoverInterests: mockDiscoverInterests,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
  ),
}));

// Import after mocks
const { POST } = await import("@/app/api/ai/discover-interests/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai/discover-interests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", email: "test@test.com" };

const mockSuggestions = [
  { title: "Akwarele dla początkujących", description: "Maluj codziennie.", emoji: "🎨", estimated_minutes: 20 },
  { title: "Codzienne bieganie", description: "Zacznij od 15 minut.", emoji: "🏃", estimated_minutes: 15 },
];

describe("POST /api/ai/discover-interests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ freeText: "malowanie" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy freeText pusty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({ freeText: "  " }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy freeText za długi (>500 znaków)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({ freeText: "a".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy brak freeText", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("zwraca sugestie przy poprawnym żądaniu", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockDiscoverInterests.mockResolvedValue(mockSuggestions);
    const res = await POST(makeRequest({ freeText: "malowanie" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual(mockSuggestions);
  });

  it("wywołuje discoverInterests z przyciętym tekstem", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockDiscoverInterests.mockResolvedValue(mockSuggestions);
    await POST(makeRequest({ freeText: "  malowanie  " }));
    expect(mockDiscoverInterests).toHaveBeenCalledWith("malowanie");
  });

  it("zwraca 500 gdy AI rzuca błąd", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockDiscoverInterests.mockRejectedValue(new Error("AI did not return valid JSON"));
    const res = await POST(makeRequest({ freeText: "coś" }));
    expect(res.status).toBe(500);
  });
});
