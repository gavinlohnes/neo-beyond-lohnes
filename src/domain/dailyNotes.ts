export interface DailyNote {
  /** One durable note per lived day; the BeyondDay id is the primary key. */
  dayId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type WikiTargetKind = "PERSON" | "PROJECT" | "DAY" | "COLLECTION_ITEM";
export interface WikiTarget { kind: WikiTargetKind; id: string; label: string }
