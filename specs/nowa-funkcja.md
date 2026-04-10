# Onboarding — ekran pierwszego logowania

## Co to robi (dla użytkownika)

Przy pierwszym logowaniu zamiast pustego dashboardu użytkownik trafia na przyjazny
3-krokowy ekran, który:
1. Wita go ciepło i tłumaczy sens aplikacji w 2 zdaniach
2. Pyta co go ciekawi (pole swobodne) → AI w ciągu kilku sekund proponuje 4–5
   konkretnych wyzwań do wyboru
3. Pozwala od razu wystartować z wybranym wyzwaniem (AI generuje plan) i trafia
   na dashboard z pierwszym zadaniem gotowym do wykonania

Efekt: nowy użytkownik wychodzi z onboardingu z aktywnym wyzwaniem i poczuciem,
że aplikacja „rozumie" czego szuka.

---

## Gdzie w aplikacji

| Plik | Akcja |
|------|-------|
| `src/app/(app)/onboarding/page.tsx` | **NOWY** — główna strona, state machine 3 kroków |
| `src/app/api/ai/discover-interests/route.ts` | **NOWY** — endpoint AI dla propozycji |
| `src/components/interest-card.tsx` | **NOWY** — karta propozycji (emoji, tytuł, opis, czas) |
| `src/lib/ai.ts` | Dodać funkcję `discoverInterests(freeText)` |
| `src/types/index.ts` | Dodać typ `InterestSuggestion` |
| `src/app/auth/callback/route.ts` | Zmienić redirect: first-login → `/onboarding` |
| `src/lib/supabase/middleware.ts` | Dodać `/onboarding` do `protectedPaths` |

---

## Flow szczegółowy

### Krok 1 — Powitanie (`step: "welcome"`)

- Pełnoekranowy layout (bez Navbar)
- Logo Curiosity + nagłówek: „Cześć! Jesteś tutaj, bo coś Cię ciekawi."
- Podtytuł: „Za chwilę znajdziemy coś dla Ciebie i ułożymy plan krok po kroku."
- Jeden przycisk: „Zaczynamy →"
- Brak przycisku „Pomiń" — ale delikatny link tekstowy na dole:
  „Już wiem co chcę robić → stwórz wyzwanie ręcznie" (→ `/challenge/new`)

### Krok 2 — Odkrycie zainteresowania (`step: "discover"`)

- Nagłówek: „Co ostatnio Cię zaciekawiło?"
- Placeholder textarea: „Może ser rzemieślniczy, może bieganie, może akwarele…
  Napisz cokolwiek — nawet jedno słowo."
- Przycisk: „Pokaż mi pomysły" (disabled gdy input pusty)
- Po kliknięciu: spinner + tekst „AI szuka pomysłów dla Ciebie…"
- Wywołanie `POST /api/ai/discover-interests` z `{ freeText }`
- Wynik: siatka 4–5 kart `InterestCard` (animowane wejście)
- Użytkownik klika kartę → wybrana karta się podświetla, reszta przyciemnia
- Przycisk „To to! Dalej →" pojawia się po wyborze karty

### Krok 3 — Szybki start (`step: "start"`)

- Tytuł wyzwania wstępnie wypełniony z wybranej karty (edytowalny)
- Input/suwak: „Na ile dni?" — default 14, zakres 7–30
- Podpowiedź: „Polecamy 14 dni na start — wystarczająco żeby poczuć."
- Przycisk: „AI robi plan i startujemy! 🚀"
- Po kliknięciu:
  1. `POST /api/ai/generate-plan` → lista zadań
  2. Zapis challenge + tasks do Supabase
  3. Redirect → `/dashboard`

---

## Nowy endpoint: `POST /api/ai/discover-interests`

**Request:**
```ts
{ freeText: string }  // min 1 znak, max 500 znaków
```

**Response:**
```ts
{
  suggestions: InterestSuggestion[]
}

// typ w types/index.ts:
export interface InterestSuggestion {
  title: string            // max ~5 słów, np. "Akwarele dla początkujących"
  description: string      // 1 zdanie bez presji
  emoji: string            // jeden emoji
  estimated_minutes: number // szacowany czas dzienny w minutach
}
```

