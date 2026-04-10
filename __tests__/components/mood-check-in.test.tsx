import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MoodCheckIn } from "@/components/mood-check-in";

describe("MoodCheckIn", () => {
  it("początkowo wyświetla zwinięty przycisk", () => {
    render(<MoodCheckIn taskId="1" />);
    expect(screen.getByText(/jak się dziś czujesz/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /zapisz/i })).not.toBeInTheDocument();
  });

  it("po kliknięciu rozszerza formularz z wyborem nastroju", () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    expect(screen.getByRole("button", { name: /zapisz/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
  });

  it("przycisk Zapisz jest nieaktywny bez wybranego nastroju", () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    expect(screen.getByRole("button", { name: /zapisz/i })).toBeDisabled();
  });

  it("przycisk Zapisz aktywuje się po wybraniu nastroju", () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    fireEvent.click(screen.getByText("😊")); // score 5 — Super
    expect(screen.getByRole("button", { name: /zapisz/i })).toBeEnabled();
  });

  it("Anuluj zwija formularz z powrotem", () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    fireEvent.click(screen.getByRole("button", { name: /anuluj/i }));
    expect(screen.queryByRole("button", { name: /zapisz/i })).not.toBeInTheDocument();
  });

  it("po zapisaniu wyświetla potwierdzenie", async () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    fireEvent.click(screen.getByText("🙂")); // score 4 — Dobrze
    fireEvent.click(screen.getByRole("button", { name: /zapisz/i }));
    await waitFor(() => {
      expect(screen.getByText(/zapisane/i)).toBeInTheDocument();
    });
  });

  it("wyświetla wszystkie 5 opcji nastroju", () => {
    render(<MoodCheckIn taskId="1" />);
    fireEvent.click(screen.getByText(/jak się dziś czujesz/i));
    const emojis = ["😔", "😕", "😐", "🙂", "😊"];
    emojis.forEach((emoji) => {
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });
});
