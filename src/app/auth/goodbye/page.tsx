import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GoodbyePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mb-2 text-4xl">👋</div>
          <CardTitle>Widzimy się następnym razem</CardTitle>
          <CardDescription>
            Twoje konto i wszystkie dane zostały usunięte. Dziękujemy, że byłeś
            z nami — drzwi są zawsze otwarte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/auth/login" />} className="w-full">
            Wróć i załóż nowe konto
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
