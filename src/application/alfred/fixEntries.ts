import { db } from "../../persistence/db";
import { correctLogEntry, getDayLogEntries, getDayLogEntry, moveLogEntry, removeLogEntry, type DayLogEntry } from "../logEntries";
import { cleanValues, describeAmount, hhmm, placeTime, snapshotOf, type FixProposal } from "./fixEntryRules";
export * from "./fixEntryRules";

/**
 * ALFRED-FIX-001 (Gavin, 2026-11-15: "It would be nice if I could find something that was logged wrong and have Alfred
 * or the free helper edit it and update it"; "Approved."): Alfred and the free helper propose a fix to one logged meal,
 * water or protein entry (move its time, correct its amount, or remove it) as a card Gavin confirms. Saving runs
 * TIMELINE-EDIT-001's own fixes (the existing append-only retime, correction and removal facts), so HISTORY keeps the
 * original. The card always shows the record's real before and after: BEYOND fills them from the records, never Alfred.
 */
/** The current and previous lived day's entries: what a fix may name. */
export async function recentEntries(): Promise<DayLogEntry[]> {
  const days = (await db.beyondDays.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 2);
  return (await Promise.all(days.map((d) => getDayLogEntries(d.id)))).flat();
}

/** Alfred's read: the recent entries with their ids, so a fix can name the right one. */
export async function describeRecentEntries(): Promise<string> {
  const entries = await recentEntries();
  if (!entries.length) return "No meal, water or protein entries in the current or previous lived day.";
  return entries.map((e) => `id=${e.rootEventId} · ${e.kind} · ${e.name} · ${hhmm(e.at)} on ${new Date(e.at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${describeAmount(snapshotOf(e))}`).join("\n");
}

/**
 * Fills a fix from the records. A string is what to tell Alfred instead of showing a card (an unknown id, a time
 * outside its lived day, nothing to change).
 */
export async function resolveFix(p: FixProposal, now = new Date()): Promise<FixProposal | string> {
  const entry = (await recentEntries()).find((e) => e.rootEventId === p.entry_id);
  if (!entry) return "No meal, water or protein entry with that id in the current or previous lived day. Call day_entries for the ids; say so if it isn't there.";
  const snap = snapshotOf(entry);
  if (p.action === "move") {
    const to = p.time ? placeTime(p.time, entry.dayStartedAt, now) : null;
    if (!to) return `That time can't be placed in ${entry.name}'s lived day. Give a real time as HH:MM, 24-hour.`;
    if (Date.parse(to) === Date.parse(entry.at)) return `${entry.name} is already at ${hhmm(entry.at)}.`;
    return { ...p, entry: snap, to_at: to };
  }
  if (p.action === "correct") {
    const values = cleanValues(entry.kind, p.values, snap);
    if (!values) return `Nothing to change for ${entry.name}, or a value is out of range. For ${entry.kind === "MEAL" ? "a meal give calories, protein_g, carbs_g or fat_g (0 or more)" : entry.kind === "WATER" ? "water give oz above 0" : "protein give grams above 0"}; to take it out, propose remove.`;
    return { ...p, values, entry: snap };
  }
  return { ...p, entry: snap };
}

/** The confirm: re-read the entry and refuse if it changed since the card, then run the existing fix. */
export async function confirmFix(p: FixProposal): Promise<void> {
  const e = p.entry;
  if (!e) throw new Error("FIX_UNRESOLVED: this card has no record behind it.");
  const current = await getDayLogEntry(e.beyond_day_id, p.entry_id);
  if (!current) throw new Error("LOG_NOT_FOUND: that entry was removed since this card was made.");
  const now = snapshotOf(current);
  if (JSON.stringify(now) !== JSON.stringify(e)) throw new Error("CHANGED_SINCE_CARD: that entry changed since this card was made; ask again.");
  if (p.action === "move") { await moveLogEntry(current, p.to_at!); return; }
  if (p.action === "remove") { await removeLogEntry(current); return; }
  const v = p.values ?? {};
  await correctLogEntry(current, {
    ...(v.calories !== undefined ? { calories: v.calories } : {}), ...(v.protein_g !== undefined ? { proteinG: v.protein_g } : {}),
    ...(v.carbs_g !== undefined ? { carbsG: v.carbs_g } : {}), ...(v.fat_g !== undefined ? { fatG: v.fat_g } : {}),
    ...(v.oz !== undefined ? { oz: v.oz } : {}), ...(v.grams !== undefined ? { grams: v.grams } : {}),
  });
}
