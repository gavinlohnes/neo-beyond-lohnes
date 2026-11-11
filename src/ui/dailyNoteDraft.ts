/**
 * The daily note's unsaved draft on this phone (sessionStorage), with the stored text it began from. Review of
 * #479/#480: keeping that base lets SAVE NOTE keep what another writer (a weekly interview, a quick tag) added since.
 * An older plain-text draft has no base. Storage can be blocked; then there is simply no draft.
 */
export interface NoteDraft { draft: string; base: string | undefined }
const key = (dayId: string) => `beyond.daily-note.draft.${dayId}`;

export function readNoteDraft(dayId: string): NoteDraft | null {
  let raw: string | null;
  try { raw = sessionStorage.getItem(key(dayId)); } catch { return null; }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && typeof (parsed as { draft?: unknown }).draft === "string") {
      const { draft, base } = parsed as { draft: string; base?: unknown };
      return { draft, base: typeof base === "string" ? base : undefined };
    }
  } catch { /* a plain-text draft from before the base was kept */ }
  return { draft: raw, base: undefined };
}

export function writeNoteDraft(dayId: string, draft: string, base: string | undefined): void {
  try { sessionStorage.setItem(key(dayId), JSON.stringify(base === undefined ? { draft } : { draft, base })); } catch { /* storage blocked */ }
}

export function clearNoteDraft(dayId: string): void {
  try { sessionStorage.removeItem(key(dayId)); } catch { /* storage blocked */ }
}
