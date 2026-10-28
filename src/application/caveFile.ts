import type { DecisionJournalEntry } from "../domain/journal/types";
import { MIN_BASELINE_DAYS } from "../engine/personalBaselines";
import { caveUsual, type CaveVitalId } from "./caveVitals";
import { getDecisionJournalEntries } from "./journalQueries";
import { getPersonalUnderstanding } from "./personalUnderstandingQueries";
import { experimentLessons } from "./remember";
import { flips, flipSummary, RUN_MEAN_FLOOR, type RunPosition } from "./rotationProjection";
import { getWholePicture } from "./wholePictureQueries";
import type { PictureRow } from "./wholePictureProjection";

/**
 * SUIT-ALIVE S7 — the cave, File (owner approval 2026-10-28, "go S7"; brief docs/agent/SUIT-ALIVE.md).
 * One knowledge view, not two: it reads Codex's Personal Understanding query (PERSONAL-UNDERSTANDING-001,
 * #302) for run positions and written lessons, and links to it for depth. It adds three read-only things:
 * a case file of findings, each shown only once its own evidence floor is met; calibration — how firm each
 * usual range BEYOND judges with is, FIRM / BUILDING / THIN by days on file, and what BEYOND does not know
 * at all; and the whole run, place by place. Counts, never causes; no score; nothing stored.
 */
export type Firmness = "FIRM" | "BUILDING" | "THIN";

/** THIN below the floor, BUILDING from it, FIRM from twice it. A presentation rule only. */
export function firmness(days: number, need: number): Firmness {
  return days >= need * 2 ? "FIRM" : days >= need ? "BUILDING" : "THIN";
}

export interface FileFinding { key: string; label: string; text: string; source: string }
export interface Calibration { key: string; label: string; days: number; need: number; firmness: Firmness; source: string }
export interface RunColumn { position: number; runs: number; sleep: number | undefined; sleepDays: number; energy: number | undefined; energyDays: number; trained: { days: number; of: number } }

export interface CaveFile {
  daysOnFile: number;
  runs: { work: number; off: number };
  findings: FileFinding[];
  calibration: Calibration[];
  notKnown: string[];
  wholeRun: { context: "WORK" | "OFF"; columns: RunColumn[] }[];
}

export interface FileInputs {
  rows: readonly PictureRow[];
  positions: readonly RunPosition[];
  lessons: readonly Pick<DecisionJournalEntry, "title" | "lesson" | "reviewedAt" | "updatedAt">[];
  journal: readonly DecisionJournalEntry[];
}

