"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DeleteChallengeDialog } from "@/components/delete-challenge-dialog";
import type { HistoryItem } from "@/lib/challenge-data";
import type { ChallengeStatus, MoodScore } from "@/types";

const statusLabel: Record<ChallengeStatus, string> = {
  active: "Aktywne",
  completed: "Ukończone",
  abandoned: "Przerwane",
};

const feelingEmoji: Record<MoodScore, string> = {
  1: "😔",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😊",
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

interface HistoryListProps {
  items: HistoryItem[];
}

export function HistoryList({ items }: HistoryListProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const visibleItems = items.filter((item) => !hiddenIds.includes(item.id));

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold">Brak historii</h2>
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
    <div className="space-y-3">
      {visibleItems.map((item) => {
        const progress =
          item.duration_days > 0
            ? (item.completed_days / item.duration_days) * 100
            : 0;

        return (
          <div key={item.id} className="flex items-stretch gap-2">
            <Link
              href={`/challenge/${item.id}`}
              className="flex-1 min-w-0"
            >
              <Card className="h-full transition-all hover:shadow-sm hover:border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">
                      {item.title}
                    </CardTitle>
                    <Badge
                      variant={
                        item.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {statusLabel[item.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {item.completed_days}/{item.duration_days} dni
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(item.start_date)} — {formatDate(item.end_date)}
                    </span>
                    {item.overall_feeling !== null && (
                      <span>
                        {feelingEmoji[item.overall_feeling]}{" "}
                        {item.wants_to_continue
                          ? "Chce kontynuować"
                          : "Zakończone"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
            <DeleteChallengeDialog
              challengeId={item.id}
              challengeTitle={item.title}
              onDeleted={() =>
                setHiddenIds((prev) => [...prev, item.id])
              }
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Usuń wyzwanie"
                  className="self-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
