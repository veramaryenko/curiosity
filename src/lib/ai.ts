import Groq from "groq-sdk";
import { chatWithGrounding } from "@/lib/gemini";
import type { Resources, DiscoveryPlanResult } from "@/types";

let groq: Groq | null = null;
function getGroq(): Groq {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GeneratedTask {
  day: number;
  description: string;
  resources: Resources | null;
}

function parseResources(raw: unknown): Resources | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let video = null;
  let article = null;

  if (r.video && typeof r.video === "object") {
    const v = r.video as Record<string, unknown>;
    if (typeof v.url === "string" && typeof v.title === "string" && typeof v.channel === "string") {
      video = {
        url: v.url,
        title: v.title,
        channel: v.channel,
        thumbnail: typeof v.thumbnail === "string" ? v.thumbnail : null,
        published_at: typeof v.published_at === "string" ? v.published_at : null,
      };
    }
  }

  if (r.article && typeof r.article === "object") {
    const a = r.article as Record<string, unknown>;
    if (typeof a.url === "string" && typeof a.title === "string" && typeof a.source === "string") {
      article = {
        url: a.url,
        title: a.title,
        source: a.source,
      };
    }
  }

  if (!video && !article) return null;
  return { video, article };
}

const RESOURCES_PROMPT = `
3) resources — obiekt z opcjonalnymi polami video i article, albo null dla prostych zadań:

{
  "video": { "url": "...", "title": "...", "channel": "..." } | null,
  "article": { "url": "...", "title": "...", "source": "..." } | null
} | null

ZASADY:
- URL-e MUSZĄ pochodzić z REALNYCH wyników Google Search (masz włączony tool googleSearch — używaj go).
- video.url to KONKRETNY film YouTube (format https://www.youtube.com/watch?v=... lub https://youtu.be/...).
  Wybierz film z kanału z >10k subów, z dużą liczbą wyświetleń, nie starszy niż 5 lat.
  Przy podobnej jakości — preferuj świeższe.
- article.url to konkretny artykuł/poradnik z realnej strony (medium, blogi, dokumentacja).
- Dla prostych zadań ("napisz 200 słów", "zrób 10 pompek") zwróć resources: null.
- Dla zadań teoretycznych często wystarczy article bez video.
- Dla zadań praktycznych ("jak zrobić X") daj video albo oba.
- NIGDY nie zmyślaj URL-a. Jeśli nie znalazłeś dobrego wyniku — zwróć null dla danego pola.`;

