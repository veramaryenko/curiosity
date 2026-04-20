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
import type { ClarifyingQuestion } from "@/types";

type PlanMode = "ai" | "manual" | null;
type Step = "goal" | "plan" | "clarify" | "review";

interface TaskDraft {
  day: number;
  description: string;
  resource_url: string;
}

export default function NewChallengePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");

  // Goal step
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState(14);

  // Plan step
  const [planMode, setPlanMode] = useState<PlanMode>(null);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Clarify step
  const [category, setCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function initEmptyTasks(numDays: number) {
    return Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      description: "",
      resource_url: "",
    }));
  }

  async function generateWithAI(context: Record<string, string> = {}) {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          duration_days: days,
          context,
        }),
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
      toast.error(
        "Nie udało się wygenerować planu. Spróbuj ponownie albo napisz plan ręcznie."
      );
      setPlanMode(null);
    } finally {
      setGenerating(false);
    }
  }

  async function startAIFlow() {
    setPlanMode("ai");
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/clarify-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        category: string;
        questions: ClarifyingQuestion[];
      };
      if (data.questions.length === 0) {
        setCategory(data.category);
        setQuestions([]);
        setAnswers({});
        // Skip clarify entirely.
        await generateWithAI({});
        return;
      }
      setCategory(data.category);
      setQuestions(data.questions);
      setAnswers({});
      setStep("clarify");
    } catch {
      toast.error(
        "Nie udało się przygotować pytań. Spróbuj ponownie albo napisz plan ręcznie."
      );
      setPlanMode(null);
    } finally {
      setGenerating(false);
    }
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function allRequiredAnswered() {
    return questions
      .filter((q) => q.type === "single")
      .every((q) => (answers[q.id] ?? "").trim().length > 0);
  }

  async function submitClarify(skip: boolean) {
    const context = skip ? {} : answers;
    await generateWithAI(context);
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
    if (tasks.some((t) => !t.description.trim())) {
      toast.error("Uzupełnij opis każdego dnia zanim zapiszesz wyzwanie.");
      return;
    }

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
            resource_url: t.resource_url.trim() || null,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("Save challenge failed", res.status, body);
        throw new Error(`save ${res.status}`);
      }
      const data = (await res.json()) as { challenge_id: string };
      router.replace(`/challenge/${data.challenge_id}`);
      router.refresh();
    } catch (e) {
      console.error(e);
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
        body: JSON.stringify({
          title,
          tasks: tasks.map((t) => ({
            day: t.day,
            description: t.description,
          })),
        }),
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
          {step === "clarify" &&
            "Zanim ułożymy plan, dopowiedz parę rzeczy o sobie"}
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
            className={
              generating
                ? "opacity-50"
                : "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
            }
            onClick={() => {
              if (generating) return;
              startAIFlow();
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg">AI stworzy plan za mnie</CardTitle>
              <CardDescription>
                Najpierw zadamy Ci kilka pytań, a potem przygotujemy plan krok
                po kroku — od najprostszych zadań do trudniejszych.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={
              generating
                ? "opacity-50"
                : "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
            }
            onClick={() => {
              if (generating) return;
              startManual();
            }}
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
            disabled={generating}
            className="w-full"
          >
            Wróć
          </Button>

          {generating && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">
                {planMode === "ai"
                  ? "AI przygotowuje pytania..."
                  : "AI przygotowuje Twój plan..."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2.5: Clarify */}
      {step === "clarify" && (
        <div className="space-y-4">
          {category && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Wykryliśmy:
              </span>
              <Badge variant="secondary">{category}</Badge>
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.question}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.type === "single" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((option) => {
                        const selected = answers[q.id] === option;
                        return (
                          <Card
                            key={option}
                            className={
                              generating
                                ? "opacity-50"
                                : `cursor-pointer transition-all hover:shadow-sm ${
                                    selected
                                      ? "border-primary"
                                      : "hover:border-primary/50"
                                  }`
                            }
                            onClick={() => {
                              if (generating) return;
                              setAnswer(q.id, option);
                            }}
                          >
                            <CardContent className="p-3 text-sm">
                              {option}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "text" && (
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder ?? ""}
                      rows={2}
                      className="resize-none"
                      disabled={generating}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => submitClarify(false)}
              disabled={generating || !allRequiredAnswered()}
              className="w-full"
            >
              {generating ? "AI układa plan..." : "Dalej"}
            </Button>
            <Button
              variant="outline"
              onClick={() => submitClarify(true)}
              disabled={generating}
              className="w-full"
            >
              Pomiń pytania
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (generating) return;
                setPlanMode(null);
                setStep("plan");
              }}
              disabled={generating}
              className="w-full"
            >
              Wróć
            </Button>
          </div>

          {!allRequiredAnswered() && !generating && (
            <p className="text-center text-xs text-muted-foreground">
              Odpowiedz na pytania z opcjami, żeby przejść dalej. Pytania
              otwarte możesz pominąć.
            </p>
          )}

          {generating && (
            <div className="py-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">
                AI układa Twój plan...
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
              disabled={generating || tasks.some((t) => !t.description.trim())}
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
              disabled={saving}
              className="flex-1"
            >
              Wróć
            </Button>
            <Button
              onClick={createChallenge}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Zapisuję..." : "Rozpocznij wyzwanie!"}
            </Button>
          </div>
          {tasks.some((t) => !t.description.trim()) && (
            <p className="text-center text-xs text-muted-foreground">
              Uzupełnij opis każdego dnia, żeby zapisać wyzwanie.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
