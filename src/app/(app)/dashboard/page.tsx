import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MoodCheckIn } from "@/components/mood-check-in";
import { TaskCheckbox } from "@/components/task-checkbox";
import {
  getDashboardData,
  type DashboardChallengeData,
} from "@/lib/challenge-data";

function ChallengeCard({ item }: { item: DashboardChallengeData }) {
  const { challenge, task, completedCount, currentDay, progress, moodEntry, isComplete } =
    item;

  return (
    <Card className={isComplete ? "border-success/30 bg-success/5" : ""}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>Aktywne wyzwanie</CardDescription>
            <CardTitle className="text-xl">{challenge.title}</CardTitle>
          </div>
          <Badge variant={isComplete ? "secondary" : "outline"} className="shrink-0">
            Dzien {currentDay}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Postep</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Dzisiejsze zadanie</CardDescription>
            {task.metric && (
              <Badge variant="outline" className="text-xs">
                {task.metric}
              </Badge>
            )}
          </div>

          <p
            className={`text-sm ${task.completed ? "text-muted-foreground line-through" : ""}`}
          >
            {task.description}
          </p>

          <TaskCheckbox taskId={task.id} completed={task.completed} />

          {task.resource_url && (
            <a
              href={task.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-primary underline underline-offset-4"
            >
              Pomocny material
            </a>
          )}
        </div>

        <MoodCheckIn taskId={task.id} initialMoodEntry={moodEntry} />

        <div className="flex gap-3">
          <Link href={`/challenge/${challenge.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Caly plan
            </Button>
          </Link>
          {isComplete && (
            <Link href={`/challenge/${challenge.id}/summary`} className="flex-1">
              <Button className="w-full">Podsumowanie</Button>
            </Link>
          )}
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Dzien {currentDay} z {challenge.duration_days}
          </p>
          <p>
            Ukonczono {completedCount} z {challenge.duration_days} dni.
          </p>
          {isComplete && <p>Wyzwanie ukonczone.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const challengeCards = await getDashboardData();

  if (challengeCards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-20 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Witaj!</h1>
          <p className="text-muted-foreground">
            Nie masz jeszcze aktywnego wyzwania. Czas to zmienic?
          </p>
        </div>
        <Link href="/challenge/discover">
          <Button size="lg">Rozpocznij przygode</Button>
        </Link>
      </div>
    );
  }

  const visibleCards = challengeCards.slice(0, 3);
  const remainingCards = challengeCards.slice(3);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {visibleCards.map((item) => (
          <ChallengeCard key={item.challenge.id} item={item} />
        ))}
      </div>

      {remainingCards.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Pozostale</h2>
            <p className="text-sm text-muted-foreground">
              Reszta aktywnych wyzwan na dzis.
            </p>
          </div>
          <div className="space-y-4">
            {remainingCards.map((item) => (
              <ChallengeCard key={item.challenge.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
