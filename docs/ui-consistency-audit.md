# Audyt spójności UI — Curiosity

## Jak robiłam analizę

Próbowałam uruchomić `next build` — sandbox nie ma dostępu sieciowego do pobrania binarki SWC, więc build się nie wykonał. Zrobiłam za to:

1. Statyczną analizę wszystkich stron (`app/page.tsx`, `auth/*`, `onboarding`, `(app)/*`, `challenge/*`)
2. Przegląd wszystkich shared komponentów (`navbar`, `task-checkbox`, `mood-check-in`, `interest-card`)
3. Przegląd `globals.css` i tokenów kolorów
4. `tsc --noEmit` — znalazł jeden realny błąd typu (patrz sekcja "Bugi do naprawienia")

## Podsumowanie — co jest nie tak

App ma spójny system kolorów (ciepła paleta peach/amber w `globals.css`) i używa shadcn/ui, więc baza jest dobra. **Problem to niespójność na poziomie stron**: logo pojawia się w 4 różnych rozmiarach i wagach (albo nie pojawia wcale), max-width layoutu skacze między stronami, nagłówki mają różne skale typograficzne, i są miejsca gdzie użyto raw CSS zamiast komponentu `Button`.

---

## 1. Logo / Branding — ⚠️ największa niespójność

### Obecne warianty w aplikacji

| Miejsce | Kod | Rozmiar | Waga | Klikalne? |
|---|---|---|---|---|
| `app/page.tsx` (landing header) | `<span className="text-xl font-semibold text-primary">Curiosity</span>` | `text-xl` | `semibold` | ❌ nie |
| `auth/login/page.tsx` | `<Link href="/" className="mb-2 text-xl font-semibold text-primary">Curiosity</Link>` | `text-xl` | `semibold` | ✅ tak |
| `onboarding/page.tsx` (tylko step welcome) | `<p className="text-2xl font-bold text-primary">Curiosity</p>` | `text-2xl` | `bold` | ❌ nie |
| `onboarding` step discover + start | **BRAK LOGO** | — | — | — |
| `navbar.tsx` (wszystkie `(app)` strony) | `<Link href="/dashboard" className="text-lg font-semibold text-primary">Curiosity</Link>` | `text-lg` | `semibold` | ✅ tak |
| `auth/goodbye/page.tsx` | **BRAK LOGO** (tylko emoji 👋) | — | — | — |
| `app/page.tsx` footer | `Curiosity — Twoja przestrzeń na odkrywanie siebie` | `text-sm` | normal | ❌ nie |

### Zmiany wymagane

**1.1.** Wprowadzić jeden komponent `<Logo />` w `src/components/logo.tsx`, który będzie używany wszędzie:
```tsx
// src/components/logo.tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null; // null = nieklikane
  className?: string;
}

export function Logo({ size = "md", href = "/", className }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };
  const content = (
    <span className={cn("font-semibold text-primary", sizeClasses[size], className)}>
      Curiosity
    </span>
  );
  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
```

**1.2.** Zastąpić wszystkie wystąpienia:
- `app/page.tsx` header → `<Logo size="md" href={null} />`
- `auth/login/page.tsx` → `<Logo size="md" />`
- `auth/goodbye/page.tsx` → **dodać** `<Logo size="md" />` na górze karty, przed emoji
- `onboarding/page.tsx` → dodać `<Logo />` jako stały header **na każdym kroku** (nie tylko welcome)
- `components/navbar.tsx` → `<Logo size="sm" href="/dashboard" />`

**1.3.** Ujednolicić wagę — wszędzie `font-semibold` (obecnie onboarding step 1 ma `font-bold`, co wizualnie wybija).

**1.4.** Nigdy nie zostawiać strony bez nagłówka z logo — onboarding steps 2-3 i goodbye są teraz "nagie".

---

## 2. Max-width layoutu — użytkownik widzi skoki szerokości

### Obecnie

| Strona | Max-width | Skutek |
|---|---|---|
| `/` (landing hero) | `max-w-lg` (~32rem) | wąski |
| `/` (how it works) | `max-w-2xl` (~42rem) | szerszy |
| `/auth/login` | `max-w-sm` (~24rem) Card | bardzo wąski |
| `/auth/goodbye` | `max-w-sm` Card | bardzo wąski |
| `/onboarding` | `max-w-md` (~28rem) | średni |
| `/(app)/*` (navbar i main) | `max-w-2xl` (~42rem) | szeroki |

User flow: landing (max-w-2xl dla kroków) → login (max-w-sm) → onboarding (max-w-md) → dashboard (max-w-2xl). Przy każdej zmianie content skacze na inną szerokość.

### Zmiany wymagane

**2.1.** Ustalić dwa rozmiary i trzymać się ich:
- **Formularze/karty z jedną akcją** (login, goodbye): `max-w-sm` — OK, zostawić
- **Cała reszta** (landing, onboarding, app): `max-w-2xl`

**2.2.** Onboarding zmienić z `max-w-md` → `max-w-2xl`, żeby przejście z onboardingu do dashboard nie zmieniało szerokości.

