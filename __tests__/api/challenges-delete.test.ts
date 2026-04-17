import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
        delete: () => ({
          eq: mockDelete,
        }),
      }),
    })
  ),
}));

// Import after mocks
const { DELETE } = await import("@/app/api/challenges/[id]/route");

function makeRequest() {
  return new Request("http://localhost/api/challenges/abc", {
    method: "DELETE",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockUser = { id: "user-1", email: "test@test.com" };

describe("DELETE /api/challenges/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeRequest(), makeParams("abc"));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy wyzwanie nie istnieje", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await DELETE(makeRequest(), makeParams("abc"));
    expect(res.status).toBe(404);
  });

  it("zwraca 200 po udanym usunięciu", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "abc" }, error: null });
    mockDelete.mockResolvedValue({ error: null });
    const res = await DELETE(makeRequest(), makeParams("abc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
