export const COLLECTION_FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "YES_NO", "LINK"] as const;
export type CollectionFieldType = typeof COLLECTION_FIELD_TYPES[number];
export interface CollectionField { id: string; label: string; type: CollectionFieldType }
export interface Collection { id: string; name: string; fields: CollectionField[]; status: "ACTIVE" | "ARCHIVED"; createdAt: string; updatedAt: string }
export type CollectionValue = string | number | boolean | null;
export interface CollectionItem { id: string; collectionId: string; values: Record<string, CollectionValue>; createdAt: string; updatedAt: string; archivedAt?: string }