**2.3.** Wprowadzić komponent `PageContainer`:
```tsx
// src/components/page-container.tsx
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  narrow = false,
  className,
}: {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4",
        narrow ? "max-w-sm" : "max-w-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## 3. Skala typograficzna — każda strona ma inną

### Obecne nagłówki h1

| Strona | Klasy |
|---|---|
| `app/page.tsx` (landing) | `text-4xl font-bold tracking-tight sm:text-5xl` |
| `onboarding` step 1 | `text-3xl font-bold leading-tight` |
| `onboarding` step 2, 3 | `text-2xl font-bold` |
| `dashboard`, `history`, `settings`, `challenge/new`, `challenge/[id]`, `summary` | `text-2xl font-bold` |

### Zmiany wymagane

**3.1.** Ustalić skalę typograficzną i trzymać się jej:
- **Landing hero (tylko jedno miejsce)**: `text-4xl sm:text-5xl font-bold tracking-tight`
- **Wszystkie h1 w aplikacji i na onboardingu**: `text-2xl font-bold tracking-tight`
- **h2 / card title**: `text-lg font-semibold`
- **Podtytuły (muted)**: `text-sm text-muted-foreground` lub `text-muted-foreground` (bez explicit `text-sm` jeśli inline w headerze)

**3.2.** Onboarding step 1 obniżyć z `text-3xl` → `text-2xl` (albo konsekwentnie podnieść wszystkie inne).

**3.3.** Dodać do Tailwind config albo utility classy powtarzalne style nagłówków (np. `.page-title`).

---

## 4. Buttony — raw CSS zamiast komponentu

### Problemy

**4.1. `history/page.tsx` linia 56-61** — empty state używa raw linka stylowanego jako button:
```tsx
// ŹLE — nie używa komponentu Button
<Link
  href="/challenge/new"
  className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
>
  Nowe wyzwanie
</Link>
```
**Powinno być:**
```tsx
<Button asChild className="mt-6">
  <Link href="/challenge/new">Nowe wyzwanie</Link>
</Button>
```
(To wymaga też dodania `asChild` do komponentu `Button` — patrz sekcja 9.)

**4.2. `settings/page.tsx` linia 133-137** — `DialogTrigger` z raw CSS zamiast `<Button>`:
```tsx
// ŹLE — raw klasy, hardcodowany text-white zamiast text-destructive-foreground
<DialogTrigger className="inline-flex w-full items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-destructive/90">
  Usuń konto
</DialogTrigger>
```
**Powinno być:**
```tsx
<DialogTrigger asChild>
  <Button variant="destructive" className="w-full">Usuń konto</Button>
</DialogTrigger>
```

**4.3. `text-white` → `text-destructive-foreground`** — hardkodowany biały kolor w tym miejscu łamie design token system (w dark mode może wyglądać źle).

---

## 5. Spinner / loading — 2 kopie tego samego kodu

### Obecnie

- `onboarding/page.tsx` linia 162: `<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />`
- `challenge/new/page.tsx` linia 203: identyczny div

### Zmiana wymagana

**5.1.** Wyciągnąć do komponentu `src/components/spinner.tsx`:
```tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}
export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4",
    lg: "h-12 w-12 border-4",
  }[size];
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClass,
        className
      )}
    />
  );
}
```

**5.2.** Zastąpić oba wystąpienia `<Spinner />`.

---

## 6. Hover states na kartach — 3 różne opacity primary

| Miejsce | Klasa |
|---|---|
| `history/page.tsx` | `hover:border-primary/30` |
| `interest-card.tsx` | `hover:border-primary/40` |
| `challenge/new/page.tsx` (plan mode) | `hover:border-primary/50` |

### Zmiana wymagana

**6.1.** Ujednolicić na jedną wartość — proponuję `hover:border-primary/40` (środkowa). Wszystkie klikalne karty powinny mieć ten sam hover:
```tsx
"transition-all hover:border-primary/40 hover:shadow-sm"
```

---

## 7. Empty states — niespójny layout

| Strona | Wrapper | Padding | Icon? | CTA |
|---|---|---|---|---|
| `dashboard` (brak wyzwania) | `flex-col items-center justify-center` | `py-20` | ❌ brak | `<Button size="lg">` |
| `history` (brak historii) | `flex-col items-center justify-center` | `py-20` | ❌ brak | raw `<Link>` jako button |

### Zmiana wymagana

**7.1.** Wprowadzić komponent `EmptyState`:
```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-20 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
```

**7.2.** Zastąpić oba empty states w dashboard i history.

---

## 8. Nawigacja wstecz — brak spójnego wzorca

### Obecnie

- `onboarding` step discover: brak back
- `onboarding` step start: raw button `text-sm text-muted-foreground underline` → "Wróć do wyboru"
- `challenge/new` step plan: `<Button variant="ghost">` → "Wróć"
- `challenge/new` step review: `<Button variant="ghost">` → "Wróć"
- `summary`: brak back
- `challenge/[id]`: brak back do listy

### Zmiana wymagana

**8.1.** Wszędzie gdzie jest wielokrokowy flow używać `<Button variant="ghost">` z ikoną strzałki:
```tsx
<Button variant="ghost" onClick={back}>
  ← Wróć
