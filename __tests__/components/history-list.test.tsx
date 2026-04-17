import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { HistoryItem } from "@/lib/challenge-data";

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
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { HistoryList } from "@/app/(app)/history/HistoryList";

const items: HistoryItem[] = [
  {
    id: "c-1",
    title: "Zaczynam rysować",
    duration_days: 14,
    completed_days: 3,
    status: "active",
    start_date: "2026-04-01",
    end_date: "2026-04-14",
    overall_feeling: null,
    wants_to_continue: null,
  },
  {
    id: "c-2",
    title: "Medytacja poranna",
    duration_days: 7,
    completed_days: 7,
    status: "completed",
    start_date: "2026-03-01",
    end_date: "2026-03-07",
    overall_feeling: 4,
    wants_to_continue: true,
  },
];

describe("HistoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("wyświetla tytuły obu wyzwań", () => {
    render(<HistoryList items={items} />);
    expect(screen.getByText("Zaczynam rysować")).toBeInTheDocument();
    expect(screen.getByText("Medytacja poranna")).toBeInTheDocument();
  });

  it("pokazuje polskie etykiety statusu", () => {
    render(<HistoryList items={items} />);
    expect(screen.getByText("Aktywne")).toBeInTheDocument();
    expect(screen.getByText("Ukończone")).toBeInTheDocument();
  });

  it("każda karta ma przycisk usuwania z aria-label", () => {
    render(<HistoryList items={items} />);
    const deleteButtons = screen.getAllByRole("button", {
      name: /usuń wyzwanie/i,
    });
    expect(deleteButtons).toHaveLength(2);
  });

  it("ukrywa element po potwierdzeniu usunięcia", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<HistoryList items={items} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: /usuń wyzwanie/i,
    });
    fireEvent.click(deleteButtons[0]);

    const confirmButton = await screen.findByRole("button", { name: /^usuń$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/challenges/c-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Zaczynam rysować")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Medytacja poranna")).toBeInTheDocument();
  });
});
