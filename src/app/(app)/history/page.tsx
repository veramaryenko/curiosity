"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// TODO: Fetch from Supabase
const mockHistory = [
  {
    id: "1",
    title: "Zaczynam rysować",
    duration_days: 14,
    completed_days: 14,
    status: "completed" as const,
    start_date: "2026-03-01",
    end_date: "2026-03-14",
    overall_feeling: 4,
    wants_to_continue: true,
  },
  {
    id: "2",
    title: "Medytacja poranna",
    duration_days: 7,
    completed_days: 5,
    status: "abandoned" as const,
    start_date: "2026-03-20",
    end_date: "2026-03-26",
    overall_feeling: 2,
    wants_to_continue: false,
  },
];

const statusLabel = {
  completed: "Ukończone",
  abandoned: "Przerwane",
  active: "Aktywne",
};

const feelingEmoji: Record<number, string> = {
  1: "😔",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😊",
};

export default function HistoryPage() {
  if (mockHistory.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Brak historii</h1>
        <p className="mt-2 text-muted-foreground">
          Jeszcze nie ukończyłeś/aś żadnego wyzwania. To nic — zacznij!
        </p>
        <Link
          href="/challenge/discover"
          className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
        >
          Nowa przygoda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Twoja historia</h1>
        <p className="text-muted-foreground">
          Zobacz jak się rozwijasz i co Ci odpowiada
        </p>
      </div>

      <div className="space-y-3">
        {mockHistory.map((challenge) => {
          const progress =
            (challenge.completed_days / challenge.duration_days) * 100;

          return (
            <Link key={challenge.id} href={`/challenge/${challenge.id}`}>
              <Card className="transition-all hover:shadow-sm hover:border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {challenge.title}
                    </CardTitle>
                    <Badge
                      variant={
                        challenge.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel[challenge.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {challenge.completed_days}/{challenge.duration_days} dni
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {challenge.start_date} — {challenge.end_date}
                    </span>
                    {challenge.overall_feeling && (
                      <span>
                        {feelingEmoji[challenge.overall_feeling]}{" "}
                        {challenge.wants_to_continue
                          ? "Chce kontynuować"
                          : "Zakończone"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
