import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="text-xl font-semibold text-primary">Curiosity</span>
        <Link href="/auth/login">
          <Button variant="outline" size="sm">
            Zaloguj się
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-lg space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Odkryj, co naprawdę
            <span className="text-primary"> lubisz</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Krótkie wyzwania na 7-14 dni, które pomagają Ci spróbować nowych
            rzeczy. Bez presji, bez oceniania. W swoim tempie.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="w-full sm:w-auto">
                Zacznij za darmo
              </Button>
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mx-auto mt-20 grid max-w-2xl gap-8 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl">
              1
            </div>
            <h3 className="font-semibold">Wybierz cel</h3>
            <p className="text-sm text-muted-foreground">
              Napisz co chcesz spróbować. AI pomoże Ci stworzyć plan — albo
              zrób to sam.
            </p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl">
              2
            </div>
            <h3 className="font-semibold">Działaj krok po kroku</h3>
            <p className="text-sm text-muted-foreground">
              Codziennie jedno małe zadanie. Możesz zapisać jak się czujesz —
              ale nie musisz.
            </p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl">
              3
            </div>
            <h3 className="font-semibold">Podsumuj i zdecyduj</h3>
            <p className="text-sm text-muted-foreground">
              Na koniec opisz swoje odczucia. Kontynuujesz? Próbujesz czegoś
              nowego? Twój wybór.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        Curiosity — odkrywaj siebie w swoim tempie
      </footer>
    </div>
  );
}
