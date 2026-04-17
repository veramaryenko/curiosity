"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ChallengeSummaryPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Podsumowanie chwilowo wylaczone</CardTitle>
          <CardDescription className="text-base">
            Ta sekcja nie udaje juz zapisu ani AI. Zamiast tego mozesz od razu
            przejsc do kolejnej akcji.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => router.push("/challenge/discover")}
            className="flex-1"
            size="lg"
          >
            Nowa przygoda
          </Button>
          <Button
            onClick={() => router.push("/history")}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Historia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
