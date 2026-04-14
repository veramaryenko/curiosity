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
