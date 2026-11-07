import { pictureMean, pictureValues, PICTURE_MEAN_FLOOR, type PictureRow } from "./wholePictureProjection";
import { flips, flipSummary, groupRuns, runPositions, type RotationRun } from "./rotationProjection";

/**
 * LOOP step 1 — ASK (DELTA-002 part 3, owner approval 2026-10-27 "Go loop"): questions answered by
 * rules from recorded days only. Every line carries the days it came from, so the answer can always
 * be inspected; a comparison needs PICTURE_MEAN_FLOOR days on each side or it says what is missing.
 * Never a cause, a score, an instruction or an Engine input. Pure.
 */
export type AskQuestion = "CHANGED" | "LAST_FLIP" | "WORK_VS_OFF" | "WHEN_TRAIN" | "SHORT_SLEEP" | "TRAINING_DAYS";
export interface AskLine { text: string; rows: PictureRow[] }
export type AskAnswer = { status: "ANSWER"; lines: AskLine[] } | { status: "NOT_YET"; need: string };

const minutes = (hours: number) => Math.round(hours * 60);
const clock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
const hm = (hours: number) => clock(minutes(hours));
const signedMinutes = (delta: number) => `${Math.abs(Math.round(delta))} min ${delta < 0 ? "less" : "more"}`;
const median = (values: readonly number[]) => { const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
/** A lived-day minute offset as a clock time, from a day's own 16:30 start. */
const at = (start: string, offset: number) =>
  new Date(Date.parse(start) + offset * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Mean of a measure for two groups, only when both reach the floor. */
function compare(a: readonly PictureRow[], b: readonly PictureRow[], key: "sleepHours" | "energy" | "stress") {
  const left = pictureMean(pictureValues(a, key)), right = pictureMean(pictureValues(b, key));
  return left === undefined || right === undefined ? undefined : { left, right };
}

/** The latest work run in the window with at least two recorded days — the block "since" is measured against. */
function latestWorkRun(runs: readonly RotationRun[]): RotationRun | undefined {
  return [...runs].reverse().find((run) => run.context === "WORK" && run.rows.filter((row) => row.dayIds.length).length >= 2);
}

/** "What changed in my last block?" — its days against the same shift numbers in earlier runs. */
export function askWhatChanged(rows: readonly PictureRow[]): AskAnswer {
  const runs = groupRuns(rows), latest = latestWorkRun(runs);
  if (!latest) return { status: "NOT_YET", need: "a work run with at least two recorded days" };
  const index = runs.indexOf(latest);
  // The oldest run may have begun before the window, so its shift numbers are not comparable (as in runPositions).
  const earlierSame = runs.slice(0, index).filter((run, i) => run.context === "WORK" && i > 0)
    .flatMap((run) => run.rows.slice(0, latest.rows.length));
  const lines: AskLine[] = [];
  const sleep = compare(latest.rows, earlierSame, "sleepHours");
  if (sleep) lines.push({ text: `Main sleep averaged ${hm(sleep.left)} in your last work run — ${signedMinutes(minutes(sleep.left) - minutes(sleep.right))} than the same shifts in earlier runs (${hm(sleep.right)}).`, rows: [...latest.rows] });
  const energy = compare(latest.rows, earlierSame, "energy");
  if (energy) lines.push({ text: `Check-in energy averaged ${energy.left.toFixed(1)}, against ${energy.right.toFixed(1)} on the same shifts before.`, rows: [...latest.rows] });
  const trained = latest.rows.filter((row) => row.sessions > 0);
  lines.push({ text: `You trained on ${trained.length} of ${latest.rows.length} shifts in that run.`, rows: trained.length ? trained : [...latest.rows] });
  if (!sleep && !energy) return { status: "NOT_YET", need: `${PICTURE_MEAN_FLOOR} recorded days in your last work run and ${PICTURE_MEAN_FLOOR} on the same shifts before it` };
  return { status: "ANSWER", lines };
}

/** "How did my last flip into nights go?" — that flip against your usual flips. */
export function askLastFlip(rows: readonly PictureRow[]): AskAnswer {
  const all = flips(rows).filter((flip) => flip.kind === "INTO_WORK"), last = all.at(-1);
  if (!last) return { status: "NOT_YET", need: "one recorded switch from days off into a work run" };
  const summary = flipSummary(all, "INTO_WORK");
  const lines: AskLine[] = [];
  const before = last.before;
  lines.push({ text: before.sleepWindow ? `The day before, you slept ${at(before.start, before.sleepWindow.start)}–${at(before.start, before.sleepWindow.end)}${before.napMinutes ? ` and napped ${before.napMinutes} min` : ""}.`
    : `The day before has no Garmin sleep times${before.napMinutes ? `; you napped ${before.napMinutes} min` : ""}.`, rows: [before] });
  last.after.forEach((row, index) => {
    const usual = summary[index === 0 ? "first" : "second"];
    const own = row.sleepHours === undefined ? "no main sleep recorded" : `main sleep ${hm(row.sleepHours)}`;
    lines.push({ text: `Shift ${index + 1}: ${own}${row.energy !== undefined ? `, energy ${row.energy}` : ""}${usual ? ` · usually asleep ${at(row.start, usual.start)}–${at(row.start, usual.end)} (${usual.days} days)` : ""}.`, rows: [row] });
  });
  return { status: "ANSWER", lines };
}

/** "What's normal for me on work days vs days off?" — the two kinds of day side by side. */
export function askWorkVsOff(rows: readonly PictureRow[]): AskAnswer {
  const work = rows.filter((row) => row.context === "WORK" && row.dayIds.length), off = rows.filter((row) => row.context === "OFF" && row.dayIds.length);
  const sleep = compare(work, off, "sleepHours"), energy = compare(work, off, "energy");
  if (!sleep && !energy) return { status: "NOT_YET", need: `${PICTURE_MEAN_FLOOR} recorded work days and ${PICTURE_MEAN_FLOOR} days off with main sleep or a check-in` };
  const lines: AskLine[] = [];
  if (sleep) lines.push({ text: `Main sleep: ${hm(sleep.left)} on work days, ${hm(sleep.right)} on days off.`, rows: [...work, ...off] });
  if (energy) lines.push({ text: `Check-in energy: ${energy.left.toFixed(1)} on work days, ${energy.right.toFixed(1)} on days off.`, rows: [...work, ...off] });
  const share = (group: PictureRow[]) => `${group.filter((row) => row.sessions > 0).length} of ${group.length}`;
  lines.push({ text: `Trained on ${share(work)} work days and ${share(off)} days off.`, rows: [...work, ...off].filter((row) => row.sessions > 0) });
  return { status: "ANSWER", lines };
}

/** "When do I usually train?" — which kind of day and place in the run, and the usual start time. */
export function askWhenTrain(rows: readonly PictureRow[]): AskAnswer {
  const trained = rows.filter((row) => row.sessions > 0);
  if (trained.length < PICTURE_MEAN_FLOOR) return { status: "NOT_YET", need: `${PICTURE_MEAN_FLOOR} recorded workouts (${trained.length} so far)` };
  const lines: AskLine[] = [];
  const places = runPositions(rows).filter((place) => place.trained.of > 0).sort((a, b) => b.trained.days - a.trained.days || a.position - b.position);
  const top = places[0];
  if (top && top.trained.days > 0) lines.push({ text: `Most often on ${top.context === "WORK" ? `shift ${top.position}` : `day off ${top.position}`}: ${top.trained.days} of ${top.trained.of} times it came round.`, rows: top.rows.filter((row) => row.sessions > 0) });
  const starts = trained.flatMap((row) => row.marks?.workouts ?? []);
  if (starts.length >= PICTURE_MEAN_FLOOR) lines.push({ text: `Usual start: about ${at(trained[0]!.start, median(starts))} (${starts.length} workouts with a start time).`, rows: trained });
  const work = trained.filter((row) => row.context === "WORK").length, off = trained.filter((row) => row.context === "OFF").length;
  lines.push({ text: `${work} on work days, ${off} on days off, in the last ${rows.length} days.`, rows: trained });
  return { status: "ANSWER", lines };
}

/** CONNECTED-001 Patterns: the main-sleep line BEYOND compares against (hours). A description, not a target. */
export const SHORT_SLEEP_HOURS = 6;

/** "How do my check-ins look after short sleep?" — same-day check-ins, split by that day's main sleep. */
export function askShortSleep(rows: readonly PictureRow[]): AskAnswer {
  const slept = rows.filter((row) => row.sleepHours !== undefined && !row.ambiguousSleep);
  const short = slept.filter((row) => row.sleepHours! < SHORT_SLEEP_HOURS), longer = slept.filter((row) => row.sleepHours! >= SHORT_SLEEP_HOURS);
  const energy = compare(short, longer, "energy"), stress = compare(short, longer, "stress");
  if (!energy && !stress) return { status: "NOT_YET", need: `${PICTURE_MEAN_FLOOR} days under ${SHORT_SLEEP_HOURS} h main sleep and ${PICTURE_MEAN_FLOOR} days with ${SHORT_SLEEP_HOURS} h or more, each with a check-in` };
  const lines: AskLine[] = [];
  if (energy) lines.push({ text: `Check-in energy: ${energy.left.toFixed(1)} on days under ${SHORT_SLEEP_HOURS} h main sleep, ${energy.right.toFixed(1)} on days with ${SHORT_SLEEP_HOURS} h or more.`, rows: [...short, ...longer] });
  if (stress) lines.push({ text: `Check-in stress: ${stress.left.toFixed(1)} on days under ${SHORT_SLEEP_HOURS} h, ${stress.right.toFixed(1)} on days with ${SHORT_SLEEP_HOURS} h or more.`, rows: [...short, ...longer] });
  lines.push({ text: `${short.length} of ${slept.length} days with a main sleep were under ${SHORT_SLEEP_HOURS} h. Side by side, not a cause.`, rows: short });
  return { status: "ANSWER", lines };
}

/** "How do days I train compare?" — recorded days with a finished workout against recorded days without one. */
export function askTrainingDays(rows: readonly PictureRow[]): AskAnswer {
  const recorded = rows.filter((row) => row.dayIds.length);
  const trained = recorded.filter((row) => row.sessions > 0), rest = recorded.filter((row) => row.sessions === 0);
  const energy = compare(trained, rest, "energy"), sleep = compare(trained, rest, "sleepHours");
  if (!energy && !sleep) return { status: "NOT_YET", need: `${PICTURE_MEAN_FLOOR} days with a workout and ${PICTURE_MEAN_FLOOR} without, each with main sleep or a check-in` };
  const lines: AskLine[] = [];
  if (energy) lines.push({ text: `Check-in energy: ${energy.left.toFixed(1)} on days you trained, ${energy.right.toFixed(1)} on days you didn't.`, rows: [...trained, ...rest] });
  if (sleep) lines.push({ text: `Main sleep: ${hm(sleep.left)} on days you trained, ${hm(sleep.right)} on days you didn't.`, rows: [...trained, ...rest] });
  return { status: "ANSWER", lines };
}

export const ASK_QUESTIONS: readonly { id: AskQuestion; label: string; answer: (rows: readonly PictureRow[]) => AskAnswer }[] = [
  { id: "CHANGED", label: "What changed in my last block?", answer: askWhatChanged },
  { id: "LAST_FLIP", label: "How did my last flip into nights go?", answer: askLastFlip },
  { id: "WORK_VS_OFF", label: "What's normal for me, work days vs days off?", answer: askWorkVsOff },
  { id: "WHEN_TRAIN", label: "When do I usually train?", answer: askWhenTrain },
  { id: "SHORT_SLEEP", label: "How do my check-ins look after short sleep?", answer: askShortSleep },
  { id: "TRAINING_DAYS", label: "How do days I train compare?", answer: askTrainingDays },
];
