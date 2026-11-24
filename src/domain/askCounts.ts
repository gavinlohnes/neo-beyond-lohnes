/**
 * GRAYSON-ASKS-COUNT-001 (Gavin, 2026-11-24): a question GRAYSON put to him, counted when shown. One row per lived
 * date, area, kind and key ("checkin.energy"): a re-render on the same lived day isn't a second question.
 */
export const ASK_AREAS = ["TODAY", "TRAIN", "FOOD", "SLEEP", "BODY", "PLANS", "HOME", "WORK", "DELTA"] as const;
export type AskArea = (typeof ASK_AREAS)[number];
export const ASK_KINDS = ["FIELD", "CONFIRM", "CHOICE"] as const;
export type AskKind = (typeof ASK_KINDS)[number];

export interface AskCount {
  /** `${date}|${area}|${kind}|${key}` */
  id: string;
  /** The lived day's local date (the day that started at 16:30), YYYY-MM-DD. */
  date: string;
  area: AskArea;
  kind: AskKind;
  key: string;
  count: 1;
  firstAt: string;
}
