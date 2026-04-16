import { getHistoryData } from "@/lib/challenge-data";
import { HistoryList } from "./HistoryList";

export default async function HistoryPage() {
  const history = await getHistoryData();

  return (
    <div className="space-y-6">
      {history.length > 0 && (
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Twoja historia</h1>
          <p className="text-muted-foreground">
            Lista zapisanych przygód i ich postęp.
          </p>
        </div>
      )}
      <HistoryList initialChallenges={history} />
    </div>
  );
}