**Model:** `claude-haiku-4-5-20251001` (szybszy i tańszy niż Sonnet, wystarczy dla prostych sugestii)

**Prompt (szkic):**
```
Użytkownik aplikacji Curiosity napisał: "${freeText}"
Curiosity pomaga ludziom odkrywać nowe zainteresowania przez codzienne mikro-zadania.

Zaproponuj 4-5 konkretnych wyzwań które mógłby/mogłaby spróbować.
Zasady:
- Tytuły krótkie, konkretne, bez "Jak", bez "Kurs"
- Opisy ciepłe, bez presji, max 1 zdanie
- Czas dzienny realny: 10–30 minut
- Zaproponuj różnorodne opcje jeśli input jest ogólny
- Pisz po polsku

Odpowiedz TYLKO jako JSON array, bez żadnego innego tekstu:
[{"title":"...","description":"...","emoji":"...","estimated_minutes":15},...]
```

---

## Wykrywanie pierwszego logowania

```ts
// src/app/auth/callback/route.ts
const { data: { user } } = await supabase.auth.getUser();

const { count } = await supabase
  .from('challenges')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id);

const redirectTo = count === 0 ? '/onboarding' : '/dashboard';
return NextResponse.redirect(new URL(redirectTo, request.url));
```

Alternatywa (lepsza jeśli pojawią się inne powody do resetu onboardingu):
użyć `user.user_metadata.onboarding_completed` i aktualizować przez
`supabase.auth.updateUser({ data: { onboarding_completed: true } })`
po ukończeniu kroku 3.

---

## Kryteria akceptacji

- [ ] Nowy użytkownik (0 wyzwań) po kliknięciu w magic link trafia na `/onboarding`, nie na `/dashboard`
- [ ] Powracający użytkownik (≥1 wyzwanie) trafia bezpośrednio na `/dashboard`
- [ ] Krok 1 wyświetla się bez Navbar
- [ ] Krok 2 wywołuje `/api/ai/discover-interests` i wyświetla karty
- [ ] Kliknięcie karty zaznacza ją i pokazuje przycisk „Dalej"
- [ ] Krok 3 ma wstępnie wypełniony tytuł z wybranej karty
- [ ] Po kliknięciu „Startujemy" tworzony jest challenge z tasks w Supabase
- [ ] Po zapisie użytkownik trafia na `/dashboard` z aktywnym wyzwaniem
- [ ] `/onboarding` jest chronione (niezalogowany → redirect `/auth/login`)
- [ ] Endpoint `/api/ai/discover-interests` zwraca 4–5 sugestii w <3s
- [ ] Błąd AI (timeout, zły JSON) pokazuje komunikat i pozwala spróbować ponownie
- [ ] Link „stwórz wyzwanie ręcznie" na kroku 1 działa i prowadzi na `/challenge/new`

---

## Nie robimy (scope)

- Nie robimy animacji przejść między krokami (można dodać później)
- Nie robimy możliwości powrotu do onboardingu z ustawień
- Nie robimy personalizacji na podstawie historii (to V2)
- Nie robimy A/B testów wariantów copy
- Nie robimy onboardingu dla mobile-native (tylko web)
- Nie zmieniamy wyglądu `/challenge/new` — onboarding ma własny uproszczony flow

---

## Sugerowana kolejność implementacji

1. `src/types/index.ts` — dodać `InterestSuggestion`
2. `src/lib/ai.ts` — dodać `discoverInterests(freeText)`
3. `src/app/api/ai/discover-interests/route.ts` — endpoint
4. `src/components/interest-card.tsx` — komponent karty
5. `src/app/(app)/onboarding/page.tsx` — strona z 3 krokami
6. `src/app/auth/callback/route.ts` — logika first-login
7. `src/lib/supabase/middleware.ts` — dodać `/onboarding` do `protectedPaths`
8. Testy: `__tests__/api/discover-interests.test.ts`
