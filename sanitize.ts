/** Truncates long text for log/preview purposes without ever exposing secrets structurally. */
export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}
