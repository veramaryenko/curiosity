"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DiscoveryPlanTask } from "@/types";

type Step = "goal" | "duration" | "plan";

const DURATION_PRESETS = [7, 14, 21, 30] as const;

export default function DiscoverPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");

  // goal step
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // duration step
  const [days, setDays] = useState<number>(14);

  // plan step
  const [category, setCategory] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DiscoveryPlanTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function callGeneratePlan(): Promise<boolean> {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-discovery-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          duration_days: days,
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        category: string;
        tasks: DiscoveryPlanTask[];
      };
      setCategory(data.category);
      setTasks(data.tasks);
      return true;
    } catch {
      toast.error("Nie udało się wygenerować planu. Spróbuj jeszcze raz.");
      return false;
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate() {
    const ok = await callGeneratePlan();
    if (ok) setStep("plan");
  }

  async function handleRegenerate() {
    await callGeneratePlan();
  }

  async function startChallenge() {
    setSaving(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          duration_days: days,
          tasks: tasks.map((t) => ({
            day: t.day,
            description: t.description,
            metric: t.metric,
            resource_url: t.resource_url,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
    } catch {
      toast.error("Nie udało się zapisać wyzwania. Spróbuj ponownie.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nowa przygoda</h1>
        <p className="text-muted-foreground">
          {step === "goal" && "Co chcesz spróbować?"}
          {step === "duration" && "Ile dni chcesz posmakować?"}
          {step === "plan" && "Twój plan — przejrzyj i startuj"}
        </p>
      </div>

      {/* Step 1: Goal */}
      {step === "goal" && (
        <Card>
          <CardHeader>
            <CardTitle>Twój cel</CardTitle>
            <CardDescription>
              Napisz krótko co Cię ciekawi. AI ułoży konkretny plan dzień po dniu —
              z mierzalnymi celami i linkami do materiałów.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Co chcesz spróbować?</Label>
              <Textarea
                id="title"
                placeholder="np. chcę pisać książkę, nauczyć się hiszpańskiego, zacząć biegać..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                className="resize-none"
                autoFocus
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Dodaj więcej szczegółów (opcjonalne)
              </Label>
              <Textarea
                id="description"
                placeholder="np. nigdy nie pisałam, chcę zacząć od czegoś małego..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
                maxLength={1000}
              />
            </div>
            <Button
              onClick={() => setStep("duration")}
              disabled={!title.trim()}
              className="w-full"
            >
              Dalej →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Duration */}
      {step === "duration" && (
        <Card>
          <CardHeader>
            <CardTitle>Ile dni chcesz posmakować tego skilla?</CardTitle>
            <CardDescription>
              Polecamy 14 dni na start — wystarczająco żeby poczuć, za krótko
              żeby się wypalić.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDays(preset)}
                  className={`rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                    days === preset
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                  type="button"
                >
                  {preset} dni
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="custom-days"
                className="text-xs text-muted-foreground"
              >
                lub własna liczba (7–30)
              </Label>
              <Input
                id="custom-days"
                type="number"
                min={7}
                max={30}
                value={days}
                onChange={(e) => {
                  const n = parseInt(e.target.value) || 7;
                  setDays(Math.max(7, Math.min(30, n)));
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep("goal")}
                className="flex-1"
                disabled={generating}
              >
                ← Wróć
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1"
              >
                {generating ? "AI układa plan..." : "Generuj plan →"}
              </Button>
            </div>
            {generating && (
              <div className="flex justify-center pt-2">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Plan preview */}
      {step === "plan" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {days} dni · {tasks.length} zadań
              </p>
              {category && (
                <Badge variant="secondary" className="mt-1">
                  {category}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.day}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Dzień {task.day}
                    </p>
                    {task.metric && (
                      <Badge variant="outline" className="text-xs">
                        {task.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{task.description}</p>
                  {task.resource_url && (
                    <a
                      href={task.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-primary underline underline-offset-2"
                    >
                      {task.resource_url.includes("youtube.com")
                        ? "Szukaj na YouTube ↗"
                        : "Szukaj w Google ↗"}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <Button
              onClick={startChallenge}
              disabled={saving || generating || tasks.length === 0}
              size="lg"
              className="w-full"
            >
              {saving ? "Zapisywanie..." : "Startuję! 🚀"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStep("duration")}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                disabled={generating || saving}
              >
                ← Wróć
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={generating || saving}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {generating ? "generuję..." : "wygeneruj inny plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
