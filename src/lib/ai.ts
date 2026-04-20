import Groq from "groq-sdk";
import type {
  ClarifyGoalResult,
  ClarifyingQuestion,
  DiscoveryPlanResult,
  InterestSuggestion,
} from "@/types";
import { sanitizeResourceUrl } from "@/lib/resource-url";

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

/**
 * Asks the LLM whether a goal is unambiguous enough to plan, and if not,
 * returns 1-3 clarifying questions to ask the user first. Inspired by
 * Duolingo's placement test and ChatGPT's "clarifying questions" pattern —
 * we don't want to assume someone wanting to "start cycling" is learning
 * from scratch when they may just want a riding habit.
 *
 * Returns an empty `questions` array when the goal is already specific
 * enough to plan directly (e.g. "przeczytać 3 książki w 30 dni").
 */
export async function clarifyGoal(
  title: string,
  description: string
): Promise<ClarifyGoalResult> {
  const text = await chat(
    `Jesteś doświadczonym trenerem w aplikacji Curiosity. Twoim zadaniem jest ZADAĆ pytania uzupełniające, ZANIM zaplanujesz wyzwanie — żeby plan trafił w realny poziom i potrzeby użytkownika.

Cel użytkownika: "${title}"
${description ? `Dodatkowy kontekst: "${description}"` : ""}

=== ZASADY ===

1. WYKRYJ KATEGORIĘ celu (np. "Jazda na rowerze", "Nauka języka", "Pisanie", "Bieganie", "Medytacja", "Gotowanie", "Programowanie", "Muzyka").

2. OCEŃ WIELOZNACZNOŚĆ. Zadawaj pytania TYLKO jeśli bez nich plan może mocno chybić. Najczęstsze ryzyka:
   - Niewiadomy POZIOM użytkownika (np. "zacząć jeździć rowerem" — może umieć od dawna, może nie umieć wcale; "nauczyć się angielskiego" — A1 czy B2)
   - Niejasna INTENCJA (np. "rower" — rekreacja w weekend, dojazdy do pracy, dłuższe trasy)
   - Brak kluczowego OGRANICZENIA (czas dziennie, sprzęt, kontuzje — TYLKO jeśli realnie może zmienić plan)

3. JEŚLI cel JEST już konkretny (np. "przeczytać 3 książki w 30 dni", "napisać 200 słów dziennie", "10 pompek codziennie"), zwróć \`questions: []\`.

4. JEŚLI użytkownik W OPISIE już podał poziom / intencję, NIE pytaj o to ponownie. Pytaj tylko o to, czego naprawdę nie wiesz.

5. MAKSYMALNIE 3 pytania. Najczęściej 1-2 wystarczą. Każde pytanie musi REALNIE zmieniać plan, gdyby odpowiedź była inna.

6. STYL pytań:
   - Polski, ciepły, krótki, bez oceny
   - Pierwsze pytanie najlepiej "single" (radio) z 3-5 opcjami pokrywającymi spektrum (zero / podstawy / średni / zaawansowany — ale dopasowane do tematu, nie generyczne)
   - Drugie/trzecie może być "text" jeśli odpowiedź jest niuansowa
   - Opcje mają opisywać RZECZYWISTOŚĆ użytkownika, nie sucho ("Nigdy nie jeździłam/em" — nie "Poziom 1")

7. KAŻDE pytanie ma id (krótki, snake_case, np. "level", "intent", "constraint"), question, type ("single" lub "text"), opcjonalnie options (dla "single") lub placeholder (dla "text").

=== ODPOWIEDŹ ===
Zwróć TYLKO JSON, bez markdown, bez komentarzy:
{
  "category": "...",
  "questions": [
    {"id": "level", "question": "...", "type": "single", "options": ["...", "...", "..."]},
    {"id": "intent", "question": "...", "type": "text", "placeholder": "np. ..."}
  ]
}

Jeśli cel jest jednoznaczny: {"category": "...", "questions": []}`,
    1024
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  const parsed = JSON.parse(jsonMatch[0]) as {
    category?: unknown;
    questions?: unknown;
  };

  const category =
    typeof parsed.category === "string" && parsed.category.trim().length > 0
      ? parsed.category.trim()
      : "Nowe wyzwanie";

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: ClarifyingQuestion[] = rawQuestions
    .map((raw): ClarifyingQuestion | null => {
      const q = raw as Record<string, unknown>;
      const id = typeof q.id === "string" ? q.id.trim() : "";
      const question = typeof q.question === "string" ? q.question.trim() : "";
      const type = q.type === "single" || q.type === "text" ? q.type : null;
      if (!id || !question || !type) return null;

      if (type === "single") {
        const options = Array.isArray(q.options)
          ? q.options.filter(
              (o): o is string => typeof o === "string" && o.trim().length > 0
            )
          : [];
        if (options.length < 2) return null;
        return { id, question, type, options };
      }

      const placeholder =
        typeof q.placeholder === "string" ? q.placeholder.trim() : undefined;
      return { id, question, type, placeholder };
    })
    .filter((q): q is ClarifyingQuestion => q !== null)
    .slice(0, 3);

  return { category, questions };
}

export async function generateChallengePlan(
  title: string,
  description: string,
  durationDays: number,
  context?: Record<string, string>
): Promise<GeneratedTask[]> {
  const contextEntries = context
    ? Object.entries(context).filter(([, v]) => v && v.trim().length > 0)
    : [];
  const contextBlock = contextEntries.length
    ? `\nOdpowiedzi użytkownika na pytania uzupełniające (TRAKTUJ JE JAKO PRAWDĘ — dopasuj poziom, intencję i progresję):\n${contextEntries
        .map(([k, v]) => `- ${k}: ${v.trim()}`)
        .join("\n")}\n`
    : "";

  const text = await chat(
    `Jesteś doświadczonym trenerem i mentorem w aplikacji Curiosity. Tworzysz realistyczne, konkretne plany, które uczą przez działanie — nie przez bierne oglądanie materiałów.

Użytkownik chce: "${title}"
${description ? `Kontekst od użytkownika: "${description}"` : ""}${contextBlock}
Długość planu: ${durationDays} dni

ZASADY (rygorystycznie):

1. KONKRET zamiast ogólników. ZABRONIONE są zadania typu "obejrzyj filmik o X", "poczytaj o Y", "dowiedz się o Z" jako samodzielna treść. Każde zadanie MUSI jasno mówić CO fizycznie zrobić, z parametrami:
   - "zrób 3 serie po 8 powtórzeń ćwiczenia A"
   - "przez 10 minut napisz swobodne myśli na temat B"
   - "wykonaj sekwencję: krok 1, krok 2, krok 3"
   Jeśli temat wymaga wiedzy (technika, forma), WPISZ ją bezpośrednio w opis zadania — użytkownik nie powinien musieć szukać nigdzie indziej, żeby zacząć.

2. PROGRESJA dopasowana do POZIOMU użytkownika z kontekstu (jeśli jest):
   - Jeśli użytkownik startuje od ZERA / jest początkujący → pierwsze 2-3 dni niski próg (5-15 minut, łatwe), ale konkretne. NIE zaczynaj od ćwiczeń wymagających wcześniejszej umiejętności.
   - Jeśli użytkownik UMIE już podstawy / jest średnio-zaawansowany → POMIŃ etap "od zera". Dzień 1 ma być od razu sensowną praktyką dopasowaną do poziomu (np. dla osoby która umie jeździć rowerem — krótka rozjazdówka, a nie "stań na rowerze i poczuj balans"). Nie marnuj dni na rzeczy, które user już umie.
   - Środek buduje umiejętność. Końcówka łączy elementy lub zwiększa intensywność/dystans/trudność.
   Jeśli kontekst nie precyzuje poziomu, ostrożnie załóż początkujący — ale NIE wstawiaj zadań typu "sprawdź czy umiesz X", "poznaj podstawy Y" jako osobnych dni; rób od razu mikro-praktykę.

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