const hm = (hours: number) => `${Math.floor(hours)}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`;
const atOffset = (minutes: number) => { const m = Math.round(16 * 60 + 30 + minutes) % (24 * 60); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const place = (p: Pick<RunPosition, "context" | "position">) => `${p.context === "WORK" ? "Shift" : "Day off"} ${p.position}`;

/** Pure: the file. */
export function buildCaveFile(input: FileInputs): CaveFile {
  const { rows, positions } = input;
  const findings: FileFinding[] = [];
  const work = positions.filter((p) => p.context === "WORK");
  const lowest = (key: "sleep" | "energy") => work.filter((p) => p[key].mean !== undefined).sort((a, b) => a[key].mean! - b[key].mean!)[0];
  const sleepLow = lowest("sleep"), energyLow = lowest("energy");
  if (sleepLow && work.filter((p) => p.sleep.mean !== undefined).length > 1)
    findings.push({ key: "SLEEP_LOW", label: "WEAK POINT · SLEEP", source: `Run positions · ${sleepLow.sleep.days} runs`,
      text: `${place(sleepLow)} is your shortest main sleep in a work run: ${hm(sleepLow.sleep.mean!)} on average.` });
  if (energyLow && work.filter((p) => p.energy.mean !== undefined).length > 1)
    findings.push({ key: "ENERGY_LOW", label: "WEAK POINT · ENERGY", source: `Run positions · ${energyLow.energy.days} runs`,
      text: `${place(energyLow)} is where your check-in energy runs lowest: ${energyLow.energy.mean!.toFixed(1)} on average.` });
  const trained = positions.filter((p) => p.context === "OFF" && p.trained.of >= RUN_MEAN_FLOOR && p.trained.days > 0)
    .sort((a, b) => b.trained.days / b.trained.of - a.trained.days / a.trained.of)[0];
  if (trained) findings.push({ key: "TRAINS", label: "WHEN YOU TRAIN", source: `Run positions · ${trained.trained.of} days`,
    text: `${place(trained)} is the day off you train most: ${trained.trained.days} of ${trained.trained.of} times.` });
  const back = flipSummary(flips(rows), "OUT_OF_WORK");
  if (back.first) findings.push({ key: "FLIP_BACK", label: "FLIP BACK", source: `Flips · ${back.first.days} timed`,
    text: `After a work run, your first night off you usually fall asleep around ${atOffset(back.first.start)} and wake around ${atOffset(back.first.end)}.` });
  const tried = experimentLessons(input.journal, 1)[0];
  if (tried) findings.push({ key: "WORKS", label: "WHAT YOU TRIED", source: "Your experiment review", text: `${tried.what}: ${tried.lesson}` });
  const lesson = [...input.lessons].sort((a, b) => (b.reviewedAt ?? b.updatedAt).localeCompare(a.reviewedAt ?? a.updatedAt))[0];
  if (lesson?.lesson) findings.push({ key: "LESSON", label: "YOUR LATEST LESSON", source: "Decision journal", text: `${lesson.title}: ${lesson.lesson}` });

  const calibration: Calibration[] = [];
  const ids: [CaveVitalId, string][] = [["sleep", "Main sleep"], ["energy", "Energy"], ["protein", "Protein and its pace"], ["water", "Water and its pace"]];
  for (const kind of ["WORK", "OFF"] as const) {
    for (const [id, label] of ids) {
      const days = caveUsual(rows, id, kind).days;
      calibration.push({ key: `${id}-${kind}`, label: `${label} · ${kind === "WORK" ? "work days" : "days off"}`, days, need: MIN_BASELINE_DAYS, firmness: firmness(days, MIN_BASELINE_DAYS), source: "Your usual range" });
    }
    const timed = rows.filter((r) => r.context === kind && r.sleepWindow).length;
    calibration.push({ key: `timing-${kind}`, label: `Usual sleep and wake · ${kind === "WORK" ? "work days" : "days off"}`, days: timed, need: RUN_MEAN_FLOOR, firmness: firmness(timed, RUN_MEAN_FLOOR), source: "Route · Garmin-timed days" });
  }
  const runs = { work: Math.max(0, ...positions.filter((p) => p.context === "WORK").map((p) => p.rows.length)), off: Math.max(0, ...positions.filter((p) => p.context === "OFF").map((p) => p.rows.length)) };
  calibration.push({ key: "runs-WORK", label: "Run positions · work runs", days: runs.work, need: RUN_MEAN_FLOOR, firmness: firmness(runs.work, RUN_MEAN_FLOOR), source: "Whole run · runs on file" });
  calibration.push({ key: "runs-OFF", label: "Run positions · stretches off", days: runs.off, need: RUN_MEAN_FLOOR, firmness: firmness(runs.off, RUN_MEAN_FLOOR), source: "Whole run · stretches on file" });

  const wholeRun = (["WORK", "OFF"] as const).map((context) => ({ context, columns: positions.filter((p) => p.context === context).map((p) => ({
    position: p.position, runs: p.rows.length, sleep: p.sleep.mean, sleepDays: p.sleep.days, energy: p.energy.mean, energyDays: p.energy.days, trained: p.trained,
  })) })).filter((r) => r.columns.length > 0);

  return {
    daysOnFile: rows.filter((r) => r.dayIds.length > 0).length, runs, findings, calibration, wholeRun,
    // Sleep stages are imported from Garmin and shown in TODAY's sleep sheet; they are not judged against your usual yet.
    notKnown: ["Caffeine: BEYOND doesn't record it.", "Light exposure: not recorded."],
  };
}

export async function getCaveFile(now: Date = new Date()): Promise<CaveFile> {
  const [understanding, picture, journal] = await Promise.all([getPersonalUnderstanding(now), getWholePicture(now), getDecisionJournalEntries()]);
  return buildCaveFile({ rows: picture.rows, positions: understanding.positions, lessons: understanding.lessons, journal });
}

export const formatRunSleep = (c: RunColumn) => c.sleep === undefined ? `— (${c.sleepDays})` : hm(c.sleep);
export const formatRunEnergy = (c: RunColumn) => c.energy === undefined ? `— (${c.energyDays})` : c.energy.toFixed(1);
