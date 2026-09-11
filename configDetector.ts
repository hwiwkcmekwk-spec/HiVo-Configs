/**
 * Finds every "scheme://..." looking token inside a block of free text,
 * including messages with multiple configs mixed with explanatory text.
 * Uses whitespace as the boundary, since config URIs never contain
 * spaces or newlines in any of the supported protocols.
 */
const CONFIG_TOKEN_RE = /[a-zA-Z0-9+.-]+:\/\/[^\s]+/g;

export function detectCandidates(rawText: string): string[] {
  if (!rawText) return [];

  const matches = rawText.match(CONFIG_TOKEN_RE) ?? [];

  // Trim common trailing punctuation that Telegram formatting/copy often
  // appends (closing parens, quotes, markdown artifacts) without touching
  // the query string / fragment which can legitimately end in those chars
  // less often than plain prose does.
  const cleaned = matches.map((m) => m.replace(/[)\]}>,.;!?'"]+$/g, ""));

  // De-duplicate exact repeats within the same message (still goes through
  // the real dedup/fingerprint pipeline afterward for cross-message checks).
  return Array.from(new Set(cleaned));
}
