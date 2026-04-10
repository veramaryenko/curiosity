import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures mockCreate is available inside the vi.mock factory
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import {
  generateChallengePlan,
  reviewChallengePlan,
  generateReflectionInsight,
} from "@/lib/ai";

function makeTextResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

const validTasks = [
  { day: 1, description: "Obejrzyj filmik o rysowaniu", resource_url: "https://youtube.com/watch?v=abc" },
  { day: 2, description: "Narysuj koło", resource_url: null },
];

describe("generateChallengePlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parsuje poprawną odpowiedź JSON", async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(validTasks)));
    const result = await generateChallengePlan("Rysowanie", "", 2);
    expect(result).toEqual(validTasks);
  });

  it("wyciąga JSON otoczony dodatkowym tekstem", async () => {
    const response = `Oto Twój plan:\n${JSON.stringify(validTasks)}\nPowodzenia!`;
    mockCreate.mockResolvedValue(makeTextResponse(response));
    const result = await generateChallengePlan("Rysowanie", "", 2);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe(1);
  });

  it("rzuca błąd gdy AI nie zwróci JSON", async () => {
    mockCreate.mockResolvedValue(makeTextResponse("Przepraszam, nie mogę pomóc."));
    await expect(generateChallengePlan("Rysowanie", "", 2)).rejects.toThrow(
      "AI did not return valid JSON"
    );
  });

  it("przekazuje tytuł i opis do modelu", async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(validTasks)));
    await generateChallengePlan("Medytacja", "Chcę się wyciszyć", 7);
    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("Medytacja");
    expect(call.messages[0].content).toContain("Chcę się wyciszyć");
    expect(call.messages[0].content).toContain("7 dni");
  });

  it("używa modelu claude-sonnet", async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(validTasks)));
    await generateChallengePlan("Test", "", 7);
    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toMatch(/claude-sonnet/);
  });
});

describe("reviewChallengePlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca poprawiony plan", async () => {
    const improved = [
      { day: 1, description: "Lepsze zadanie", resource_url: "https://example.com" },
    ];
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(improved)));
    const result = await reviewChallengePlan("Test", [{ day: 1, description: "Stare zadanie" }]);
    expect(result).toEqual(improved);
  });

  it("rzuca błąd gdy brak JSON w odpowiedzi", async () => {
    mockCreate.mockResolvedValue(makeTextResponse("Nie rozumiem."));
    await expect(
      reviewChallengePlan("Test", [{ day: 1, description: "zadanie" }])
    ).rejects.toThrow("AI did not return valid JSON");
  });
});

describe("generateReflectionInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca tekst insightu", async () => {
    const insight = "Świetnie sobie poradziłeś z wyzwaniem.";
    mockCreate.mockResolvedValue(makeTextResponse(insight));
    const result = await generateReflectionInsight(
      "Rysowanie",
      [{ day: 1, mood_score: 4, note: "Fajnie" }],
      { overall_feeling: 4, liked: "Kreatywność", disliked: "Brak czasu", obstacles: "Praca" }
    );
    expect(result).toBe(insight);
  });

  it("zwraca pusty string gdy typ odpowiedzi nie jest tekstem", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "image", source: {} }] });
    const result = await generateReflectionInsight("Test", [], {
      overall_feeling: 3,
      liked: "x",
      disliked: "y",
      obstacles: "z",
    });
    expect(result).toBe("");
  });
});
