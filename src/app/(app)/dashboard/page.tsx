"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoodCheckIn } from "@/components/mood-check-in";
import { TaskCheckbox } from "@/components/task-checkbox";

// TODO: Replace with real data from Supabase
const mockChallenge = {
  id: "1",
  title: "Zaczynam rysować",
  description: "Codzienne szkice przez 14 dni",
  duration_days: 14,
  start_date: "2026-04-01",
  current_day: 5,
};

const mockTask = {
  id: "1",
  day_number: 5,
  description:
    "Narysuj 3 proste kształty (koło, kwadrat, trójkąt) i spróbuj je zacieniować",
  resource_url: null as string | null,
  metric: "3 szkice" as string | null,
  completed: false,
};

export default function DashboardPage() {
  const hasActiveChallenge = true; // TODO: check from DB
  const progress = (mockChallenge.current_day / mockChallenge.duration_days) * 100;

  if (!hasActiveChallenge) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-20 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Witaj!</h1>
          <p className="text-muted-foreground">
            Nie masz jeszcze aktywnego wyzwania. Czas to zmienić?
          </p>
        </div>
        <Link href="/challenge/new">
          <Button size="lg">Rozpocznij wyzwanie</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Challenge header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{mockChallenge.title}</h1>
        <p className="text-sm text-muted-foreground">
          Dzień {mockChallenge.current_day} z {mockChallenge.duration_days}
        </p>
        <Progress value={progress} className="mt-2 h-2" />
      </div>

      {/* Today's task */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Dzisiejsze zadanie</CardDescription>
            {mockTask.metric && (
              <Badge variant="outline" className="text-xs">
                {mockTask.metric}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{mockTask.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskCheckbox
            taskId={mockTask.id}
            completed={mockTask.completed}
          />
          {mockTask.resource_url && (
            <a
              href={mockTask.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
            >
              Pomocny materiał
            </a>
          )}
        </CardContent>
      </Card>

      {/* Mood check-in (optional) */}
      <MoodCheckIn taskId={mockTask.id} />

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href={`/challenge/${mockChallenge.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Cały plan
          </Button>
        </Link>
        {mockChallenge.current_day >= mockChallenge.duration_days && (
          <Link href={`/challenge/${mockChallenge.id}/summary`} className="flex-1">
            <Button className="w-full">Podsumowanie</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
