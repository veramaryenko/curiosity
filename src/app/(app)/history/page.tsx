import { getHistoryData } from "@/lib/challenge-data";
import { HistoryList } from "./HistoryList";

export default async function HistoryPage() {
  const items = await getHistoryData();

  if (!items) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Twoja historia</h1>
        <p className="text-muted-foreground">
          Zobacz jak się rozwijasz i co Ci odpowiada
        </p>
      </div>
      <HistoryList items={items} />
    </div>
  );
}
