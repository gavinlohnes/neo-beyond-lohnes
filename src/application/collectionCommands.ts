import { db } from "../persistence/db";
import type { Collection, CollectionField, CollectionItem, CollectionValue } from "../domain/collections";
import { COLLECTION_FIELD_TYPES } from "../domain/collections";
import { newId } from "./commands";
import { COLLECTION_WRITE_TABLES, writeAtomically } from "./atomicWrite";

const clean = (value: string, label: string, max = 120) => { const out = value.trim(); if (!out || out.length > max) throw new Error(`INVALID_${label}: required, at most ${max} characters.`); return out; };
function fields(input: { label: string; type: string }[]): CollectionField[] {
  if (input.length < 1 || input.length > 6) throw new Error("INVALID_FIELDS: choose 1 to 6 fields.");
  const out = input.map((field) => {
    const type = COLLECTION_FIELD_TYPES.find((candidate) => candidate === field.type);
    if (!type) throw new Error(`INVALID_FIELDS: unknown field type ${field.type}.`);
    return { id: newId(), label: clean(field.label, "FIELD", 60), type };
  });
  if (new Set(out.map((field) => field.label.toLowerCase())).size !== out.length) throw new Error("INVALID_FIELDS: field names must be unique.");
  return out;
}
function value(field: CollectionField, raw: unknown): CollectionValue {
  if (raw === "" || raw === undefined || raw === null) return null;
  if (field.type === "YES_NO") {
    if (raw === true || (typeof raw === "string" && /^(true|yes)$/i.test(raw.trim()))) return true;
    if (raw === false || (typeof raw === "string" && /^(false|no)$/i.test(raw.trim()))) return false;
    throw new Error(`INVALID_VALUE: ${field.label} needs yes or no.`);
  }
  if (field.type === "NUMBER") { const n = Number(raw); if (!Number.isFinite(n)) throw new Error(`INVALID_VALUE: ${field.label} needs a number.`); return n; }
  const text = String(raw).trim();
  if (field.type === "DATE") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) throw new Error(`INVALID_VALUE: ${field.label} needs YYYY-MM-DD.`);
    const [year, month, day] = match.slice(1).map(Number);
    const parsed = new Date(Date.UTC(year!, month! - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month! - 1 || parsed.getUTCDate() !== day) throw new Error(`INVALID_VALUE: ${field.label} needs a real calendar date.`);
  }
  if (field.type === "LINK") { try { const url = new URL(text); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { throw new Error(`INVALID_VALUE: ${field.label} needs an http(s) link.`); } }
  if (text.length > 2_000) throw new Error(`INVALID_VALUE: ${field.label} is too long.`);
  return text;
}
export async function createCollection(name: string, inputFields: { label: string; type: string }[]): Promise<Collection> {
  const now = new Date().toISOString(); const collection: Collection = { id: newId(), name: clean(name, "NAME"), fields: fields(inputFields), status: "ACTIVE", createdAt: now, updatedAt: now };
  await db.collections.add(collection); return collection;
}
export async function setCollectionArchived(id: string, archived: boolean): Promise<void> {
  const row = await db.collections.get(id); if (!row) throw new Error("COLLECTION_NOT_FOUND");
  await db.collections.put({ ...row, status: archived ? "ARCHIVED" : "ACTIVE", updatedAt: new Date().toISOString() });
}
export async function addCollectionItem(collectionId: string, raw: Record<string, unknown>): Promise<CollectionItem> {
  return writeAtomically(COLLECTION_WRITE_TABLES, async () => {
    const collection = await db.collections.get(collectionId); if (!collection || collection.status !== "ACTIVE") throw new Error("COLLECTION_NOT_FOUND");
    const now = new Date().toISOString(); const item: CollectionItem = { id: newId(), collectionId, values: Object.fromEntries(collection.fields.map((field) => [field.id, value(field, raw[field.id])])), createdAt: now, updatedAt: now };
    await db.collectionItems.add(item); return item;
  });
}
export async function updateCollectionItem(id: string, raw: Record<string, unknown>): Promise<CollectionItem> {
  return writeAtomically(COLLECTION_WRITE_TABLES, async () => {
    const item = await db.collectionItems.get(id); if (!item) throw new Error("COLLECTION_ITEM_NOT_FOUND");
    const collection = await db.collections.get(item.collectionId); if (!collection) throw new Error("COLLECTION_NOT_FOUND");
    const updated = { ...item, values: Object.fromEntries(collection.fields.map((field) => [field.id, value(field, raw[field.id])])), updatedAt: new Date().toISOString() };
    await db.collectionItems.put(updated); return updated;
  });
}
export async function setCollectionItemArchived(id: string, archived: boolean): Promise<void> {
  const item = await db.collectionItems.get(id); if (!item) throw new Error("COLLECTION_ITEM_NOT_FOUND");
  const { archivedAt: _archivedAt, ...active } = item;
  await db.collectionItems.put({ ...active, ...(archived ? { archivedAt: new Date().toISOString() } : {}), updatedAt: new Date().toISOString() });
}
