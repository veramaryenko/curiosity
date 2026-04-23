import { GoogleGenAI, ApiError } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export interface GroundingSource {
  url: string;
  title: string | null;
}

export interface GroundedResponse {
  text: string;
  sources: GroundingSource[];
}

export class GeminiUnavailableError extends Error {
  constructor() {
    super("Gemini API is temporarily unavailable");
    this.name = "GeminiUnavailableError";
  }
}

export async function chatWithGrounding(
  prompt: string,
  maxOutputTokens = 8192
): Promise<GroundedResponse> {
  try {
    const response = await getClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens,
      },
    });

    const candidate = response.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const sources: GroundingSource[] = chunks
      .filter((c) => c.web?.uri)
      .map((c) => ({ url: c.web!.uri!, title: c.web!.title ?? null }));

    return { text, sources };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 429)) {
      throw new GeminiUnavailableError();
    }
    throw err;
  }
}
