import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { groupRuns, RUN_MEAN_FLOOR } from "./rotationProjection";
import { pictureMean, pictureValues, type PictureRow } from "./wholePictureProjection";
import { getSchedulePattern } from "./queries";
import { getSleepDebt } from "./monthQueries";
import { getWholePicture } from "./wholePictureQueries";
import { getRecordedContexts } from "./workContextResolution";
import { getConfirmedExceptions } from "./scheduleExceptions";

/**
 * BIG-IDEAS-001 item 2, WEEK ENERGY FORECAST (Gavin, 2026-11-11: "Implement Week Energy Forecast"). For each
 * of the seven Week Ahead days: its place in the run from the saved schedule (shift 2 of 3, day off 1 of 2),
 * and the energy and main sleep you actually recorded at that place in past runs of the same length (shift 3
 * of past 3-shift runs). When those give fewer than RUN_MEAN_FLOOR days, it uses every past run that reached
 * that place (ROTATION-002's shift-by-shift view) and says so. Plus the sleep owed over your last 7 logged days. A forecast from your history: read only,
 * never an Engine input, never saved. A mean needs RUN_MEAN_FLOOR (3) days; below that only the count is shown.
 */
export interface ForecastSide { mean: number | undefined; days: number }
export interface ForecastDay {
  date: string;
  work: "WORK" | "OFF";
  /** 1-based place in the scheduled run; undefined when the run began before the look-back horizon. */
  position: number | undefined;
  /** Scheduled run length; undefined when it runs past the look-ahead horizon. */
  length: number | undefined;
  energy: ForecastSide;
  sleep: ForecastSide;
  /** Which past runs the numbers come from: the same length, or any length that reached this place. */
  basis: "SAME_LENGTH" | "ANY_LENGTH";
}
export interface WeekEnergyForecast {
  /** False with no saved schedule: the forecast follows only your own schedule. */
  scheduled: boolean;
  days: ForecastDay[];
  /** The days with a forecast mean that sit lowest and highest; null when fewer than two days have one. */
  lowest: ForecastDay | null;
  best: ForecastDay | null;
  sleepOwed: { owedMinutes: number; days: number };
}

const BACK = 21, AHEAD = 28;
// Week Ahead reads each date's lived day from 17:00 that day (weekAheadQueries.deriveWeekAhead).
const kindAt = (now: Date, offset: number, pattern: SchedulePattern) =>
  scheduledWorkContextForLivedDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 17), pattern);

export function deriveWeekEnergyForecast(input: {
  now: Date; pattern: SchedulePattern; rows: readonly PictureRow[]; sleepOwed: { owedMinutes: number; days: number };
  /** CONTEXT-INTEGRATION-001: recorded WORK/OFF by lived-day date; recorded days win over the rotation (history, and today). */
  recorded?: ReadonlyMap<string, "WORK" | "OFF">;
  /** SCHEDULE-EXCEPTIONS-001: confirmed changes by date, after the record and before the rotation. */
  confirmed?: ReadonlyMap<string, "WORK" | "OFF">;
}): WeekEnergyForecast {
  const { now, pattern, rows, sleepOwed, recorded = new Map(), confirmed = new Map() } = input;
  if (!isOperatorSavedSchedule(pattern)) return { scheduled: false, days: [], lowest: null, best: null, sleepOwed };
  const kinds = new Map<number, "WORK" | "OFF">();
  const kind = (k: number) => {
    const date = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, 12));
    if (!kinds.has(k)) kinds.set(k, recorded.get(date) ?? confirmed.get(date) ?? kindAt(now, k, pattern));
    return kinds.get(k)!;
  };
  const all = groupRuns(rows);
  // Position (any length), as in runPositions: the oldest run may be clipped by the window, so it is left out
  // unless it is UNKNOWN; a run after an unknown stretch counts as whole.
  const runs = all.filter((run, index) => index > 0 || run.context === "UNKNOWN");
  // Length is stricter (review of #475): it is known only with a recorded run of the other kind on both sides.
  // An unrecorded day or the window's edge could hide more of the run, and the newest run may still be going.
  const sized = new Set(all.filter((run, i) => {
    const before = all[i - 1], after = all[i + 1];
    return !!before && !!after && before.context !== "UNKNOWN" && after.context !== "UNKNOWN";
  }));
  const at = (work: "WORK" | "OFF", position: number, length: number | undefined) => {
    const days = runs.filter((run) => run.context === work && run.rows.length >= position && (length === undefined || (sized.has(run) && run.rows.length === length))).map((run) => run.rows[position - 1]!);
    const energy = pictureValues(days, "energy"), sleep = pictureValues(days, "sleepHours");
    return { energy: { mean: pictureMean(energy), days: energy.length }, sleep: { mean: pictureMean(sleep), days: sleep.length } };
  };
  const days: ForecastDay[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const work = kind(offset);
    let back = 0; while (back < BACK && kind(offset - back - 1) === work) back++;
    let ahead = 0; while (ahead < AHEAD && kind(offset + ahead + 1) === work) ahead++;
    const position = back < BACK ? back + 1 : undefined;
    const length = position !== undefined && ahead < AHEAD ? back + ahead + 1 : undefined;
    const same = position !== undefined && length !== undefined ? at(work, position, length) : undefined;
    const useSame = !!same && same.energy.days >= RUN_MEAN_FLOOR;
    const place = useSame ? same : position !== undefined ? at(work, position, undefined) : undefined;
    days.push({
      date: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12)),
      work, position, length,
      energy: place?.energy ?? { mean: undefined, days: 0 },
      sleep: place?.sleep ?? { mean: undefined, days: 0 },
      basis: useSame ? "SAME_LENGTH" : "ANY_LENGTH",
    });
  }
  const known = days.filter((d) => d.energy.mean !== undefined);
  // Earliest day wins a tie, so the same records always name the same days.
  const pick = (better: (a: number, b: number) => boolean) => known.reduce<ForecastDay | null>((p, d) => !p || better(d.energy.mean!, p.energy.mean!) ? d : p, null);
  const lowest = pick((a, b) => a < b), best = pick((a, b) => a > b);
  // Named only when the week actually has a low and a high.
  const differ = !!lowest && !!best && lowest.energy.mean !== best.energy.mean;
  return { scheduled: true, days, lowest: differ ? lowest : null, best: differ ? best : null, sleepOwed };
}

export async function getWeekEnergyForecast(now: Date = new Date()): Promise<WeekEnergyForecast> {
  const today = formatLocalDate(now);
  const [pattern, picture, sleepOwed, current, exceptions] = await Promise.all([getSchedulePattern(), getWholePicture(now), getSleepDebt(now), getRecordedContexts([today]), getConfirmedExceptions()]);
  // Recorded lived days (finished rows, and today's if it has started) by the date each lived day starts on.
  const recorded = new Map<string, "WORK" | "OFF">();
  for (const row of picture.rows) if (row.context === "WORK" || row.context === "OFF") recorded.set(formatLocalDate(new Date(row.start)), row.context);
  const now0 = current.get(today); if (now0) recorded.set(today, now0.kind);
  return deriveWeekEnergyForecast({ now, pattern, rows: picture.rows, sleepOwed, recorded, confirmed: new Map([...exceptions].map(([date, e]) => [date, e.kind] as const)) });
}
