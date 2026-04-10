import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock @supabase/ssr
const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { updateSession } from "@/lib/supabase/middleware";

function makeRequest(pathname: string) {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

describe("updateSession — przekierowania", () => {
  beforeEach(() => vi.clearAllMocks());

  it("przekierowuje niezalogowanego użytkownika z /dashboard na /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("przekierowuje niezalogowanego użytkownika z /challenge/1 na /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/challenge/1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("przekierowuje niezalogowanego użytkownika z /history na /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/history"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("przekierowuje niezalogowanego użytkownika z /settings na /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/settings"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("nie przekierowuje niezalogowanego użytkownika z publicznej strony /", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/"));
    expect(response.status).not.toBe(307);
  });

  it("nie przekierowuje niezalogowanego użytkownika z /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/auth/login"));
    expect(response.status).not.toBe(307);
  });

  it("przekierowuje zalogowanego użytkownika z /auth/login na /dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "abc", email: "test@test.com" } } });
    const response = await updateSession(makeRequest("/auth/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("przepuszcza zalogowanego użytkownika na /dashboard bez przekierowania", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "abc" } } });
    const response = await updateSession(makeRequest("/dashboard"));
    expect(response.status).not.toBe(307);
  });
});
