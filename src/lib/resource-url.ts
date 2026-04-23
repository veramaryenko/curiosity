export function isHttpsUrl(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("https://");
}
