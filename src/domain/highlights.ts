export interface Highlight {
  id: string;
  sourceSavedItemId?: string;
  sourceTitle: string;
  sourceUrl: string | null;
  text: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
