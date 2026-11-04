import { db } from "../persistence/db";
import type { Highlight } from "../domain/highlights";

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
export async function createHighlight(input: { savedItemId?: string; sourceTitle?: string; sourceUrl?: string; text: string; note?: string; tags?: string[] }): Promise<Highlight> {
  const text = String(input.text ?? "").trim();
  if (!text) throw new Error("Paste or select highlight text first.");
  if (text.length > 12_000) throw new Error("Highlight text is too long (maximum 12,000 characters).");
  const saved = input.savedItemId ? await db.savedInboxItems.get(input.savedItemId) : undefined;
  if (input.savedItemId && !saved) throw new Error("Saved source not found.");
  const rawUrl = clean(saved?.url ?? input.sourceUrl, 2_000); const sourceUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
  const now = new Date().toISOString(); const row: Highlight = { id: crypto.randomUUID(), ...(saved ? { sourceSavedItemId: saved.id } : {}), sourceTitle: clean(saved?.title || input.sourceTitle || "Pasted highlight", 180), sourceUrl, text, note: clean(input.note, 2_000), tags: [...new Set((input.tags ?? saved?.tags ?? []).map((tag) => clean(tag, 40)).filter(Boolean))].slice(0, 12), createdAt: now, updatedAt: now };
  await db.highlights.add(row); return row;
}
export async function updateHighlight(id: string, input: { note: string; tags: string[] }) { const row = await db.highlights.get(id); if (!row) throw new Error("Highlight not found."); await db.highlights.update(id, { note: clean(input.note, 2_000), tags: [...new Set(input.tags.map((tag) => clean(tag, 40)).filter(Boolean))].slice(0, 12), updatedAt: new Date().toISOString() }); }
export async function deleteHighlight(id: string) { await db.highlights.delete(id); }
