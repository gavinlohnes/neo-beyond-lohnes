import { db } from "../persistence/db";
import type { SavedInboxItem } from "../domain/saved/types";
import { createObligation } from "./intentCommands";

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export async function saveInboxItem(input: Partial<Pick<SavedInboxItem, "title" | "text" | "url">> & { source?: SavedInboxItem["source"] }) {
  const title = clean(input.title, 180);
  const text = clean(input.text, 8_000);
  const rawUrl = clean(input.url, 2_000);
  if (!title && !text && !rawUrl) throw new Error("Add a title, text or link.");
  const url = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
  const row: SavedInboxItem = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), source: input.source ?? "MANUAL", title, text, url, note: "", tags: [] };
  await db.savedInboxItems.add(row);
  return row;
}

export async function getSavedInboxItems() {
  return db.savedInboxItems.orderBy("createdAt").reverse().toArray();
}

export async function updateSavedInboxItem(id: string, input: { note: string; tags: string[] }) {
  const row = await db.savedInboxItems.get(id);
  if (!row) throw new Error("Saved item not found.");
  await db.savedInboxItems.update(id, { note: clean(input.note, 2_000), tags: [...new Set(input.tags.map((tag) => clean(tag, 40)).filter(Boolean))].slice(0, 12) });
}

export async function deleteSavedInboxItem(id: string) {
  await db.savedInboxItems.delete(id);
}

export async function makeSavedItemTask(id: string) {
  const row = await db.savedInboxItems.get(id);
  if (!row) throw new Error("Saved item not found.");
  const title = row.title || row.text.slice(0, 120) || row.url || "Review saved item";
  return createObligation({ title, description: [row.url, row.note].filter(Boolean).join("\n") || undefined });
}
