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
import { getDashboardData } from "@/lib/challenge-data";

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  if (!dashboardData) {
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

  const { challenge, task, completedCount, currentDay, progress, moodEntry, isComplete } =
    dashboardData;

  return (
    <div className="space-y-6">
      {/* Challenge header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{challenge.title}</h1>
        <p className="text-sm text-muted-foreground">
          Dzien {currentDay} z {challenge.duration_days}
        </p>
        <Progress value={progress} className="mt-2 h-2" />
      </div>

      {/* Today's task */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Dzisiejsze zadanie</CardDescription>
            {task.metric && (
              <Badge variant="outline" className="text-xs">
                {task.metric}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{task.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskCheckbox taskId={task.id} completed={task.completed} />
          {task.resource_url && (
            <a
              href={task.resource_url}
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
      <MoodCheckIn taskId={task.id} initialMoodEntry={moodEntry} />

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href={`/challenge/${challenge.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Cały plan
          </Button>
        </Link>
        {isComplete && (
          <Link href={`/challenge/${challenge.id}/summary`} className="flex-1">
            <Button className="w-full">Podsumowanie</Button>
          </Link>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Ukonczono {completedCount} z {challenge.duration_days} dni.
      </p>
    </div>
  );
}


