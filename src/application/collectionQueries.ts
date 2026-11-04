import { db } from "../persistence/db";
import type { CollectionItem, CollectionValue } from "../domain/collections";

export async function getCollections(includeArchived = false) { const rows = await db.collections.toArray(); return rows.filter((row) => includeArchived || row.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)); }
export async function getCollection(id: string) { return db.collections.get(id); }
export async function getCollectionItems(collectionId: string, query = "", sortFieldId?: string): Promise<CollectionItem[]> {
  const needle = query.trim().toLowerCase(); const rows = (await db.collectionItems.where("collectionId").equals(collectionId).toArray()).filter((item) => !item.archivedAt && (!needle || Object.values(item.values).some((value) => String(value ?? "").toLowerCase().includes(needle))));
  const rank = (value: CollectionValue | undefined) => value === null || value === undefined ? "" : typeof value === "boolean" ? (value ? "1" : "0") : String(value).toLowerCase();
  return sortFieldId ? rows.sort((a, b) => rank(a.values[sortFieldId]).localeCompare(rank(b.values[sortFieldId]), undefined, { numeric: true })) : rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
