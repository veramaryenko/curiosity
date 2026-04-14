import Groq from "groq-sdk";
import type { InterestSuggestion, DiscoveryPlanResult } from "@/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Llama 3.3 70B — dobra polska, szybki, darmowy
const MODEL = "llama-3.3-70b-versatile";

interface GeneratedTask {
  day: number;
  description: string;
  resource_url: string | null;
}

async function chat(content: string, maxTokens: number): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function generateChallengePlan(
  title: string,
  description: string,
  durationDays: number
): Promise<GeneratedTask[]> {
  const text = await chat(
    `Jesteś doświadczonym trenerem i mentorem w aplikacji Curiosity. Tworzysz realistyczne, konkretne plany, które uczą przez działanie — nie przez bierne oglądanie materiałów.

Użytkownik chce: "${title}"
${description ? `Kontekst od użytkownika: "${description}"` : ""}
Długość planu: ${durationDays} dni

ZASADY (rygorystycznie):

1. KONKRET zamiast ogólników. ZABRONIONE są zadania typu "obejrzyj filmik o X", "poczytaj o Y", "dowiedz się o Z" jako samodzielna treść. Każde zadanie MUSI jasno mówić CO fizycznie zrobić, z parametrami:
   - "zrób 3 serie po 8 powtórzeń ćwiczenia A"
   - "przez 10 minut napisz swobodne myśli na temat B"
   - "wykonaj sekwencję: krok 1, krok 2, krok 3"
   Jeśli temat wymaga wiedzy (technika, forma), WPISZ ją bezpośrednio w opis zadania — użytkownik nie powinien musieć szukać nigdzie indziej, żeby zacząć.

2. PROGRESJA. Pierwsze 2-3 dni mają niski próg (5-15 minut, łatwe) — ale nadal konkretne i praktyczne. Środek buduje umiejętność. Końcówka łączy elementy w większą całość lub zwiększa intensywność.

3. RÓŻNORODNOŚĆ. Nie powtarzaj tej samej struktury zadania każdego dnia. Każdy dzień to inny aspekt, inne ćwiczenie, albo nowy krok. Użytkownik ma czuć progres, a nie rutynę kopiuj-wklej.

4. SAMOWYSTARCZALNOŚĆ. Opis zadania ma być pełną instrukcją. Po przeczytaniu użytkownik wie dokładnie: co, jak, ile razy, jak długo. Żadnego "zobacz jakieś źródło i wymyśl".

5. BEZPIECZEŃSTWO — stosuj TYLKO jeśli temat wyzwania wprost dotyczy bólu, kontuzji, rehabilitacji, regeneracji po urazie lub stanu medycznego (np. "ból pleców", "kontuzja kolana", "rehabilitacja barku"). NIE stosuj tej zasady dla zwykłych tematów sportowych, fitness, jogi, nauki języka, hobby, kreatywności, produktywności itp. — tam żadne ostrzeżenia o bólu nie są potrzebne i są wręcz szkodliwe, bo wprowadzają niepokój bez powodu.
   Jeśli (i tylko jeśli) temat faktycznie dotyczy bólu/kontuzji/rehabilitacji:
   - W pierwszym zadaniu dnia 1 dodaj zdanie: "Uwaga: jeśli ból się nasila lub pojawiają się niepokojące objawy, przerwij i skonsultuj się z lekarzem lub fizjoterapeutą. Ten plan nie zastępuje porady specjalisty."
   - Używaj delikatnych, bezpiecznych wersji ćwiczeń; zaczynaj od pozycji leżącej, oddechu, delikatnej mobilności — nie od "wzmacniania".
   We wszystkich pozostałych przypadkach NIE wspominaj o bólu, lekarzu, fizjoterapeucie ani specjalistach.

6. CZAS. Każde zadanie realnie 10-30 minut. Oznacz czas w opisie tam gdzie to ma sens.

7. ZASOBY (resource_url). Dodawaj link TYLKO jeśli naprawdę znasz stabilne, darmowe źródło (np. konkretny kanał YouTube znanego twórcy, oficjalna strona organizacji). W razie wątpliwości użyj null. NIE wymyślaj linków — lepiej null.

8. JĘZYK. Polski, ciepły, bez presji i bez ocen. Nie używaj emoji. Pisz w formie bezosobowej lub "ty" — spójnie w całym planie.

Odpowiedz TYLKO jako JSON array, bez markdown, bez komentarzy, bez \`\`\`:
[{"day": 1, "description": "konkretny opis z instrukcją i parametrami", "resource_url": null lub "https://..."}, ...]`,
    4096
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function reviewChallengePlan(
  title: string,
  tasks: { day: number; description: string }[]
): Promise<{ day: number; description: string; resource_url: string | null }[]> {
  const text = await chat(
    `Jesteś doświadczonym trenerem w aplikacji Curiosity. Użytkownik sam napisał plan wyzwania "${title}". Twoje zadanie: ulepszyć go tak, aby był konkretny, bezpieczny i wykonalny bez szukania dodatkowych informacji.

Plan użytkownika:
${tasks.map((t) => `Dzień ${t.day}: ${t.description}`).join("\n")}

ZASADY ulepszania:

1. Zachowaj oryginalny zamysł i intencję każdego dnia. Nie zmieniaj tematyki — tylko doprecyzuj.

2. Jeśli zadanie jest ogólnikowe ("poćwicz", "naucz się X"), uczyń je konkretnym: dodaj liczbę powtórzeń, czas trwania, wylistuj kroki. Opis ma być pełną instrukcją — użytkownik po przeczytaniu wie CO i JAK zrobić bez dodatkowych pytań.

3. Jeśli zadanie to samo "obejrzyj filmik" / "poczytaj o", zastąp je (lub uzupełnij) konkretnym działaniem: ćwiczeniem, mini-praktyką, refleksją pisemną z prompt'em. Bierna konsumpcja bez działania jest zabroniona.

4. Sprawdź progresję — pierwsze dni łatwe, potem trudniej. Jeśli trzeba, popraw kolejność lub trudność.

5. BEZPIECZEŃSTWO — tylko jeśli temat wyzwania wprost dotyczy bólu, kontuzji, rehabilitacji lub stanu medycznego (np. "ból pleców", "kontuzja"), w zadaniu dnia 1 dodaj: "Uwaga: jeśli ból się nasila lub pojawiają się niepokojące objawy, przerwij i skonsultuj się ze specjalistą." i preferuj delikatne techniki. NIE dodawaj takich ostrzeżeń dla zwykłych tematów sportowych, fitness, jogi, nauki, hobby itp. — byłyby bez sensu.

6. Resource_url dodawaj tylko dla stabilnych, znanych źródeł. W razie wątpliwości null.

7. Polski, ciepły ton. Bez emoji.

Odpowiedz TYLKO jako JSON array, bez markdown, bez komentarzy:
[{"day": 1, "description": "ulepszony, konkretny opis", "resource_url": null lub "https://..."}, ...]`,
    4096
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function discoverInterests(
  freeText: string
): Promise<InterestSuggestion[]> {
  const text = await chat(
    `Użytkownik aplikacji Curiosity napisał: "${freeText}"
Curiosity pomaga ludziom odkrywać nowe zainteresowania przez codzienne mikro-zadania.

Zaproponuj 4-5 konkretnych wyzwań które mógłby/mogłaby spróbować.
Zasady:
- Tytuły krótkie, konkretne, bez "Jak", bez "Kurs"
- Opisy ciepłe, bez presji, max 1 zdanie
- Czas dzienny realny: 10–30 minut
- Zaproponuj różnorodne opcje jeśli input jest ogólny
- Pisz po polsku

Odpowiedz TYLKO jako JSON array, bez żadnego innego tekstu:
[{"title":"...","description":"...","emoji":"...","estimated_minutes":15},...]`,
    1024
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Sanitize a resource URL from the LLM: only allow YouTube search and Google search
 * URLs. LLMs hallucinate specific video/article URLs, but search URLs always work
 * because they are deterministic query strings.
 */
function sanitizeResourceUrl(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" && parsed.pathname === "/results") {
      return parsed.toString();
    }
    if (host === "google.com" && parsed.pathname === "/search") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a full day-by-day plan directly from the user's free-text goal.
 * Unlike the onboarding flow (which first picks from 4-5 interest ideas), this
 * function skips the "ideas" step and produces the concrete plan in one call.
 *
 * The returned plan has, for every day:
 *   - a specific action + "why" in 1-2 sentences
 *   - a measurable metric (e.g. "200 słów", "2 km", "15 minut")
 *   - an optional resource_url restricted to YouTube/Google search links
 */
export async function generateDiscoveryPlan(
  title: string,
  description: string,
  durationDays: number
): Promise<DiscoveryPlanResult> {
  const warmupEnd = Math.min(3, Math.max(1, Math.floor(durationDays * 0.2)));
  const buildEnd = Math.max(warmupEnd + 1, Math.floor(durationDays * 0.6));

  const prompt = `Jesteś ekspertem projektującym mikro-kursy w aplikacji Curiosity, która pomaga ludziom bez presji spróbować nowych rzeczy.

CEL UŻYTKOWNIKA: "${title}"
${description ? `OPIS: "${description}"` : ""}
DŁUGOŚĆ: ${durationDays} dni

=== KROK 1: WYKRYJ KATEGORIĘ ===
Najpierw rozpoznaj typ celu i dopasuj metryki:
- pisanie / kreatywne → słowa lub znaki (np. "200 słów")
- sport / ruch → kilometry, minuty, powtórzenia (np. "2 km", "10 pompek")
- nauka języka → nowe słowa, zdania, minuty czytania (np. "10 nowych słów")
- rysowanie / sztuka → liczba szkiców lub minuty (np. "3 szkice", "20 minut")
- muzyka → minuty gry, akordy, utwory (np. "15 minut gry", "2 akordy")
- programowanie / techniczne → ćwiczenia, linie kodu, tutoriale (np. "1 tutorial", "30 linii kodu")
- medytacja / mindfulness → minuty praktyki (np. "10 minut")
- gotowanie → przepisy, techniki (np. "1 przepis", "2 techniki")
- czytanie → strony, rozdziały (np. "20 stron")
- inne → zaproponuj sensowną mierzalną metrykę

Zapisz kategorię jednym krótkim stringiem po polsku (np. "Pisanie kreatywne", "Bieganie", "Nauka języka").

=== KROK 2: STRUKTURA PROGRESJI ===
- Dzień 1 do ${warmupEnd}: ROZGRZEWKA — bardzo łatwo, mała metryka, żeby user poczuł sukces
- Dzień ${warmupEnd + 1} do ${buildEnd}: BUDOWA NAWYKU — metryka rośnie ~30-50%
- Dzień ${buildEnd + 1} do ${durationDays}: WYZWANIE — większe porcje, własny projekt, zastosowanie
Każde zadanie ma zająć max 15-30 minut realnej pracy.

=== KROK 3: WYMAGANIA PER DZIEŃ ===
Każdy dzień MUSI mieć trzy pola:

1) description — konkretna akcja po polsku, 1-2 zdania, zawsze z krótkim "dlaczego":
   DOBRZE: "Napisz 200 słów o głównym bohaterze — jego wygląd, charakter, największe marzenie. To fundament, bez niego fabuła się nie zadziała."
   ŹLE: "Pomyśl o postaciach"
   ŹLE: "Spróbuj coś napisać"

2) metric — krótki, mierzalny cel (string, MAKSYMALNIE 5 słów):
   DOBRZE: "200 słów", "15 minut", "3 szkice", "2 km", "10 nowych słów"
   ŹLE: "trochę", "chwilkę", "kilka rzeczy", null
   Metryki MUSZĄ rosnąć między rozgrzewką, budową nawyku i wyzwaniem.

3) resource_url — link, TYLKO jeden z tych dwóch formatów, albo null:
   - https://www.youtube.com/results?search_query=SŁOWA+PO+POLSKU
   - https://www.google.com/search?q=SŁOWA+PO+POLSKU

   ⚠️ ABSOLUTNIE ZAKAZANE są inne linki. W szczególności:
   - ZAKAZ linków typu https://www.youtube.com/watch?v=XXXX
   - ZAKAZ linków do konkretnych artykułów, kursów, stron (medium.com, blogi, itd.)
   - ZAKAZ linków bez parametru search_query lub q
   Linki do konkretnych treści SĄ ZAWSZE ZMYŚLONE i nie działają. User klika i trafia w pustkę.
   Linki search zawsze działają, bo YouTube/Google same znajdą aktualne wyniki.

   Preferuj YouTube search dla dni praktycznych ("jak zrobić X"), Google search dla teoretycznych.
   Nie każdy dzień potrzebuje linku — dawaj resource_url tylko gdy user naprawdę potrzebuje zasobu (max 60% dni ma link, reszta to null).

=== ODPOWIEDŹ ===
Odpowiedz TYLKO jako JSON (bez markdown, bez wstępu):
{
  "category": "...",
  "tasks": [
    {"day": 1, "description": "...", "metric": "...", "resource_url": "https://www.youtube.com/results?search_query=..." },
    {"day": 2, "description": "...", "metric": "...", "resource_url": null},
    ...
  ]
}`;

  const text = await chat(prompt, 4096);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  const parsed = JSON.parse(jsonMatch[0]) as {
    category?: unknown;
    tasks?: unknown;
  };

  if (!Array.isArray(parsed.tasks)) {
    throw new Error("AI response has no tasks array");
  }

  const tasks = parsed.tasks
    .map((raw: unknown) => {
      const t = raw as Record<string, unknown>;
      const day = typeof t.day === "number" ? t.day : Number(t.day);
      const description =
        typeof t.description === "string" ? t.description.trim() : "";
      const metric =
        typeof t.metric === "string" && t.metric.trim().length > 0
          ? t.metric.trim()
          : null;
      const resource_url = sanitizeResourceUrl(t.resource_url);

      if (!Number.isFinite(day) || day < 1 || !description) return null;
      return { day, description, metric, resource_url };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.day - b.day);

  if (tasks.length === 0) {
    throw new Error("AI returned no valid tasks");
  }

  const category =
    typeof parsed.category === "string" && parsed.category.trim().length > 0
      ? parsed.category.trim()
      : "Nowy skill";

  return { category, tasks };
}

export async function generateReflectionInsight(
  challengeTitle: string,
  moodEntries: { day: number; mood_score: number; note: string | null }[],
  reflection: {
    overall_feeling: number;
    liked: string;
    disliked: string;
    obstacles: string;
  }
): Promise<string> {
  return chat(
    `Jesteś empatycznym asystentem w aplikacji Curiosity. Użytkownik właśnie ukończył wyzwanie "${challengeTitle}".

Wpisy nastrojów:
${moodEntries.map((e) => `Dzień ${e.day}: ${e.mood_score}/5${e.note ? ` — "${e.note}"` : ""}`).join("\n")}

Refleksja końcowa:
- Ogólne samopoczucie: ${reflection.overall_feeling}/5
- Co się podobało: ${reflection.liked}
- Co nie pasowało: ${reflection.disliked}
- Przeszkody: ${reflection.obstacles}

Napisz krótki (2-3 zdania), ciepły i wspierający insight. Zwróć uwagę na wzorce w nastrojach. Nie oceniaj, nie dawaj rad — po prostu pokaż co zauważasz. Pisz po polsku.`,
    512
  );
}
