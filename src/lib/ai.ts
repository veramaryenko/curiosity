import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GeneratedTask {
  day: number;
  description: string;
  resource_url: string | null;
}

export async function generateChallengePlan(
  title: string,
  description: string,
  durationDays: number
): Promise<GeneratedTask[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Jesteś ciepłym, wspierającym asystentem w aplikacji Curiosity, która pomaga ludziom odkrywać nowe zainteresowania.

Użytkownik chce spróbować: "${title}"
${description ? `Dodatkowy opis: "${description}"` : ""}
Okres wyzwania: ${durationDays} dni

Stwórz plan na ${durationDays} dni z codziennymi mikro-zadaniami. Zasady:
- Pierwsze dni powinny być BARDZO proste (np. "obejrzyj 10-minutowy filmik", "przeczytaj artykuł")
- Stopniowo zwiększaj trudność
- Każde zadanie powinno zajmować max 15-30 minut
- Jeśli znasz dobre darmowe zasoby (YouTube, kursy), dodaj linki
- Pisz po polsku, ciepło i bez presji
- Nie używaj emoji w opisach zadań

Odpowiedz TYLKO jako JSON array, bez żadnego innego tekstu:
[{"day": 1, "description": "opis zadania", "resource_url": "https://..." lub null}, ...]`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function reviewChallengePlan(
  title: string,
  tasks: { day: number; description: string }[]
): Promise<{ day: number; description: string; resource_url: string | null }[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Jesteś ciepłym asystentem w aplikacji Curiosity. Użytkownik sam napisał plan wyzwania "${title}".

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
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid JSON");
  }

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
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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

  return message.content[0].type === "text" ? message.content[0].text : "";
}
