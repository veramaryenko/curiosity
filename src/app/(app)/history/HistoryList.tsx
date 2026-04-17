"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteChallengeDialog } from "@/components/DeleteChallengeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ChallengeStatus } from "@/types";

interface HistoryListChallenge {
  challenge: {
    id: string;
    title: string;
    duration_days: number;
    status: ChallengeStatus;
    start_date: string;
    end_date: string;
  };
  completedCount: number;
  progress: number;
}

interface HistoryListProps {
  initialChallenges: HistoryListChallenge[];
}

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

export function HistoryList({ initialChallenges }: HistoryListProps) {
  const router = useRouter();
  const [hiddenChallengeIds, setHiddenChallengeIds] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<HistoryListChallenge["challenge"] | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setHiddenChallengeIds([]);
  }, [initialChallenges]);

  const challenges = initialChallenges.filter(
    ({ challenge }) => !hiddenChallengeIds.includes(challenge.id)
  );

  async function handleConfirmDelete() {
    if (!toDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    const challengeId = toDelete.id;

    const hideChallenge = () => {
      setHiddenChallengeIds((currentIds) =>
        currentIds.includes(challengeId)
          ? currentIds
          : [...currentIds, challengeId]
      );
    };

    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: "DELETE",
      });

      if (response.status === 404) {
        hideChallenge();
        setToDelete(null);
        toast.info("To wyzwanie było już usunięte.");
        startTransition(() => {
          router.refresh();
        });
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Nie udało się usunąć wyzwania.");
      }

      hideChallenge();
      setToDelete(null);
      toast.success("Wyzwanie zostało usunięte.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć wyzwania. Spróbuj ponownie."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (challenges.length === 0) {
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
    <>
      <div className="space-y-3">
        {challenges.map(({ challenge, completedCount, progress }) => (
          <Card key={challenge.id} className="transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Link
                  href={`/challenge/${challenge.id}`}
                  className="min-w-0 flex-1 rounded-lg outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <div className="space-y-3 p-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-base font-semibold">
                          {challenge.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(challenge.start_date)} -{" "}
                          {formatDate(challenge.end_date)}
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
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setToDelete(challenge)}
                  aria-label={`Usuń wyzwanie ${challenge.title}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteChallengeDialog
        open={toDelete !== null}
        challengeTitle={toDelete?.title ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setToDelete(null);
          }
        }}
      />
    </>
  );
}
