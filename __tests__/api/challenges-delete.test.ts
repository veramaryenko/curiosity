import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

const { DELETE } = await import("@/app/api/challenges/[id]/route");

function makeContext(id = "challenge-1") {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("DELETE /api/challenges/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await DELETE(new Request("http://localhost"), makeContext());

    expect(response.status).toBe(401);
  });

  it("returns 404 when the challenge is already soft-deleted or missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn();

    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle,
            }),
          }),
        }),
      }),
      update,
    }));

    const response = await DELETE(new Request("http://localhost"), makeContext());

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("soft-deletes without selecting after the update", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "challenge-1" },
      error: null,
    });
    const updateIs = vi.fn().mockResolvedValue({ error: null });
    const updateEqUser = vi.fn().mockReturnValue({ is: updateIs });
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqUser });
    const update = vi.fn().mockReturnValue({ eq: updateEqId });

    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle,
            }),
          }),
        }),
      }),
      update,
    }));

    const response = await DELETE(new Request("http://localhost"), makeContext());

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    expect(updateEqId).toHaveBeenCalledWith("id", "challenge-1");
    expect(updateEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateIs).toHaveBeenCalledWith("deleted_at", null);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/history");
  });
});
