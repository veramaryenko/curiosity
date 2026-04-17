import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockSuccess = vi.hoisted(() => vi.fn());
const mockInfo = vi.hoisted(() => vi.fn());
const mockError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockSuccess,
    info: mockInfo,
    error: mockError,
  },
}));

import { HistoryList } from "@/app/(app)/history/HistoryList";

const challengeA = {
  challenge: {
    id: "challenge-1",
    title: "Wyzwanie A",
    duration_days: 7,
    status: "active" as const,
    start_date: "2026-04-01",
    end_date: "2026-04-07",
  },
  completedCount: 2,
  progress: 28,
};

const challengeB = {
  challenge: {
    id: "challenge-2",
    title: "Wyzwanie B",
    duration_days: 5,
    status: "completed" as const,
    start_date: "2026-04-08",
    end_date: "2026-04-12",
  },
  completedCount: 5,
  progress: 100,
};

describe("HistoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("removes the card and shows the empty state after a successful delete", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    render(<HistoryList initialChallenges={[challengeA]} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Usu. wyzwanie Wyzwanie A/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /^Usu./i }));

    await waitFor(() => {
      expect(screen.getByText(/Brak historii/i)).toBeInTheDocument();
    });

    expect(mockSuccess).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("treats 404 as already deleted and resynchronizes the UI", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Challenge not found" }), {
        status: 404,
      })
    );

    render(<HistoryList initialChallenges={[challengeA]} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Usu. wyzwanie Wyzwanie A/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /^Usu./i }));

    await waitFor(() => {
      expect(screen.queryByText("Wyzwanie A")).not.toBeInTheDocument();
    });

    expect(mockInfo).toHaveBeenCalledWith("To wyzwanie było już usunięte.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("accepts new initialChallenges after a refresh-driven rerender", () => {
    const { rerender } = render(<HistoryList initialChallenges={[challengeA]} />);

    expect(screen.getByText("Wyzwanie A")).toBeInTheDocument();

    rerender(<HistoryList initialChallenges={[challengeB]} />);

    expect(screen.queryByText("Wyzwanie A")).not.toBeInTheDocument();
    expect(screen.getByText("Wyzwanie B")).toBeInTheDocument();
  });
});
