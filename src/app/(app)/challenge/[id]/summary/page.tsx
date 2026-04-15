"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import type { MoodScore } from "@/types";

const feelings: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: "😔", label: "Słabo" },
  { score: 2, emoji: "😕", label: "Mogło być lepiej" },
  { score: 3, emoji: "😐", label: "Neutralnie" },
  { score: 4, emoji: "🙂", label: "Dobrze" },
  { score: 5, emoji: "😊", label: "Świetnie!" },
];

export default function ChallengeSummaryPage() {
  const router = useRouter();

  const [overallFeeling, setOverallFeeling] = useState<MoodScore | null>(null);
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [wantsToContinue, setWantsToContinue] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  async function handleSubmit() {
    if (!overallFeeling || wantsToContinue === null) return;
    setSaving(true);

    // TODO: Save reflection to Supabase
    // TODO: Get AI insight based on mood entries + reflection
    await new Promise((r) => setTimeout(r, 1500));

    setAiInsight(
      "Na podstawie Twoich wpisów zauważam, że czujesz się najlepiej w dni kiedy zadania były kreatywne i nie wymagały zbyt dużo przygotowania. To świetna wskazówka na przyszłość!"
    );
    setSaving(false);
  }

  async function continueChallenge() {
    // TODO: Create new challenge as continuation
    router.push("/challenge/discover");
  }

  if (aiInsight) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Brawo!</h1>
          <p className="text-muted-foreground">
            Ukończyłeś/aś wyzwanie. To jest naprawdę coś.
          </p>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Obserwacja AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{aiInsight}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Ogólne samopoczucie:</span>{" "}
              {feelings.find((f) => f.score === overallFeeling)?.emoji}{" "}
              {feelings.find((f) => f.score === overallFeeling)?.label}
            </p>
            {liked && (
              <p className="text-sm">
                <span className="font-medium">Podobało się:</span> {liked}
              </p>
            )}
            {disliked && (
              <p className="text-sm">
                <span className="font-medium">Nie podobało się:</span> {disliked}
              </p>
            )}
            {obstacles && (
              <p className="text-sm">
                <span className="font-medium">Przeszkody:</span> {obstacles}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {wantsToContinue ? (
            <Button onClick={continueChallenge} className="flex-1" size="lg">
              Kontynuuj — kolejne 2 tygodnie
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/challenge/discover")}
              className="flex-1"
              size="lg"
            >
              Spróbuj czegoś nowego
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/history")}
            className="flex-1"
            size="lg"
          >
            Historia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Podsumowanie</h1>
        <p className="text-muted-foreground">
          Czas na refleksję. Jak było?
        </p>
      </div>

      {/* Overall feeling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Jak się czujesz po tym wyzwaniu?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-1">
            {feelings.map((f) => (
              <button
                key={f.score}
                onClick={() => setOverallFeeling(f.score)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-3 text-sm transition-all ${
                  overallFeeling === f.score
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "hover:bg-accent"
                }`}
              >
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-xs text-muted-foreground">{f.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reflection questions */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Co Ci się podobało?</Label>
            <Textarea
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              placeholder="Może jakieś zadanie szczególnie Ci się spodobało?"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Co Ci nie pasowało?</Label>
            <Textarea
              value={disliked}
              onChange={(e) => setDisliked(e.target.value)}
              placeholder="Coś było za trudne? Za nudne? Za dużo?"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Co Ci przeszkadzało?</Label>
            <Textarea
              value={obstacles}
              onChange={(e) => setObstacles(e.target.value)}
              placeholder="Brak czasu? Motywacji? Materiałów?"
              rows={2}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Continue? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Chcesz kontynuować to wyzwanie?
          </CardTitle>
          <CardDescription>
            Możesz kontynuować kolejne tygodnie albo spróbować czegoś nowego.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant={wantsToContinue === true ? "default" : "outline"}
            onClick={() => setWantsToContinue(true)}
            className="flex-1"
          >
            Tak, kontynuuję!
          </Button>
          <Button
            variant={wantsToContinue === false ? "default" : "outline"}
            onClick={() => setWantsToContinue(false)}
            className="flex-1"
          >
            Nie, chcę spróbować czegoś innego
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Button
        onClick={handleSubmit}
        disabled={!overallFeeling || wantsToContinue === null || saving}
        className="w-full"
        size="lg"
      >
        {saving ? "Zapisuję..." : "Zakończ i zobacz podsumowanie"}
      </Button>
    </div>
  );
}
