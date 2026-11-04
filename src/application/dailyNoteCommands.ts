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
