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
import { Separator } from "@/components/ui/separator";

type PlanMode = "ai" | "manual" | null;

interface TaskDraft {
  day: number;
  description: string;
  resource_url: string;
}

export default function NewChallengePage() {
  const router = useRouter();
  const [step, setStep] = useState<"goal" | "plan" | "review">("goal");

  // Goal step
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState(14);

  // Plan step
  const [planMode, setPlanMode] = useState<PlanMode>(null);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  function initEmptyTasks(numDays: number) {
    return Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      description: "",
      resource_url: "",
    }));
  }

  async function generateWithAI() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, duration_days: days }),
      });
      if (!res.ok) throw new Error();
      const { tasks: generated } = await res.json();
      setTasks(
        generated.map((t: { day: number; description: string; resource_url: string | null }) => ({
          ...t,
          resource_url: t.resource_url ?? "",
        }))
      );
      setStep("review");
    } catch {
      toast.error("Nie udało się wygenerować planu. Spróbuj ponownie.");
    } finally {
      setGenerating(false);
    }
  }

  function startManual() {
    setTasks(initEmptyTasks(days));
    setPlanMode("manual");
    setStep("review");
  }

  function updateTask(index: number, field: keyof TaskDraft, value: string) {
    setTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function createChallenge() {
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
            resource_url: t.resource_url || null,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
    } catch {
      toast.error("Nie udało się zapisać wyzwania. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  async function askAIToReview() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/review-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tasks }),
      });
      if (!res.ok) throw new Error();
      const { tasks: reviewed } = await res.json();
      setTasks(
        reviewed.map((t: { day: number; description: string; resource_url: string | null }) => ({
          ...t,
          resource_url: t.resource_url ?? "",
        }))
      );
      toast.success("AI poprawiło Twój plan!");
    } catch {
      toast.error("Nie udało się sprawdzić planu. Spróbuj ponownie.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nowe wyzwanie</h1>
        <p className="text-muted-foreground">
          {step === "goal" && "Co chcesz spróbować?"}
          {step === "plan" && "Jak chcesz stworzyć plan?"}
          {step === "review" && "Twój plan — przejrzyj i dostosuj"}
        </p>
      </div>

      {/* Step 1: Goal */}
      {step === "goal" && (
        <Card>
          <CardHeader>
            <CardTitle>Twój cel</CardTitle>
            <CardDescription>
              Nie musi być idealny. Po prostu napisz co Cię ciekawi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Nazwa wyzwania</Label>
              <Input
                id="title"
                placeholder="np. Zaczynam rysować, Medytacja, Bieganie..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opisz to trochę więcej (opcjonalne)</Label>
              <Textarea
                id="description"
                placeholder="np. Chcę spróbować rysować codziennie, ale nie wiem od czego zacząć..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Na ile dni? (minimum 7)</Label>
              <Input
                id="days"
                type="number"
                min={7}
                max={30}
                value={days}
                onChange={(e) =>
                  setDays(Math.max(7, parseInt(e.target.value) || 7))
                }
              />
              <p className="text-xs text-muted-foreground">
                Polecamy 14 dni na start — wystarczająco żeby poczuć, za krótko
                żeby się wypalić.
              </p>
            </div>
            <Button
              onClick={() => setStep("plan")}
              disabled={!title.trim()}
              className="w-full"
            >
              Dalej
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Choose plan mode */}
      {step === "plan" && (
        <div className="space-y-4">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
            onClick={() => {
              setPlanMode("ai");
              generateWithAI();
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg">AI stworzy plan za mnie</CardTitle>
              <CardDescription>
                Na podstawie Twojego celu przygotujemy plan krok po kroku —
                od najprostszych zadań do trudniejszych.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
            onClick={startManual}
          >
            <CardHeader>
              <CardTitle className="text-lg">Sam/sama napiszę plan</CardTitle>
              <CardDescription>
                Wpisz swoje zadania na każdy dzień. Potem możesz poprosić AI o
                sprawdzenie.
              </CardDescription>
            </CardHeader>
          </Card>

          <Button
            variant="ghost"
            onClick={() => setStep("goal")}
            className="w-full"
          >
            Wróć
          </Button>

          {generating && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">
                AI przygotowuje Twój plan...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & edit plan */}
      {step === "review" && (
        <div className="space-y-4">
          {planMode === "manual" && (
            <Button
              variant="outline"
              onClick={askAIToReview}
              disabled={generating}
              className="w-full"
            >
              {generating ? "AI sprawdza..." : "Poproś AI o sprawdzenie planu"}
            </Button>
          )}

          <div className="space-y-3">
            {tasks.map((task, i) => (
              <Card key={task.day}>
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Dzień {task.day}
                  </p>
                  <Textarea
                    value={task.description}
                    onChange={(e) =>
                      updateTask(i, "description", e.target.value)
                    }
                    placeholder={`Co zrobić w dniu ${task.day}?`}
                    rows={2}
                    className="resize-none"
                  />
                  <Input
                    value={task.resource_url}
                    onChange={(e) =>
                      updateTask(i, "resource_url", e.target.value)
                    }
                    placeholder="Link do materiału (opcjonalne)"
                    type="url"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep("plan")}
              className="flex-1"
            >
              Wróć
            </Button>
            <Button
              onClick={createChallenge}
              disabled={saving || tasks.some((t) => !t.description.trim())}
              className="flex-1"
            >
              {saving ? "Zapisywanie..." : "Rozpocznij wyzwanie!"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
