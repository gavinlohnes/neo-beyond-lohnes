import { db } from "../persistence/db";
import type { DailyNote } from "../domain/dailyNotes";
import { DAILY_NOTE_WRITE_TABLES, writeAtomically } from "./atomicWrite";

export async function saveDailyNote(dayId: string, rawText: string): Promise<DailyNote> {
  const text = rawText.trim();
  if (!text) throw new Error("DAILY_NOTE_EMPTY: write something before saving.");
  if (text.length > 20_000) throw new Error("DAILY_NOTE_TOO_LONG: keep the note under 20,000 characters.");
  return writeAtomically(DAILY_NOTE_WRITE_TABLES, async () => {
    if (!(await db.beyondDays.get(dayId))) throw new Error(`DAY_NOT_FOUND: no lived day with id ${dayId}.`);
    const existing = await db.dailyNotes.get(dayId);
    const now = new Date().toISOString();
    const note: DailyNote = { dayId, text, createdAt: existing?.createdAt ?? now, updatedAt: now };
    await db.dailyNotes.put(note);
    return note;
  });
}

/** UNLINKED-001: link the first plain mention of `label` in one day's note, through the ordinary save. */
export async function linkMentionInDailyNote(dayId: string, label: string) {
  const { linkFirstMention } = await import("./connectionQueries");
  const note = await db.dailyNotes.get(dayId);
  const next = note ? linkFirstMention(note.text, label) : null;
  if (!next) throw new Error("NOTHING_TO_LINK");
  return saveDailyNote(dayId, next);
}

/**
 * Review of #479/#480 (data loss): save a draft only against the note it was written from. `base` is the stored text
 * when the draft began. If the stored note is unchanged, the draft is saved. If something was only appended since
 * (a weekly interview's #timeline block), that part is kept at the end of the draft. Any other change is a conflict:
 * nothing is written, and the operator chooses.
 */
export type GuardedSave = { status: "SAVED" | "MERGED"; note: DailyNote } | { status: "CONFLICT"; stored: string };
export async function saveDailyNoteDraft(dayId: string, draft: string, base: string): Promise<GuardedSave> {
  const stored = (await db.dailyNotes.get(dayId))?.text ?? "";
  if (stored === base) return { status: "SAVED", note: await saveDailyNote(dayId, draft) };
  if (stored.startsWith(base)) {
    const added = stored.slice(base.length).trim();
    const text = draft.includes(added) ? draft : `${draft.trimEnd()}\n\n${added}`;
    return { status: "MERGED", note: await saveDailyNote(dayId, text) };
  }
  return { status: "CONFLICT", stored };
}