</Button>
```

**8.2.** Usunąć raw underline link "Wróć do wyboru" z onboardingu i zastąpić ghost buttonem.

**8.3.** Dodać "← Wróć" na `summary` i `challenge/[id]` — teraz nie ma jak wyjść poza navbar.

---

## 9. 🐛 Bugi do naprawienia (nie UI, ale znalezione przy okazji)

### 9.1. TypeScript error w `auth/goodbye/page.tsx`

```
src/app/auth/goodbye/page.tsx(24,19): error TS2322: 
Property 'asChild' does not exist on type ButtonProps
```

Komponent `Button` w `src/components/ui/button.tsx` nie ma propa `asChild`. Do naprawy:

**Opcja A (lepsza):** Dodać `asChild` do `Button` używając Radix `Slot`:
```tsx
// button.tsx — dodać
import { Slot } from "@radix-ui/react-slot";
// ...
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

**Opcja B:** Zastąpić w goodbye:
```tsx
<Link href="/auth/login" className="inline-block w-full">
  <Button className="w-full">Wróć i załóż nowe konto</Button>
</Link>
```

**Rekomenduję A** — to standardowy pattern shadcn i pozwoli też naprawić sekcję 4.1 (history empty state).

### 9.2. Mock data / brak integracji — już w poprzednim dokumencie

Dashboard, challenge/[id], summary, settings — używają mock data z `TODO: Replace with real data`. To nie jest UI, ale wpływa na spójność (np. nie ma jak przetestować jak wygląda dashboard przy 0 wyzwaniach bo hasActiveChallenge jest `true` hardcoded).

---

## 10. Lista zmian (kolejność implementacji)

### Priorytet 1 — najbardziej widoczne
1. **Stworzyć `<Logo />`** — `src/components/logo.tsx`, użyć wszędzie (sekcja 1)
2. **Dodać logo na onboarding step 2, 3 i goodbye page** (sekcja 1.2)
3. **Ujednolicić max-width onboardingu** z `max-w-md` → `max-w-2xl` (sekcja 2.2)
4. **Naprawić TypeScript error** w goodbye — dodać `asChild` do Button (sekcja 9.1)

### Priorytet 2 — czyszczenie raw CSS
5. **History empty state** — użyć `<Button>` zamiast raw linka (sekcja 4.1)
6. **Settings delete button** — użyć `<Button variant="destructive">` zamiast raw CSS z `text-white` (sekcja 4.2, 4.3)
7. **Wyciągnąć `<Spinner />`** do wspólnego komponentu (sekcja 5)

### Priorytet 3 — systemowe
8. **Wyciągnąć `<PageContainer />`** i użyć w landingu, onboardingu, auth (sekcja 2.3)
9. **Wyciągnąć `<EmptyState />`** i użyć w dashboard + history (sekcja 7)
10. **Ujednolicić hover na kartach** — wszędzie `hover:border-primary/40` (sekcja 6)
11. **Skala typograficzna** — obniżyć onboarding step 1 h1 z `text-3xl` → `text-2xl` (sekcja 3)
12. **Ujednolicić przyciski "Wróć"** — wszędzie `<Button variant="ghost">← Wróć</Button>` (sekcja 8)

### Priorytet 4 — drobiazgi
13. Usunąć `font-bold` z onboarding step 1 logo, ustawić `font-semibold` jak reszta (sekcja 1.3)
14. Dodać back button na `/challenge/[id]` i `/summary` (sekcja 8.3)

---

## 11. Rzeczy które są OK i nie ruszamy

- **System kolorów w `globals.css`** — ciepła paleta peach/amber jest spójna, dark mode zdefiniowany, tokeny w dobrych miejscach
- **shadcn/ui components** — Card, Input, Label, Textarea, Checkbox, Dialog, Badge, Progress, Separator, Sonner toaster są używane konsekwentnie
- **Inter font** — jeden font w całej aplikacji
- **Navbar w (app) layoucie** — działa dobrze, jest sticky, ma active state
- **Polish copy** — ton jest ciepły i spójny, nie wymaga zmian
- **Mood emoji scale (1-5)** — używany spójnie w `summary` i `mood-check-in` (te same emoji)
- **Primary CTA pattern** — `<Button size="lg" className="w-full">` dla głównej akcji jest spójny

---

## Uwaga techniczna

Nie udało mi się uruchomić `next build` ani `next dev` w sandboxie z powodu braku dostępu sieciowego do pobrania binarki SWC z npm registry. To znaczy, że:
- Nie mogę pokazać screenshotów
- Nie mogę zweryfikować runtime errorów

Warto żebyś uruchomił `npm run build` lokalnie po wprowadzeniu tych zmian — TypeScript error w goodbye (sekcja 9.1) jest jedyny, który `tsc` wyłapuje teraz, ale reszta `tsc` przechodzi czysto.
