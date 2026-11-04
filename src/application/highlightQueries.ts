import { db } from "../persistence/db";
export const highlightLinks = (text: string) => [...text.matchAll(/\[\[([^\]\n]{1,120})\]\]/g)].map((match) => match[1]!.trim()).filter(Boolean);
export async function getHighlights(query = "") { const needle = query.trim().toLowerCase(); return (await db.highlights.orderBy("createdAt").reverse().toArray()).filter((row) => !needle || [row.sourceTitle, row.text, row.note, ...row.tags].some((value) => value.toLowerCase().includes(needle))); }
/** One optional, stable weekly-review excerpt; never imported by TODAY or Engine code. */
export async function getWeeklyHighlight() { return (await db.highlights.orderBy("createdAt").reverse().first()) ?? null; }
