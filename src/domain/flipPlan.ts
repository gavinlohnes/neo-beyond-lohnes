/** GRAYSON-FLIP-PLAN-001: his flip-plan settings and their defaults (NIOSH: "3-4 a.m.", "noon or 1 p.m."). */
export type FlipChoice = "FLIP_BACK" | "STAY_LATE";
export interface FlipSettings {
  show: boolean;
  /** Minutes after midnight, 11:00–15:00 in 15-minute steps. */
  getUpBy: number;
  /** The plan for a 2-day break, and for 3 or more days off. */
  shortBreak: FlipChoice;
  longBreak: FlipChoice;
  stayLateBed: number;
  stayLateWake: number;
  /** 0–3 hours later than his usual days-off bedtime, the night before nights. */
  laterHours: number;
  daylightStart: number;
  daylightMinutes: number;
}
export const DEFAULT_FLIP: FlipSettings = {
  show: true, getUpBy: 13 * 60, shortBreak: "STAY_LATE", longBreak: "FLIP_BACK",
  stayLateBed: 3 * 60, stayLateWake: 12 * 60, laterHours: 2, daylightStart: 14 * 60, daylightMinutes: 120,
};
/** Which of his flip settings are his own (the rest are the defaults above). */
export type FlipSetBy = Partial<Record<keyof FlipSettings, "OWNER">>;
