import Groq from "groq-sdk";
import type { InterestSuggestion } from "@/types";

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
    `Jesteś ciepłym, wspierającym asystentem w aplikacji Curiosity, która pomaga ludziom odkrywać nowe zainteresowania.

Użytkownik chce spróbować: "${title}"
${description ? `Dodatkowy opis: "${description}"` : ""}
Okres wyzwania: ${durationDays} dni

Stwórz plan na ${durationDays} dni z codziennymi mikro-zadaniami. Zasady:
- Pierwsze dni powinny być BARDZO proste (np. "obejrzyj 10-minutowy filmik", "przeczytaj artykuł")
- Stopniowo zwiększaj trudność
- Każde zadanie powinno zajmować max 15-30 minut
- Jeśli znasz dobre ogólnodostępne zasoby (YouTube, kursy), dodaj linki
- Pisz po polsku, ciepło i bez presji
- Nie używaj emoji w opisach zadań

Odpowiedz TYLKO jako JSON array, bez żadnego innego tekstu:
[{"day": 1, "description": "opis zadania", "resource_url": "https://..." lub null}, ...]`,
    2048
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
    `Jesteś ciepłym asystentem w aplikacji Curiosity. Użytkownik sam napisał plan wyzwania "${title}".

Oto jego plan:
${tasks.map((t) => `Dzień ${t.day}: ${t.description}`).join("\n")}

Sprawdź plan i zaproponuj ulepszenia:
- Czy trudność rośnie stopniowo?
- Czy zadania na początek są wystarczająco proste?
- Czy brakuje jakichś kroków?
- Dodaj linki do darmowych zasobów tam gdzie to ma sens

Zachowaj oryginalny zamysł użytkownika. Popraw tylko to co wymaga poprawy.
Pisz po polsku.

Odpowiedz TYLKO jako JSON array:
[{"day": 1, "description": "opis zadania", "resource_url": "https://..." lub null}, ...]`,
    2048
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
