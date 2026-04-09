"use client";

import { useState } from "react";
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

const moods: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: "😔", label: "Ciężko" },
  { score: 2, emoji: "😕", label: "Meh" },
  { score: 3, emoji: "😐", label: "Okej" },
  { score: 4, emoji: "🙂", label: "Dobrze" },
  { score: 5, emoji: "😊", label: "Super" },
];

interface MoodCheckInProps {
  taskId: string;
}

export function MoodCheckIn({ taskId }: MoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<MoodScore | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function save() {
    if (!selectedMood) return;
    // TODO: Save to Supabase
    console.log("Save mood", { taskId, mood: selectedMood, note });
    setSaved(true);
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
          <Button onClick={save} disabled={!selectedMood} className="flex-1">
            Zapisz
          </Button>
          <Button
            variant="ghost"
            onClick={() => setExpanded(false)}
            className="text-muted-foreground"
          >
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
