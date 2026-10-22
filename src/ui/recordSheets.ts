export type RecordSheetTarget = "protein" | "water" | "meal" | "log" | "sleep" | "weight" | "note" | "urge" | "myMeals" | "foodLookup" | "record";

export interface RecordCorrectionRequest {
  key: number;
  dayId: string;
  record: import("../application/healthRecordQueries").HealthRecord;
}
