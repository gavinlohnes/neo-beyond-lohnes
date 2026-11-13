import type { PictureRow } from "./wholePictureProjection";
import { getWholePicture } from "./wholePictureQueries";

/**
 * LIFE-STATE-003 (Life-State Engine, slice 3; Gavin, 2026-11-13): a short report on the work run that just ended, shown
 * when slice 2 names RUN OVER. From recorded lived days only: how many shifts, main sleep, check-in energy and workouts,
 * each with how many days it rests on. Thin data says so; nothing is estimated, compared or scored. Read only.
 */
export interface PostRunReport {
  /** Local dates of the run's first and last recorded work day. */
  from: string; to: string;
  shifts: number;
  sleep: { days: number; meanHours: number | undefined };
  energy: { days: number; mean: number | undefined };
  workouts: number;
  /** The report, line by line, in plain words. */
  lines: string[];
}

const local = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);
const of = (days: number, total: number) => `${days} of ${total} ${total === 1 ? "shift" : "shifts"}`;

/** The run that ended with the newest finished lived day: the recorded work days counting back from it. */
export function derivePostRunReport(rows: readonly PictureRow[]): PostRunReport | null {
  const run: PictureRow[] = [];
  for (let i = rows.length - 1; i >= 0 && rows[i]!.context === "WORK"; i--) run.unshift(rows[i]!);
  if (!run.length) return null;
  const sleeps = run.flatMap((r) => (r.sleepHours === undefined ? [] : [r.sleepHours]));
  const energies = run.flatMap((r) => (r.energy === undefined ? [] : [r.energy]));
  const workouts = run.reduce((n, r) => n + (r.dayIds.length ? r.sessions : 0), 0);
  const from = local(run[0]!.start), to = local(run.at(-1)!.start), n = run.length;
  const sleepMean = mean(sleeps), energyMean = mean(energies);
  const lines = [
    `${n} ${n === 1 ? "shift" : "shifts"}, ${n === 1 ? short(from) : `${short(from)} – ${short(to)}`}.`,
    sleepMean === undefined ? "No main sleep was logged in this run."
      : `Main sleep averaged ${sleepMean.toFixed(1)} h (logged on ${of(sleeps.length, n)}).`,
    energyMean === undefined ? "No check-ins in this run."
      : `Check-in energy averaged ${energyMean.toFixed(1)} of 5 (${of(energies.length, n)}).`,
    workouts ? `${workouts} ${workouts === 1 ? "workout" : "workouts"}.` : "No workouts recorded.",
  ];
  if (!sleeps.length && !energies.length) lines.push("Little was recorded in this run, so there isn't much to show. That's fine.");
  return { from, to, shifts: n, sleep: { days: sleeps.length, meanHours: sleepMean }, energy: { days: energies.length, mean: energyMean }, workouts, lines };
}

export async function getPostRunReport(now: Date = new Date()): Promise<PostRunReport | null> {
  return derivePostRunReport((await getWholePicture(now)).rows);
}
