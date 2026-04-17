import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: mockMaybeSingle,
          }),
        }),
        upsert: mockUpsert,
      }),
    })
  ),
}));

const { GET, PUT } = await import("@/app/api/notification-preferences/route");

function makePutRequest(body: unknown) {
  return new Request("http://localhost/api/notification-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", email: "test@test.com" };

describe("/api/notification-preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET zwraca 401 gdy użytkownik niezalogowany", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET zwraca domyślne wartości gdy brak wiersza", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ reminder_time: "09:00", email_enabled: true });
  });

  it("PUT zwraca 400 dla niepoprawnych danych", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const res = await PUT(
      makePutRequest({ reminder_time: "25:00", email_enabled: true })
    );
    expect(res.status).toBe(400);
  });

  it("PUT zwraca 200 przy poprawnym zapisie", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockUpsert.mockResolvedValue({ error: null });
    const res = await PUT(
      makePutRequest({ reminder_time: "08:30", email_enabled: false })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "user-1", reminder_time: "08:30", email_enabled: false },
      { onConflict: "user_id" }
    );
  });
});
