"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MoodScore } from "@/types";
import { toast } from "sonner";

const moods: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: "😔", label: "Ciężko" },
  { score: 2, emoji: "😕", label: "Meh" },
  { score: 3, emoji: "😐", label: "Okej" },
  { score: 4, emoji: "🙂", label: "Dobrze" },
  { score: 5, emoji: "😊", label: "Super" },
];

interface MoodCheckInProps {
  taskId: string;
  initialMoodEntry?: {
    id: string;
    mood_score: MoodScore;
    note: string | null;
  } | null;
}

export function MoodCheckIn({
  taskId,
  initialMoodEntry = null,
}: MoodCheckInProps) {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<MoodScore | null>(
    initialMoodEntry?.mood_score ?? null
  );
  const [note, setNote] = useState(initialMoodEntry?.note ?? "");
  const [saved, setSaved] = useState(initialMoodEntry !== null);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function save() {
    if (!selectedMood) return;

    try {
      const response = await fetch("/api/mood-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          mood_score: selectedMood,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Nie udalo sie zapisac nastroju.");
      }

      setSaved(true);
      setExpanded(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Nie udalo sie zapisac nastroju. Sprobuj ponownie.");
    }
  }

  if (saved) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Zapisane! Dzięki, że podzieliłeś/aś się tym jak się czujesz.
        </CardContent>
      </Card>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent"
      >
        Jak się dziś czujesz? (opcjonalne)
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Jak się dziś czujesz?</CardTitle>
        <CardDescription>To opcjonalne — ale pomaga śledzić emocje</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-1">
          {moods.map((mood) => (
            <button
              key={mood.score}
              onClick={() => setSelectedMood(mood.score)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-2 text-sm transition-all ${
                selectedMood === mood.score
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "hover:bg-accent"
              }`}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs text-muted-foreground">{mood.label}</span>
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Chcesz coś dodać? (opcjonalne)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="resize-none"
        />

        <div className="flex gap-2">
          <Button
            onClick={save}
            disabled={!selectedMood || isPending}
            className="flex-1"
          >
            {isPending ? "Zapisuje..." : "Zapisz"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setExpanded(false)}
            className="text-muted-foreground"
            disabled={isPending}
          >
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
