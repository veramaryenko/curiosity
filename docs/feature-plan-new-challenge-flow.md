# Feature Plan: Redesign przepływu dodawania małych celów

## Analiza obecnego stanu

### Co jest teraz i gdzie

**Pierwsze logowanie → `/onboarding`**
- Plik: `src/app/onboarding/page.tsx`
- Trzy kroki: welcome → discover (AI) → start (konfiguracja + generowanie planu)
- **Problem: strona jest POZA grupą `(app)`, więc nie ma navbar ani layoutu aplikacji**
- Po stworzeniu challenge'u — redirect do `/dashboard`

**Powracający użytkownicy → `/challenge/new`**
- Plik: `src/app/(app)/challenge/new/page.tsx`
- Trzy inne kroki: goal → plan mode → review/edit
- Ma navbar (jest w grupie `(app)`)
- **Problem: zupełnie inny flow niż onboarding — brakuje AI discovery (sugestii), placeholder zamiast prawdziwego AI**
- `createChallenge()` ma tylko `console.log` — nie zapisuje do bazy

**Callback po logowaniu → `src/app/auth/callback/route.ts`**
- Sprawdza liczbę challenges w bazie
- `count === 0` → `/onboarding`
- `count > 0` → `/dashboard`

### Kluczowe problemy

1. **Dwa oddzielne, niespójne flow** — nowy użytkownik i powracający mają kompletnie różne doświadczenie
2. **Brak navbar na onboardingu** — strona wygląda jak "poza aplikacją", nowy użytkownik nie widzi, gdzie jest
3. **`/challenge/new` nie ma AI discovery** — powracający użytkownik nie może odkryć nowego tematu przez AI
4. **`/challenge/new` nie zapisuje do bazy** — `createChallenge()` to tylko `console.log + router.push`
5. **Welcome screen jest zawsze wyświetlany** na `/onboarding` — powracający użytkownik, gdyby trafił tam ręcznie, zobaczyłby "Cześć! Jesteś tutaj po raz pierwszy"
6. **Ścieżka manualna w `/challenge/new` jest osobno** od AI — trzeba wybrać tryb, zamiast móc płynnie przełączać

---

## Cel redesignu

Jeden spójny flow dodawania wyzwania dostępny dla **wszystkich** użytkowników — zarówno przy pierwszym logowaniu jak i zawsze potem — umieszczony w `(app)` layout (z navbar), z pełną integracją AI i zapisem do bazy.

### Po zmianie:

- `/onboarding` → **usunięte**
- `/challenge/new` → **zastąpione nowym, kompletnym flow** (AI discovery + plan + zapis)
- Callback po logowaniu: `count === 0` → `/challenge/new?welcome=true`
- Navbar: nowy link **"+ Nowe"** zawsze widoczny dla zalogowanych

---

## Nowa architektura flow

### Routing

```
/challenge/new                  ← główna strona flow (w grupie (app), ma navbar)
/challenge/new?welcome=true     ← ten sam flow, ale z welcome screenem na początku
```

Jeden komponent, jeden plik. Query param `welcome` decyduje tylko o tym, czy pokazać ekran powitalny.

### Kroki flow (ujednolicone)

```
[welcome]  →  discover  →  suggestions  →  configure  →  [loading]  →  /dashboard
   ↑                                              ↑
tylko przy                              lub ręczny tryb:
?welcome=true                           manual → edit tasks
```

#### Krok 0 — Welcome (opcjonalny, `?welcome=true`)
- Wyświetlany tylko przy pierwszym logowaniu
- Prosta wiadomość powitalna
- Przycisk "Zaczynamy" przechodzi do kroku 1
- Pomijany zupełnie dla powracających użytkowników

#### Krok 1 — Discover
- Textarea: "Co ostatnio Cię zaciekawiło?"
- Przycisk "Pokaż mi pomysły" → wywołuje `/api/ai/discover-interests`
- Link "Już wiem co chcę → przejdź do ręcznego tworzenia" → przeskakuje do kroku 3 (manual mode)

#### Krok 2 — Suggestions
- Karty z propozycjami AI (InterestCard)
- Wybranie propozycji → przechodzi do kroku 3 z wypełnionymi danymi
- Przycisk "Inne pomysły" → wraca do kroku 1

#### Krok 3 — Configure
- Edytowalna nazwa wyzwania (prefill z wybranej sugestii lub puste dla manual)
- Opcjonalny opis
- Wybór liczby dni (7–30, default 14)
- Wybór trybu planu: "AI wygeneruje za mnie" / "Wpiszę sam/a"
- Przycisk "Dalej" → krok 4

#### Krok 4 — Review / Edit tasks
- Dla trybu AI: generuje plan przez `/api/ai/generate-plan` → lista zadań do przejrzenia i edycji
- Dla trybu manual: puste pola do wypełnienia + opcja "Poproś AI o sprawdzenie" przez `/api/ai/review-plan`
- Przycisk "Rozpocznij!" → wywołuje `/api/challenges` (POST) → redirect do `/dashboard`

---

## Zmiany plikowe

### 1. Nowy plik: `src/app/(app)/challenge/new/page.tsx`
Całkowite przepisanie. Zawiera wszystkie 4–5 kroków w jednym komponencie z `useState<Step>`.

