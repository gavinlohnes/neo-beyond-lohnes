/**
 * HOTFIX (BODY logging trust, owner ruling 2026-10-03): the one place a
 * caught error becomes words on screen. Commands validate with zod, and a
 * ZodError's own `message` is the raw JSON of its issues — never something
 * to show. Validation stays where it is (six *Validation.ts files share the
 * same "At least one field must change" refine); only how it reads changes,
 * here, for every screen at once.
 *
 * - A validation failure shows its issue messages as plain sentences;
 *   "At least one field must change" reads as "No changes."
 * - "SOME_CODE: human text" shows just the human text.
 * - A bare code, JSON, or anything that isn't an Error shows `fallback`.
 */
const NO_CHANGE_ISSUE = "At least one field must change";
export const NO_CHANGES_MESSAGE = "No changes.";

export function describeError(error: unknown, fallback: string): string {
  const issues = zodIssueMessages(error);
  if (issues) {
    if (issues.length === 0) return fallback;
    if (issues.every((m) => m === NO_CHANGE_ISSUE)) return NO_CHANGES_MESSAGE;
    return [...new Set(issues.filter((m) => m !== NO_CHANGE_ISSUE))].map(asSentence).join(" ");
  }
  if (!(error instanceof Error)) return fallback;
  const text = error.message.trim();
  if (!text || text.startsWith("[") || text.startsWith("{")) return fallback;
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) return fallback;
  const coded = /^[A-Z][A-Z0-9_]*:\s*(.+)$/s.exec(text);
  return asSentence(coded ? coded[1]! : text);
}

/** Duck-typed so the UI layer needn't depend on zod itself. */
function zodIssueMessages(error: unknown): string[] | null {
  if (typeof error !== "object" || error === null) return null;
  const { name, issues } = error as { name?: unknown; issues?: unknown };
  if (name !== "ZodError" || !Array.isArray(issues)) return null;
  return issues
    .map((issue) => (issue as { message?: unknown }).message)
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    .map((m) => m.trim());
}

function asSentence(text: string): string {
  const t = text.trim();
  const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