export async function generateChallengePlan(
  title: string,
  description: string,
  durationDays: number
): Promise<GeneratedTask[]> {
  const { text } = await chatWithGrounding(
    `Jesteś doświadczonym trenerem i mentorem w aplikacji Curiosity. Tworzysz realistyczne, konkretne plany, które uczą przez działanie — nie przez bierne oglądanie materiałów.

Użytkownik chce: "${title}"
${description ? `Kontekst od użytkownika: "${description}"` : ""}
Długość planu: ${durationDays} dni

ZASADY (rygorystycznie):

1. KONKRET zamiast ogólników. Każde zadanie MUSI jasno mówić CO fizycznie zrobić, z parametrami.

2. PROGRESJA. Pierwsze 2-3 dni mają niski próg — ale nadal konkretne i praktyczne. Środek buduje umiejętność. Końcówka łączy elementy w większą całość.

3. RÓŻNORODNOŚĆ. Nie powtarzaj tej samej struktury zadania każdego dnia.

4. SAMOWYSTARCZALNOŚĆ. Opis zadania ma być pełną instrukcją.

5. BEZPIECZEŃSTWO — stosuj TYLKO jeśli temat wprost dotyczy bólu, kontuzji lub rehabilitacji.

6. CZAS. Każde zadanie realnie 10-30 minut.

7. JĘZYK. Polski, ciepły, bez presji.
${RESOURCES_PROMPT}

Odpowiedz TYLKO jako JSON array, bez markdown, bez komentarzy, bez \`\`\`:
[{"day": 1, "description": "...", "resources": {"video": {"url": "...", "title": "...", "channel": "..."}, "article": null} }, ...]`,
    4096
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
  return parsed.map((t) => ({
    day: typeof t.day === "number" ? t.day : Number(t.day),
    description: typeof t.description === "string" ? t.description.trim() : "",
    resources: parseResources(t.resources),
  }));
}

export async function reviewChallengePlan(
  title: string,
  tasks: { day: number; description: string }[]
): Promise<{ day: number; description: string; resources: Resources | null }[]> {
  const { text } = await chatWithGrounding(
    `Jesteś doświadczonym trenerem w aplikacji Curiosity. Użytkownik sam napisał plan wyzwania "${title}". Twoje zadanie: ulepszyć go tak, aby był konkretny, bezpieczny i wykonalny.

Plan użytkownika:
${tasks.map((t) => `Dzień ${t.day}: ${t.description}`).join("\n")}

ZASADY ulepszania:

1. Zachowaj oryginalny zamysł i intencję każdego dnia. Nie zmieniaj tematyki — tylko doprecyzuj.

2. Jeśli zadanie jest ogólnikowe, uczyń je konkretnym: dodaj liczbę powtórzeń, czas trwania, wylistuj kroki.

3. Sprawdź progresję — pierwsze dni łatwe, potem trudniej.

4. BEZPIECZEŃSTWO — tylko jeśli temat wprost dotyczy bólu lub kontuzji.

5. Polski, ciepły ton.
${RESOURCES_PROMPT}

Odpowiedz TYLKO jako JSON array, bez markdown, bez komentarzy:
[{"day": 1, "description": "...", "resources": null}, ...]`,
    4096
  );

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
  return parsed.map((t) => ({
    day: typeof t.day === "number" ? t.day : Number(t.day),
    description: typeof t.description === "string" ? t.description.trim() : "",
    resources: parseResources(t.resources),
  }));
}

export async function discoverInterests(
  freeText: string
): Promise<import("@/types").InterestSuggestion[]> {
  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Użytkownik aplikacji Curiosity napisał: "${freeText}"
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
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

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
Najpierw rozpoznaj typ celu i dopasuj metryki (pisanie → słowa, sport → km/minuty, nauka języka → słowa/minuty, itd.)
Zapisz kategorię jednym krótkim stringiem po polsku (np. "Pisanie kreatywne").

=== KROK 2: STRUKTURA PROGRESJI ===
- Dzień 1 do ${warmupEnd}: ROZGRZEWKA — bardzo łatwo, mała metryka
- Dzień ${warmupEnd + 1} do ${buildEnd}: BUDOWA NAWYKU — metryka rośnie ~30-50%
- Dzień ${buildEnd + 1} do ${durationDays}: WYZWANIE — większe porcje, własny projekt
Każde zadanie max 15-30 minut.

=== KROK 3: WYMAGANIA PER DZIEŃ ===
Każdy dzień MUSI mieć trzy pola:

1) description — konkretna akcja po polsku, 1-2 zdania z krótkim "dlaczego"

2) metric — krótki, mierzalny cel (string, MAKSYMALNIE 5 słów):
   DOBRZE: "200 słów", "15 minut", "3 szkice"
   Metryki MUSZĄ rosnąć między rozgrzewką, budową nawyku i wyzwaniem.
${RESOURCES_PROMPT}

=== ODPOWIEDŹ ===
Odpowiedz TYLKO jako JSON (bez markdown, bez wstępu):
{
  "category": "...",
  "tasks": [
    {"day": 1, "description": "...", "metric": "...", "resources": {"video": {"url": "...", "title": "...", "channel": "..."}, "article": null} },
    {"day": 2, "description": "...", "metric": "...", "resources": null},
    ...
  ]
}`;

  const { text } = await chatWithGrounding(prompt, 4096);

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
      const resources = parseResources(t.resources);

      if (!Number.isFinite(day) || day < 1 || !description) return null;
      return { day, description, metric, resources };
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
  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Jesteś empatycznym asystentem w aplikacji Curiosity. Użytkownik właśnie ukończył wyzwanie "${challengeTitle}".

Wpisy nastrojów:
${moodEntries.map((e) => `Dzień ${e.day}: ${e.mood_score}/5${e.note ? ` — "${e.note}"` : ""}`).join("\n")}

Refleksja końcowa:
- Ogólne samopoczucie: ${reflection.overall_feeling}/5
- Co się podobało: ${reflection.liked}
- Co nie pasowało: ${reflection.disliked}
- Przeszkody: ${reflection.obstacles}

Napisz krótki (2-3 zdania), ciepły i wspierający insight. Zwróć uwagę na wzorce w nastrojach. Nie oceniaj, nie dawaj rad — po prostu pokaż co zauważasz. Pisz po polsku.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}
