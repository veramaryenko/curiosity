import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getHistoryData } from "@/lib/challenge-data";
import type { ChallengeStatus } from "@/types";

const statusLabel: Record<ChallengeStatus, string> = {
  active: "Aktywne",
  completed: "Ukończone",
  abandoned: "Przerwane",
};

const statusVariant: Record<ChallengeStatus, "default" | "secondary"> = {
  active: "default",
  completed: "default",
  abandoned: "secondary",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default async function HistoryPage() {
  const history = await getHistoryData();

  if (history.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Brak historii</h1>
        <p className="mt-2 text-muted-foreground">
          Jeszcze nie masz zapisanych przygód. Zacznij od nowej.
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Twoja historia</h1>
        <p className="text-muted-foreground">
          Lista zapisanych przygód i ich postęp.
        </p>
      </div>

      <div className="space-y-3">
        {history.map(({ challenge, completedCount, progress }) => (
          <Link key={challenge.id} href={`/challenge/${challenge.id}`}>
            <Card className="transition-all hover:border-primary/30 hover:shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">{challenge.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                    </p>
                  </div>
                  <Badge variant={statusVariant[challenge.status]}>
                    {statusLabel[challenge.status]}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{challenge.duration_days} dni
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
