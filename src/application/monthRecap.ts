import type { DailyNote } from "../domain/dailyNotes";
import { clockDifference, deriveSleepRhythm, type SleepRhythm } from "../engine/sleepRhythm";
import { db } from "../persistence/db";
import { wikiLabels, personNames } from "./dailyNoteQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getImportedSleep } from "./externalSleepQueries";
import { getMonth, type MonthDay } from "./monthQueries";
import { writeMonthLetter } from "./monthLetter";
import { noteTags } from "./noteTags";
import { getPeopleView } from "./peopleCommands";
import { getExperiments, type Experiment } from "./tryExperiment";

/**
 * BIG-IDEAS-001 item 6, "Your month in BEYOND" (Gavin, 2026-11-12: "Build the recap"). A short story-style sequence
 * of cards for one month, from records only: the month in a line, your best run, how your sleep timing moved,
 * your top tags, finished experiments, the people you wrote about most, and your training. Every card says what
 * it counts; a card with nothing to show is left out. Built on MONTH-LETTER-001 and SLEEP-RHYTHM-001. Pure and read
 * only: no score, streak, praise or advice, and never an Engine input.
 */
export interface RecapCard { id: "MONTH" | "BEST_RUN" | "SLEEP" | "TAGS" | "EXPERIMENTS" | "PEOPLE" | "TRAINING"; title: string; lines: string[] }
export interface MonthRecap { title: string; cards: RecapCard[] }

export interface RecapInput {
  year: number; month: number; now: Date;
  days: readonly MonthDay[];
  /** The latest check-in energy for each BEYOND day. */
  energy: ReadonlyMap<string, number>;
  notes: readonly Pick<DailyNote, "dayId" | "text">[];
  people: readonly string[];
  experiments: readonly Experiment[];
  rhythm: SleepRhythm | null;
  previousRhythm: SleepRhythm | null;
}

const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const within = (iso: string | Date, year: number, month: number) => { const d = new Date(iso); return d.getFullYear() === year && d.getMonth() === month; };
/** Top entries by count, ties alphabetical, so the same records always give the same cards. */
const top = (counts: ReadonlyMap<string, number>, n = 3) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

