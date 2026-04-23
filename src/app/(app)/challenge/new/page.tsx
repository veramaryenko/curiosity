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
import type { Resources } from "@/types";

type PlanMode = "ai" | "manual" | null;

interface TaskDraft {
  day: number;
  description: string;
  video_url: string;
  video_title: string;
  video_channel: string;
  article_url: string;
  article_title: string;
  article_source: string;
  showVideo: boolean;
  showArticle: boolean;
}

function draftToResources(task: TaskDraft): Resources | null {
  let video = null;
  let article = null;

  if (task.showVideo && task.video_url.trim() && task.video_title.trim() && task.video_channel.trim()) {
    video = {
      url: task.video_url.trim(),
      title: task.video_title.trim(),
      channel: task.video_channel.trim(),
      thumbnail: null,
      published_at: null,
    };
  }

  if (task.showArticle && task.article_url.trim() && task.article_title.trim() && task.article_source.trim()) {
    article = {
      url: task.article_url.trim(),
      title: task.article_title.trim(),
      source: task.article_source.trim(),
    };
  }

  if (!video && !article) return null;
  return { video, article };
}

function emptyDraft(day: number): TaskDraft {
  return {
    day,
    description: "",
    video_url: "",
    video_title: "",
    video_channel: "",
    article_url: "",
    article_title: "",
    article_source: "",
    showVideo: false,
    showArticle: false,
  };
}

function resourcesToDraft(resources: Resources | null): Partial<TaskDraft> {
  if (!resources) return {};
  return {
    showVideo: !!resources.video,
    video_url: resources.video?.url ?? "",
    video_title: resources.video?.title ?? "",
    video_channel: resources.video?.channel ?? "",
    showArticle: !!resources.article,
    article_url: resources.article?.url ?? "",
    article_title: resources.article?.title ?? "",
    article_source: resources.article?.source ?? "",
  };
}

export default function NewChallengePage() {
  const router = useRouter();
  const [step, setStep] = useState<"goal" | "plan" | "review">("goal");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState(14);

  const [planMode, setPlanMode] = useState<PlanMode>(null);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  function initEmptyTasks(numDays: number) {
    return Array.from({ length: numDays }, (_, i) => emptyDraft(i + 1));
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
        generated.map((t: { day: number; description: string; resources: Resources | null }) => ({
          ...emptyDraft(t.day),
          description: t.description,
          ...resourcesToDraft(t.resources),
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

  function startManual() {
    setTasks(initEmptyTasks(days));
    setPlanMode("manual");
    setStep("review");
  }

  function updateTask(index: number, field: keyof TaskDraft, value: string | boolean) {
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
            resources: draftToResources(t),
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
      setTasks((prev) =>
        reviewed.map((t: { day: number; description: string; resources: Resources | null }, i: number) => ({
          ...(prev[i] ?? emptyDraft(t.day)),
          description: t.description,
          ...resourcesToDraft(t.resources),
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
                AI przygotowuje Twój plan...
              </p>
            </div>
          )}
        </div>
      )}

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

                  {!task.showVideo ? (
                    <button
                      type="button"
                      onClick={() => updateTask(i, "showVideo", true)}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      + Dodaj film
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Film (opcjonalny)</p>
                        <button
                          type="button"
                          onClick={() => {
                            updateTask(i, "showVideo", false);
                            updateTask(i, "video_url", "");
                            updateTask(i, "video_title", "");
                            updateTask(i, "video_channel", "");
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          usuń
                        </button>
                      </div>
                      <Input
                        value={task.video_url}
                        onChange={(e) => updateTask(i, "video_url", e.target.value)}
                        placeholder="URL YouTube (https://youtube.com/watch?v=...)"
                        type="url"
                      />
                      <Input
                        value={task.video_title}
                        onChange={(e) => updateTask(i, "video_title", e.target.value)}
                        placeholder="Tytuł filmu"
                      />
                      <Input
                        value={task.video_channel}
                        onChange={(e) => updateTask(i, "video_channel", e.target.value)}
                        placeholder="Nazwa kanału"
                      />
                    </div>
                  )}

                  {!task.showArticle ? (
                    <button
                      type="button"
                      onClick={() => updateTask(i, "showArticle", true)}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      + Dodaj artykuł
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Artykuł (opcjonalny)</p>
                        <button
                          type="button"
                          onClick={() => {
                            updateTask(i, "showArticle", false);
                            updateTask(i, "article_url", "");
                            updateTask(i, "article_title", "");
                            updateTask(i, "article_source", "");
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          usuń
                        </button>
                      </div>
                      <Input
                        value={task.article_url}
                        onChange={(e) => updateTask(i, "article_url", e.target.value)}
                        placeholder="URL artykułu (https://...)"
                        type="url"
                      />
                      <Input
                        value={task.article_title}
                        onChange={(e) => updateTask(i, "article_title", e.target.value)}
                        placeholder="Tytuł artykułu"
                      />
                      <Input
                        value={task.article_source}
                        onChange={(e) => updateTask(i, "article_source", e.target.value)}
                        placeholder="Źródło (np. medium.com)"
                      />
                    </div>
                  )}
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
