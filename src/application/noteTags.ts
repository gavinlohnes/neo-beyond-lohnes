import { db } from "../persistence/db";

/**
 * JOURNAL-LEARN-001 (part 1): #tags written in daily notes. A tag is just words in the note — no new stored
 * data — so it backs up, searches and edits like any other text. A tag starts at the beginning of the text or
 * after whitespace (so a link's #fragment never counts): a letter, then letters, digits or "-", up to 32.
 */
export const SUGGESTED_TAGS = ["latecoffee", "alcohol", "nap", "sauna", "argument", "goodtalk", "stressed"] as const;
const TAG = /(^|\s)#([a-z][a-z0-9-]{0,31})(?=$|[\s.,;:!?)])/gi;

export function noteTags(text: string): string[] {
  return [...new Set([...text.matchAll(TAG)].map((m) => m[2]!.toLowerCase()))];
}

/** Add the tag if it isn't in the text, or remove every copy of it if it is. Other text is untouched. */
export function toggleNoteTag(text: string, rawTag: string): string {
  const tag = normalizeTag(rawTag);
  if (!tag) return text;
  if (noteTags(text).includes(tag)) {
    const re = new RegExp(`(^|\\s)#${tag}(?=$|[\\s.,;:!?)])[ \\t]?`, "gi");
    return text.replace(re, "$1").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/g, "").trimEnd() + (text.endsWith("\n") ? "\n" : "");
  }
  const base = text.trimEnd();
  const lastLine = base.split("\n").at(-1) ?? "";
  const tagsOnly = lastLine.trim() !== "" && lastLine.trim().split(/\s+/).every((w) => /^#[a-z]/i.test(w));
  return base ? `${base}${tagsOnly ? " " : "\n\n"}#${tag}` : `#${tag}`;
}

/** "Late coffee!" → "latecoffee". Empty when nothing usable is left. */
export function normalizeTag(raw: string): string {
  const tag = raw.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9-]/g, "").slice(0, 32);
  return /^[a-z]/.test(tag) ? tag : "";
}

/** Every tag you've used in a daily note, most used first, then the suggestions you haven't. */
export async function getTagChoices(): Promise<string[]> {
  const counts = new Map<string, number>();
  for (const note of await db.dailyNotes.toArray()) for (const tag of noteTags(note.text)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  return [...used, ...SUGGESTED_TAGS.filter((t) => !counts.has(t))];
}

/**
 * DELTA-NEXT 4: tag today from somewhere other than the note (after a workout). Adds the tag to the active
 * lived day's note through the ordinary save — on the tap that asked for it. Returns the day's tags after.
 */
export async function addTagToActiveDay(rawTag: string): Promise<string[]> {
  const { getDailyNoteWorkspace } = await import("./dailyNoteQueries");
  const { saveDailyNote } = await import("./dailyNoteCommands");
  const workspace = await getDailyNoteWorkspace();
  if (!workspace) throw new Error("NO_ACTIVE_DAY: Start a lived day to tag it.");
  const text = workspace.note?.text ?? "";
  const tag = normalizeTag(rawTag);
  if (!tag) return noteTags(text);
  if (noteTags(text).includes(tag)) return noteTags(text);
  return noteTags((await saveDailyNote(workspace.day.id, toggleNoteTag(text, tag))).text);
}

/** Today's tags, for showing which quick tags are already on. */
export async function getActiveDayTags(): Promise<string[]> {
  const { getDailyNoteWorkspace } = await import("./dailyNoteQueries");
  const workspace = await getDailyNoteWorkspace();
  return workspace ? noteTags(workspace.note?.text ?? "") : [];
}