export function deriveMonthRecap(input: RecapInput): MonthRecap {
  const { year, month, now, days, energy, notes, people, experiments } = input;
  const letter = writeMonthLetter(year, month, days, now);
  const cards: RecapCard[] = [{ id: "MONTH", title: letter.title, lines: [letter.lines[0]!] }];
  if (letter.daysLogged === 0) return { title: letter.title, cards };

  // Best run: consecutive recorded work days; the one with the highest check-in energy (at least 2 check-ins).
  const runs: MonthDay[][] = [];
  for (const d of days) {
    const last = runs.at(-1);
    if (d.dayId && d.work === "WORK") { if (last && isNext(last.at(-1)!.date, d.date)) last.push(d); else runs.push([d]); }
  }
  const scored = runs.flatMap((run) => {
    const values = run.flatMap((d) => (d.dayId && energy.has(d.dayId) ? [energy.get(d.dayId)!] : []));
    return values.length >= 2 ? [{ run, mean: values.reduce((a, b) => a + b, 0) / values.length, n: values.length }] : [];
  });
  const best = scored.reduce<(typeof scored)[number] | null>((p, c) => (!p || c.mean > p.mean ? c : p), null);
  if (best) {
    const span = best.run.length === 1 ? short(best.run[0]!.date) : `${short(best.run[0]!.date)}–${short(best.run.at(-1)!.date)}`;
    cards.push({ id: "BEST_RUN", title: "Your best run", lines: [
      `${span}: ${plural(best.run.length, "shift")}. Check-in energy averaged ${best.mean.toFixed(1)} of 5 (${plural(best.n, "day")}).`,
      scored.length > 1 ? `The highest of ${scored.length} runs with at least 2 check-ins.` : "The only run with at least 2 check-ins.",
    ] });
  }

  // Sleep timing on work days, against the month before (SLEEP-RHYTHM-001; needs enough Garmin-timed nights).
  const work = input.rhythm?.groups.find((g) => g.kind === "WORK"), before = input.previousRhythm?.groups.find((g) => g.kind === "WORK");
  if (work) {
    const lines = [`On work days your main sleep usually ran ${clock(work.start)}–${clock(work.end)} (${plural(work.nights, "Garmin-timed night")}).`];
    if (before) {
      const moved = clockDifference(before.midpoint, work.midpoint);
      lines.push(Math.abs(moved) < 15 ? `About the same as the month before (${plural(before.nights, "night")}).`
        : `Its middle was ${plural(Math.abs(moved), "minute")} ${moved > 0 ? "later" : "earlier"} than the month before (${plural(before.nights, "night")}).`);
    }
    cards.push({ id: "SLEEP", title: "When you slept", lines });
  }

  // Tags and people, from the month's daily notes. Each counts days, not mentions.
  const monthIds = new Set(days.flatMap((d) => (d.dayId ? [d.dayId] : [])));
  const monthNotes = notes.filter((n) => monthIds.has(n.dayId));
  const tagDays = new Map<string, number>();
  for (const n of monthNotes) for (const t of noteTags(n.text)) tagDays.set(t, (tagDays.get(t) ?? 0) + 1);
  if (tagDays.size) cards.push({ id: "TAGS", title: "Your top tags", lines: top(tagDays).map(([t, c]) => `#${t}: ${plural(c, "day")}`) });

  const known = new Map(people.map((p) => [p.toLowerCase(), p]));
  const personDays = new Map<string, number>();
  for (const n of monthNotes) for (const label of new Set(wikiLabels(n.text).map((l) => l.toLowerCase()))) {
    const name = known.get(label);
    if (name) personDays.set(name, (personDays.get(name) ?? 0) + 1);
  }
  if (personDays.size) cards.push({ id: "PEOPLE", title: "Who you wrote about", lines: top(personDays).map(([p, c]) => `[[${p}]]: ${plural(c, "day")}`) });

  // Experiments you closed this month, in your own words.
  const finished = experiments.filter((e) => e.entry.status === "REVIEWED" && e.entry.reviewedAt && within(e.entry.reviewedAt, year, month));
  if (finished.length) cards.push({ id: "EXPERIMENTS", title: plural(finished.length, "experiment") + " finished", lines: finished.slice(0, 3).map((e) =>
    `${e.what} (${plural(e.days, "day")}): ${e.entry.outcome ?? "closed"}${e.entry.lesson ? `. Lesson: ${e.entry.lesson}` : ""}`) });

  const logged = days.filter((d) => d.dayId), workouts = logged.reduce((n, d) => n + d.workouts, 0);
  if (workouts) {
    const trained = logged.filter((d) => d.workouts > 0).length;
    const onOff = logged.filter((d) => d.workouts > 0 && d.work === "OFF").length;
    cards.push({ id: "TRAINING", title: "Training", lines: [`${plural(workouts, "workout")} on ${plural(trained, "day")}${onOff ? `, ${onOff} of them days off` : ""}.`] });
  }
  return { title: letter.title, cards: order(cards) };
}

const ORDER: RecapCard["id"][] = ["MONTH", "BEST_RUN", "SLEEP", "TRAINING", "TAGS", "PEOPLE", "EXPERIMENTS"];
const order = (cards: RecapCard[]) => [...cards].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
/** b is the calendar day after a (local dates, yyyy-mm-dd). */
function isNext(a: string, b: string): boolean {
  const d = new Date(`${a}T12:00:00`); d.setDate(d.getDate() + 1);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-") === b;
}

export async function getMonthRecap(year: number, month: number, now: Date = new Date()): Promise<MonthRecap> {
  const days = await getMonth(year, month);
  const ids = days.flatMap((d) => (d.dayId ? [d.dayId] : []));
  const [checkIns, notes, view, experiments, records, summaries] = await Promise.all([
    db.checkIns.where("beyondDayId").anyOf(ids).toArray(), db.dailyNotes.bulkGet(ids), getPeopleView(now).catch(() => null),
    getExperiments(), getImportedSleep(), getDaySummaries(),
  ]);
  const energy = new Map<string, number>();
  for (const c of [...checkIns].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) energy.set(c.beyondDayId, c.energy);
  // Each month's sleep timing: the nights inside that calendar month.
  const end = (y: number, m: number) => new Date(Math.min(new Date(y, m + 1, 1).getTime() - 1, now.getTime()));
  const daysIn = (y: number, m: number) => Math.max(1, Math.round((end(y, m).getTime() - new Date(y, m, 1).getTime()) / 86_400_000));
  const evidence = records.map((r) => r.evidence);
  const rhythmFor = (y: number, m: number) => deriveSleepRhythm(evidence, summaries, end(y, m), daysIn(y, m));
  const prevY = month === 0 ? year - 1 : year, prevM = (month + 11) % 12;
  return deriveMonthRecap({
    year, month, now, days, energy, notes: notes.filter((n): n is DailyNote => !!n), people: view ? personNames(view) : [],
    experiments, rhythm: rhythmFor(year, month), previousRhythm: rhythmFor(prevY, prevM),
  });
}

