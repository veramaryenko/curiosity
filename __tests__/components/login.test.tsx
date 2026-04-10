import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock Supabase client
const mockSignInWithOtp = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}));

import LoginPage from "@/app/auth/login/page";

describe("LoginPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderuje formularz z polem email", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wyślij link/i })).toBeInTheDocument();
  });

  it("przycisk jest wyłączony w trakcie ładowania", async () => {
    mockSignInWithOtp.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: /wyślij link/i }));
    expect(screen.getByRole("button", { name: /wysyłam/i })).toBeDisabled();
  });

  it("pokazuje stan po wysłaniu emaila", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: /wyślij link/i }));
    await waitFor(() => {
      expect(screen.getByText(/sprawdź pocztę/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/wysłaliśmy link do test@test\.com/i)).toBeInTheDocument();
  });

  it("wyświetla błąd gdy Supabase zwróci error", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: "Nieprawidłowy email" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "zly-email" } });
    fireEvent.submit(screen.getByRole("button", { name: /wyślij link/i }));
    await waitFor(() => {
      expect(screen.getByText("Nieprawidłowy email")).toBeInTheDocument();
    });
  });

  it("pozwala wrócić do formularza po wysłaniu", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: /wyślij link/i }));
    await waitFor(() => screen.getByText(/sprawdź pocztę/i));
    fireEvent.click(screen.getByRole("button", { name: /wyślij ponownie/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
