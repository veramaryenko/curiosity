"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InterestCard } from "@/components/interest-card";
import type { InterestSuggestion } from "@/types";

type Step = "welcome" | "discover" | "start";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");

  // discover step
  const [freeText, setFreeText] = useState("");
  const [suggestions, setSuggestions] = useState<InterestSuggestion[]>([]);
  const [selected, setSelected] = useState<InterestSuggestion | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // start step
  const [challengeTitle, setChallengeTitle] = useState("");
  const [days, setDays] = useState(14);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError(null);
    setSuggestions([]);
    setSelected(null);

    try {
      const res = await fetch("/api/ai/discover-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch {
      setDiscoverError(
        "Coś poszło nie tak. Spróbuj ponownie lub opisz inaczej."
      );
    } finally {
      setDiscovering(false);
    }
  }

  function handleSelectSuggestion(s: InterestSuggestion) {
    setSelected(s);
    setChallengeTitle(s.title);
  }

  async function handleStart() {
    if (!selected) return;
    setStarting(true);
    setStartError(null);

    try {
      // 1. Generate plan
      const planRes = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle,
          description: selected.description,
          duration_days: days,
        }),
      });

      if (!planRes.ok) throw new Error("plan");
      const { tasks } = await planRes.json();

      // 2. Save challenge + tasks
      const saveRes = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle,
          description: selected.description,
          duration_days: days,
          tasks,
        }),
      });

      if (!saveRes.ok) throw new Error("save");

      // 3. Redirect
      router.push("/dashboard");
    } catch {
      setStartError(
        "Nie udało się utworzyć wyzwania. Spróbuj ponownie."
      );
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        {/* Step 1 — Welcome */}
        {step === "welcome" && (
          <div className="space-y-8 text-center">
            <div className="space-y-3">
              <p className="text-2xl font-bold text-primary">Curiosity</p>
              <h1 className="text-3xl font-bold leading-tight">
                Cześć! Jesteś tutaj, bo coś Cię ciekawi.
              </h1>
              <p className="text-muted-foreground">
                Za chwilę znajdziemy coś dla Ciebie i ułożymy plan krok po
                kroku.
              </p>
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep("discover")}>
              Zaczynamy →
            </Button>
            <Link
              href="/challenge/discover"
              className="block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Już wiem co chcę robić → zacznij nową przygodę
            </Link>
          </div>
        )}

        {/* Step 2 — Discover */}
        {step === "discover" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Co ostatnio Cię zaciekawiło?</h1>
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder="Może ser rzemieślniczy, może bieganie, może akwarele… Napisz cokolwiek — nawet jedno słowo."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={3}
                className="resize-none"
                autoFocus
              />
              <Button
                className="w-full"
                onClick={handleDiscover}
                disabled={!freeText.trim() || discovering}
              >
                {discovering ? "AI szuka pomysłów dla Ciebie…" : "Pokaż mi pomysły"}
              </Button>
            </div>

            {discovering && (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {discoverError && (
              <p className="text-sm text-destructive">{discoverError}</p>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <InterestCard
                    key={i}
                    suggestion={s}
                    selected={selected === s}
                    dimmed={selected !== null && selected !== s}
                    onClick={() => handleSelectSuggestion(s)}
                  />
                ))}
              </div>
            )}

            {selected && (
              <Button className="w-full" onClick={() => setStep("start")}>
                To to! Dalej →
              </Button>
            )}
          </div>
        )}

        {/* Step 3 — Start */}
        {step === "start" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Prawie gotowe!</h1>
              <p className="text-muted-foreground">
                AI ułoży Ci plan — możesz go potem edytować.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nazwa wyzwania</Label>
                <Input
                  id="title"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Na ile dni?</Label>
                <Input
                  id="days"
                  type="number"
                  min={7}
                  max={30}
                  value={days}
                  onChange={(e) =>
                    setDays(Math.max(7, Math.min(30, parseInt(e.target.value) || 14)))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Polecamy 14 dni na start — wystarczająco żeby poczuć.
                </p>
              </div>
            </div>

            {startError && (
              <p className="text-sm text-destructive">{startError}</p>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={starting || !challengeTitle.trim()}
            >
              {starting ? "AI robi plan…" : "AI robi plan i startujemy! 🚀"}
            </Button>

            <button
              onClick={() => setStep("discover")}
              className="w-full text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Wróć do wyboru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
