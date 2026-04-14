"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// TODO: Fetch from Supabase
const mockChallenge = {
  id: "1",
  title: "Zaczynam rysować",
  description: "Codzienne szkice przez 14 dni",
  duration_days: 14,
  start_date: "2026-04-01",
  status: "active" as const,
};

const mockTasks = Array.from({ length: 14 }, (_, i) => ({
  id: String(i + 1),
  day_number: i + 1,
  description: `Dzień ${i + 1}: Zadanie ${i + 1} dla wyzwania rysowania`,
  resource_url: i % 3 === 0 ? "https://example.com" : null,
  metric: i < 5 ? "1 szkic" : i < 10 ? "2 szkice" : "3 szkice",
  completed: i < 4,
  date: `2026-04-${String(i + 1).padStart(2, "0")}`,
}));

export default function ChallengeDetailPage() {
  const params = useParams();
  const completedCount = mockTasks.filter((t) => t.completed).length;
  const progress = (completedCount / mockChallenge.duration_days) * 100;
  const isComplete = completedCount >= mockChallenge.duration_days;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{mockChallenge.title}</h1>
          <Badge variant={mockChallenge.status === "active" ? "default" : "secondary"}>
            {mockChallenge.status === "active" ? "Aktywne" : "Zakończone"}
          </Badge>
        </div>
        {mockChallenge.description && (
          <p className="text-muted-foreground">{mockChallenge.description}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground">
            {completedCount}/{mockChallenge.duration_days}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {mockTasks.map((task) => (
          <Card
            key={task.id}
            className={task.completed ? "bg-success/5 border-success/20" : ""}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <Checkbox
                checked={task.completed}
                className="mt-0.5 h-5 w-5"
                // TODO: Toggle in Supabase
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Dzień {task.day_number}
                  </p>
                  {task.metric && (
                    <Badge variant="outline" className="text-xs">
                      {task.metric}
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-sm ${
                    task.completed ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {task.description}
                </p>
                {task.resource_url && (
                  <a
                    href={task.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline underline-offset-2"
                  >
                    Materiał pomocniczy
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isComplete && (
        <Link href={`/challenge/${params.id}/summary`}>
          <Button className="w-full" size="lg">
            Przejdź do podsumowania
          </Button>
        </Link>
      )}
    </div>
  );
}
