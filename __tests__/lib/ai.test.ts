import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGroqCreate = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.GEMINI_API_KEY = "test-key";
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: mockGroqCreate } };
  },
}));

import {
  generateChallengePlan,
  reviewChallengePlan,
  generateReflectionInsight,
  generateDiscoveryPlan,
} from "@/lib/ai";

function makeGeminiResponse(text: string) {
  return {
    candidates: [
      {
        content: { parts: [{ text }] },
        groundingMetadata: { groundingChunks: [] },
      },
    ],
  };
}

function makeGroqResponse(text: string) {
  return { choices: [{ message: { content: text } }] };
}

const validTasks = [
  {
    day: 1,
    description: "Obejrzyj filmik o rysowaniu",
    resources: {
      video: { url: "https://www.youtube.com/watch?v=abc", title: "Rysowanie dla początkujących", channel: "ArtChannel" },
      article: null,
    },
  },
  { day: 2, description: "Narysuj koło", resources: null },
];

describe("generateChallengePlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parsuje poprawną odpowiedź JSON", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(JSON.stringify(validTasks)));
    const result = await generateChallengePlan("Rysowanie", "", 2);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe(1);
    expect(result[0].resources?.video?.url).toBe("https://www.youtube.com/watch?v=abc");
    expect(result[1].resources).toBeNull();
  });

  it("wyciąga JSON otoczony dodatkowym tekstem", async () => {
    const response = `Oto Twój plan:\n${JSON.stringify(validTasks)}\nPowodzenia!`;
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(response));
    const result = await generateChallengePlan("Rysowanie", "", 2);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe(1);
  });

  it("rzuca błąd gdy AI nie zwróci JSON", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse("Przepraszam, nie mogę pomóc."));
    await expect(generateChallengePlan("Rysowanie", "", 2)).rejects.toThrow(
      "AI did not return valid JSON"
    );
  });

  it("przekazuje tytuł i opis do modelu", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(JSON.stringify(validTasks)));
    await generateChallengePlan("Medytacja", "Chcę się wyciszyć", 7);
    const call = mockGenerateContent.mock.calls[0][0];
    const promptText = call.contents[0].parts[0].text as string;
    expect(promptText).toContain("Medytacja");
    expect(promptText).toContain("Chcę się wyciszyć");
    expect(promptText).toContain("7 dni");
  });

  it("używa modelu gemini-2.5-flash", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(JSON.stringify(validTasks)));
    await generateChallengePlan("Test", "", 7);
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.model).toMatch(/gemini/);
  });
});

describe("reviewChallengePlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca poprawiony plan z resources", async () => {
    const improved = [
      {
        day: 1,
        description: "Lepsze zadanie",
        resources: { video: null, article: { url: "https://example.com/art", title: "Artykuł", source: "example.com" } },
      },
    ];
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(JSON.stringify(improved)));
    const result = await reviewChallengePlan("Test", [{ day: 1, description: "Stare zadanie" }]);
    expect(result[0].description).toBe("Lepsze zadanie");
    expect(result[0].resources?.article?.url).toBe("https://example.com/art");
  });

  it("rzuca błąd gdy brak JSON w odpowiedzi", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse("Nie rozumiem."));
    await expect(
      reviewChallengePlan("Test", [{ day: 1, description: "zadanie" }])
    ).rejects.toThrow("AI did not return valid JSON");
  });
});

describe("generateDiscoveryPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parsuje plan z kategorią i zadaniami", async () => {
    const plan = {
      category: "Rysowanie",
      tasks: [
        { day: 1, description: "Zadanie 1", metric: "3 szkice", resources: null },
        {
          day: 2,
          description: "Zadanie 2",
          metric: "5 szkiców",
          resources: {
            video: { url: "https://www.youtube.com/watch?v=xyz", title: "Rysuj", channel: "ArtCh" },
            article: null,
          },
        },
      ],
    };
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(JSON.stringify(plan)));
    const result = await generateDiscoveryPlan("Rysowanie", "", 7);
    expect(result.category).toBe("Rysowanie");
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[1].resources?.video?.url).toBe("https://www.youtube.com/watch?v=xyz");
  });

  it("rzuca błąd gdy brak tablicy tasks", async () => {
    mockGenerateContent.mockResolvedValue(makeGeminiResponse('{"category":"X"}'));
    await expect(generateDiscoveryPlan("Test", "", 7)).rejects.toThrow(
      "AI response has no tasks array"
    );
  });
});

describe("generateReflectionInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca tekst insightu używając Groq", async () => {
    const insight = "Świetnie sobie poradziłeś z wyzwaniem.";
    mockGroqCreate.mockResolvedValue(makeGroqResponse(insight));
    const result = await generateReflectionInsight(
      "Rysowanie",
      [{ day: 1, mood_score: 4, note: "Fajnie" }],
      { overall_feeling: 4, liked: "Kreatywność", disliked: "Brak czasu", obstacles: "Praca" }
    );
    expect(result).toBe(insight);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("zwraca pusty string gdy brak treści w odpowiedzi", async () => {
    mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const result = await generateReflectionInsight("Test", [], {
      overall_feeling: 3,
      liked: "x",
      disliked: "y",
      obstacles: "z",
    });
    expect(result).toBe("");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
