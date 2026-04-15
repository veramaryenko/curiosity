/**
 * Allow only deterministic search URLs. This avoids storing arbitrary external
 * links while still letting plans point users to safe search results.
 */
export function sanitizeResourceUrl(url: unknown): string | null {
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
