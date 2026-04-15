import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskCheckbox } from "@/components/task-checkbox";
import { getChallengeDetailData } from "@/lib/challenge-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challengeData = await getChallengeDetailData(id);

  if (!challengeData) {
    notFound();
  }

  const { challenge, tasks, completedCount, progress, isComplete } = challengeData;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          <Badge variant={challenge.status === "active" ? "default" : "secondary"}>
            {challenge.status === "active" ? "Aktywne" : "Zakonczone"}
          </Badge>
        </div>
        {challenge.description && (
          <p className="text-muted-foreground">{challenge.description}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground">
            {completedCount}/{challenge.duration_days}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Ten plan nie ma jeszcze zadnych zadan do wyswietlenia.
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              className={task.completed ? "bg-success/5 border-success/20" : ""}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <TaskCheckbox taskId={task.id} completed={task.completed} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Dzien {task.day_number}
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
                      Material pomocniczy
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isComplete && (
        <Link href={`/challenge/${challenge.id}/summary`}>
          <Button className="w-full" size="lg">
            Przejdz do podsumowania
          </Button>
        </Link>
      )}
    </div>
  );
}