**Kluczowe różnice vs obecny plik:**
- Dodany krok discover + suggestions (z obecnego `/onboarding`)
- Dodany opcjonalny welcome screen (czytany z `useSearchParams`)
- `createChallenge()` — prawdziwy zapis do Supabase przez `/api/challenges`
- AI generation przez `/api/ai/generate-plan` (nie placeholder)
- AI review przez `/api/ai/review-plan` (nie placeholder)
- Jeden spójny design/UX dla obu ścieżek

### 2. Zmiana: `src/app/auth/callback/route.ts`
```typescript
// Przed:
return NextResponse.redirect(new URL("/onboarding", request.url));

// Po:
return NextResponse.redirect(new URL("/challenge/new?welcome=true", request.url));
```

### 3. Zmiana: `src/components/navbar.tsx`
Dodanie nowej pozycji w nawigacji:

```typescript
const navItems = [
  { href: "/dashboard", label: "Dziś" },
  { href: "/challenge/new", label: "+ Nowe" },   // ← nowe
  { href: "/history", label: "Historia" },
  { href: "/settings", label: "Ustawienia" },
];
```

Opcjonalnie: "Nowe" jako wyróżniony przycisk (variant `outline` lub inna klasa) zamiast zwykłego linka.

### 4. Usunięcie: `src/app/onboarding/`
Cały katalog do usunięcia po tym jak nowy flow jest gotowy i przetestowany.

---

## Szczegóły implementacji

### Typy i stan

```typescript
type Step = "welcome" | "discover" | "suggestions" | "configure" | "review";

// Dane zebrane przez flow:
interface FlowState {
  freeText: string;
  suggestions: InterestSuggestion[];
  selected: InterestSuggestion | null;
  title: string;
  description: string;
  days: number;
  planMode: "ai" | "manual" | null;
  tasks: TaskDraft[];
}
```

### Obsługa `?welcome=true`

```typescript
// W komponencie:
const searchParams = useSearchParams();
const isFirstTime = searchParams.get("welcome") === "true";
const [step, setStep] = useState<Step>(isFirstTime ? "welcome" : "discover");
```

### Zapis do bazy (`createChallenge`)

```typescript
async function createChallenge() {
  setSaving(true);
  setSaveError(null);
  try {
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        duration_days: days,
        tasks: tasks.map(t => ({
          day_number: t.day,
          description: t.description,
          resource_url: t.resource_url || null,
        })),
      }),
    });
    if (!res.ok) throw new Error();
    router.push("/dashboard");
  } catch {
    setSaveError("Nie udało się zapisać. Spróbuj ponownie.");
    setSaving(false);
  }
}
```

### Generowanie planu przez AI

```typescript
async function generatePlan() {
  setGenerating(true);
  try {
    const res = await fetch("/api/ai/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, duration_days: days }),
    });
    if (!res.ok) throw new Error();
    const { tasks: generated } = await res.json();
    setTasks(generated.map((t: { day_number: number; description: string; resource_url?: string }) => ({
      day: t.day_number,
      description: t.description,
      resource_url: t.resource_url ?? "",
    })));
    setStep("review");
  } catch {
    setGenerateError("Nie udało się wygenerować planu.");
  } finally {
    setGenerating(false);
  }
}
```

---

## Kolejność implementacji

### Krok 1 — Przepisanie `/challenge/new/page.tsx`
- Przenieś logikę discover + suggestions z `onboarding/page.tsx`
- Dodaj obsługę `?welcome=true` i krok welcome
- Scalaj z obecną logiką configure + review
- Użyj prawdziwego API `/api/ai/generate-plan`

### Krok 2 — Prawdziwy zapis w `createChallenge()`
- Wywołanie `/api/challenges` (POST) — endpoint już istnieje i działa
- Obsługa błędów i loading state

### Krok 3 — Update `auth/callback/route.ts`
- Jedna linia: zmiana `/onboarding` na `/challenge/new?welcome=true`

### Krok 4 — Update navbar
- Dodanie "Nowe" / "+ Nowe" do `navItems`
- Opcjonalne: wyróżnienie stylem

### Krok 5 — Usunięcie `/onboarding`
- Usunięcie `src/app/onboarding/` po weryfikacji że nowy flow działa

### Krok 6 — Weryfikacja end-to-end
- Symulacja pierwszego logowania (nowe konto lub usunięcie challenges z bazy)
- Weryfikacja że redirect trafia na `/challenge/new?welcome=true` z welcome screenem
- Weryfikacja że powracający użytkownik klika "+ Nowe" i **nie** widzi welcome screenu
- Weryfikacja zapisu challenge'u w bazie i redirectu na dashboard

---

## Rzeczy bez zmian

- `/api/challenges` (POST) — działa, nie wymaga zmian
- `/api/ai/discover-interests` — działa
- `/api/ai/generate-plan` — działa
- `/api/ai/review-plan` — działa
- `InterestCard` komponent — bez zmian
- Cała logika auth/callback poza jedną linią redirect
- Reszta nawigacji (Dziś, Historia, Ustawienia)

---

## Uwagi

- **Nie tworzymy nowej strony** — przepisujemy istniejący `/challenge/new` i przenosimy do niego logikę z `/onboarding`
- Welcome screen widziany jest **tylko raz** — parametr `?welcome=true` jest ustawiany wyłącznie przez auth callback
- Jeśli użytkownik wejdzie ręcznie na `/challenge/new` (bez parametru), od razu widzi krok discover — bez welcome screenu
- Navbar z `+ Nowe` daje zawsze dostęp niezależnie od stanu aplikacji
