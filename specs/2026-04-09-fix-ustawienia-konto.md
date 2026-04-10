# Fix: Wyloguj się i Usuń konto

## Co to robi (dla użytkownika)

Naprawia dwa niedziałające przyciski na stronie `/settings`:

- **Wyloguj się** — po kliknięciu użytkownik jest wylogowywany i trafia na `/auth/login`
- **Usuń konto** — po potwierdzeniu w dialogu: dane użytkownika są usuwane z bazy,
  konto auth jest kasowane, użytkownik jest wylogowywany i trafia na `/auth/login`.
  Podczas usuwania przycisk pokazuje „Usuwam…" i jest zablokowany. Błędy są widoczne
  w dialogu zamiast znikać w ciszy.

## Gdzie w aplikacji

| Plik | Akcja |
|------|-------|
| `src/app/(app)/settings/page.tsx` | **ZMIENIONY** — naprawiony `signOut()` i `deleteAccount()` |
| `src/app/api/account/route.ts` | **NOWY** — endpoint `DELETE /api/account` |

## Szczegóły implementacji

### `signOut()` — settings/page.tsx

```ts
async function signOut() {
  const supabase = createClient();          // @/lib/supabase/client
  await supabase.auth.signOut();
  router.push("/auth/login");
}
```

Wymaga: `useRouter` z `next/navigation`, `createClient` z `@/lib/supabase/client`.

---

### `deleteAccount()` — settings/page.tsx

Nowe stany:
- `deleting: boolean` — blokuje przyciski i pokazuje „Usuwam…"
- `deleteError: string | null` — wyświetlany wewnątrz dialogu

Flow:
1. `setDeleting(true)`, wyczyść poprzedni błąd
2. `fetch("DELETE /api/account")`
3. Sukces → `supabase.auth.signOut()` → `router.push("/auth/login")`
4. Błąd → zapisz do `deleteError`, `setDeleting(false)` (dialog zostaje otwarty)

Dialog nie zamyka się podczas usuwania (`onOpenChange` zablokowane gdy `deleting === true`).
Po zamknięciu dialogu `deleteError` jest czyszczony.

---

### `DELETE /api/account` — nowy endpoint

Plik: `src/app/api/account/route.ts`

Kolejność operacji (kolejność ważna — children przed parent):
1. Pobierz `challenge_ids` usera
2. `DELETE daily_tasks WHERE challenge_id IN (challenge_ids)`
3. `DELETE mood_entries WHERE user_id = user.id`
4. `DELETE reflections WHERE user_id = user.id`
5. `DELETE challenges WHERE user_id = user.id`
6. `DELETE notification_preferences WHERE user_id = user.id`
7. `adminClient.auth.admin.deleteUser(user.id)` — wymaga `SUPABASE_SERVICE_ROLE_KEY`

Admin client tworzony inline przez `createClient` z `@supabase/supabase-js`
z `{ auth: { autoRefreshToken: false, persistSession: false } }`.

Zwraca `{ success: true }` lub `{ error: string }` z odpowiednim HTTP status.

---

## Wymagane zmienne środowiskowe

`SUPABASE_SERVICE_ROLE_KEY` — musi być ustawiony w `.env.local` i na Vercel.
Bez niego endpoint zwraca 500 z komunikatem `"Server configuration error"`.

---

## Kryteria akceptacji

- [ ] Kliknięcie „Wyloguj się" wylogowuje i przekierowuje na `/auth/login`
- [ ] Kliknięcie „Tak, usuń konto" pokazuje „Usuwam…" i blokuje oba przyciski
- [ ] Po sukcesie użytkownik trafia na `/auth/login` i nie może wrócić na `/dashboard`
- [ ] Jeśli API zwróci błąd — komunikat pojawia się w dialogu, dialog zostaje otwarty
- [ ] Dialog nie daje się zamknąć kliknięciem X ani Escape podczas usuwania
- [ ] `DELETE /api/account` zwraca 401 dla niezalogowanego żądania
- [ ] `DELETE /api/account` zwraca 500 gdy brak `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Po usunięciu konto nie istnieje w Supabase Auth (weryfikacja w dashboard)

## Nie robimy (scope)

- Nie robimy emaila potwierdzającego usunięcie konta
- Nie robimy 30-dniowego okresu karencji / soft-delete
- Nie naprawiamy `savePreferences()` — to osobny TODO
- Nie robimy testu E2E dla całego flow (tylko jednostkowe dla endpointu)
