import type { DailyNote } from "../domain/dailyNotes";
import { getEffectiveCheckIns } from "./queries";
import { clockDifference, type SleepRhythm } from "../engine/sleepRhythm";
import { db } from "../persistence/db";
import { personNames } from "./dailyNoteQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getImportedSleep } from "./externalSleepQueries";
import { monthDays, type MonthDay } from "./monthQueries";
import { bestRun, finishedIn, monthRhythm, noteDays, type BestRun, type RecapCard } from "./monthRecap";
import { getPeopleView } from "./peopleCommands";
import { getExperiments, type Experiment } from "./tryExperiment";

/**
 * YEAR-REVIEW-001 (Gavin's approved sprint plan, 2026-11-15, Wave 3): "Your year in BEYOND", the month recap's cards
 * added up across a calendar year. Every month is read with the recap's own counting rules (./monthRecap, ./monthQueries)
 * from the same records, dated by the local calendar day a lived day starts on, as MONTH does. A month with fewer than
 * MIN_DAYS_FOR_A_MONTH logged days is too thin to stand for a month: it is named and left out of every figure, and every
 * card says how many months it rests on. Highest and lowest, never best and worst; a trend only from four months up.
 * Pure and read only: nothing is saved, scored or sent, and never an Engine input.
 */
export const MIN_DAYS_FOR_A_MONTH = 7;
/** A month's sleep or protein average needs this many logged days in it to stand for that month. */
export const MIN_VALUES_FOR_A_MONTH_AVERAGE = 3;
/** Fewer counted months than this and there is no trend, only the months. */
export const MIN_MONTHS_FOR_A_TREND = 4;

export interface YearMonthInput {
  month: number;
  days: readonly MonthDay[];
  /** That month's sleep timing (as the month recap reads it); null when not enough Garmin-timed nights. */
  rhythm: SleepRhythm | null;
}
export interface YearInput {
  year: number; now: Date;
  months: readonly YearMonthInput[];
  energy: ReadonlyMap<string, number>;
  notes: readonly Pick<DailyNote, "dayId" | "text">[];
  people: readonly string[];
  experiments: readonly Experiment[];
}
export type MonthStatus = "COUNTED" | "THIN" | "EMPTY" | "AHEAD";
export interface YearMonth { month: number; name: string; status: MonthStatus; daysLogged: number }
export interface YearCard { id: RecapCard["id"]; title: string; lines: string[] }
export interface YearReview { title: string; months: YearMonth[]; counted: number; cards: YearCard[] }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;
const clock = (m: number) => { const r = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(r / 60)).padStart(2, "0")}:${String(r % 60).padStart(2, "0")}`; };
const avg = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const monthName = (year: number, month: number, style: "long" | "short" = "short") => new Date(year, month, 1).toLocaleDateString("en-US", { month: style });
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const top = (counts: ReadonlyMap<string, number>, n = 3) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

interface Point { month: number; value: number }
/**
 * Highest and lowest month, and the later counted months against the earlier ones (the first half against the second;
 * the middle month sits out when the count is odd). Ties keep the earlier month. `same` is the change that reads as
 * "about the same".
 */
function spread(year: number, points: readonly Point[], show: (v: number) => string, same: number, what: string): string[] {
  if (points.length < 2) return [];
  const hi = points.reduce((p, c) => (c.value > p.value ? c : p)), lo = points.reduce((p, c) => (c.value < p.value ? c : p));
  const lines = [`Highest month: ${monthName(year, hi.month)} (${show(hi.value)}). Lowest: ${monthName(year, lo.month)} (${show(lo.value)}).`];
  if (points.length < MIN_MONTHS_FOR_A_TREND) {
    lines.push(`No trend from ${plural(points.length, "month")}; it needs ${MIN_MONTHS_FOR_A_TREND}.`);
    return lines;
  }
  const half = Math.floor(points.length / 2);
  const early = avg(points.slice(0, half).map((p) => p.value)), late = avg(points.slice(-half).map((p) => p.value));
  const range = `the last ${half} of these months against the first ${half}`;
  lines.push(Math.abs(late - early) < same ? `Trend: ${what} about the same, ${range} (${show(early)} → ${show(late)}).`
    : `Trend: ${what} ${late > early ? "higher" : "lower"} in ${range} (${show(early)} → ${show(late)}).`);
  return lines;
}

export function deriveYearReview(input: YearInput): YearReview {
  const { year, now } = input;
  const thisMonth = now.getFullYear() * 12 + now.getMonth();
  const inProgress = now.getFullYear() === year;
  const sorted = [...input.months].sort((a, b) => a.month - b.month);
  const months: YearMonth[] = sorted.map(({ month, days }) => {
    const daysLogged = days.filter((d) => d.dayId).length;
    const status: MonthStatus = year * 12 + month > thisMonth ? "AHEAD" : daysLogged === 0 ? "EMPTY" : daysLogged < MIN_DAYS_FOR_A_MONTH ? "THIN" : "COUNTED";
    return { month, name: monthName(year, month, "long"), status, daysLogged };
  });
  const counted = sorted.filter((_, i) => months[i]!.status === "COUNTED");
  const title = inProgress ? `${year}, so far` : String(year);
  const thin = months.filter((m) => m.status === "THIN");
  const head: YearCard = { id: "MONTH", title, lines: [] };
  const cards: YearCard[] = [head];
  if (counted.length === 0) {
    head.lines.push(thin.length
      ? `No month had at least ${MIN_DAYS_FOR_A_MONTH} logged days yet, so there is nothing to add up.`
      : "Nothing was recorded this year.");
    if (thin.length) head.lines.push(`Too little to count: ${thin.map((m) => `${m.name} (${plural(m.daysLogged, "day")})`).join(", ")}.`);
    return { title, months, counted: 0, cards };
  }

  // MONTH: the year in a line, then sleep and protein as the month letter counts them.
  const logged = counted.flatMap((m) => m.days.filter((d) => d.dayId));
  const work = logged.filter((d) => d.work === "WORK").length, off = logged.filter((d) => d.work === "OFF").length;
  const of = months.filter((m) => m.status !== "AHEAD").length;
  head.lines.push(`Counted ${plural(counted.length, "month")} of ${of}: ${plural(logged.length, "logged day")}${work || off ? ` (${[work ? plural(work, "work day") : "", off ? `${plural(off, "day")} off` : ""].filter(Boolean).join(", ")})` : ""}.`);
  if (thin.length) head.lines.push(`Left out, too little logged (under ${MIN_DAYS_FOR_A_MONTH} days): ${thin.map((m) => `${m.name} (${plural(m.daysLogged, "day")})`).join(", ")}.`);
  const measure = (pick: (d: MonthDay) => number | undefined) => {
    const values = logged.flatMap((d) => { const v = pick(d); return v === undefined ? [] : [v]; });
    const points = counted.flatMap((m) => {
      const vs = m.days.flatMap((d) => { const v = d.dayId ? pick(d) : undefined; return v === undefined ? [] : [v]; });
      return vs.length >= MIN_VALUES_FOR_A_MONTH_AVERAGE ? [{ month: m.month, value: avg(vs) }] : [];
    });
    return { values, points };
  };
  const sleep = measure((d) => d.sleepMinutes);
  if (sleep.values.length) {
    head.lines.push(`Sleep, on ${plural(sleep.values.length, "logged day")}: ${hm(avg(sleep.values))} on average.`);
    head.lines.push(...spread(year, sleep.points, hm, 15, "sleep"));
  } else head.lines.push("Sleep: not recorded.");
  const protein = measure((d) => d.proteinG);
  if (protein.values.length) {
    head.lines.push(`Protein, on ${plural(protein.values.length, "logged day")}: ${Math.round(avg(protein.values))} g on average.`);
    head.lines.push(...spread(year, protein.points, (v) => `${Math.round(v)} g`, 10, "protein"));
  } else head.lines.push("Protein: not recorded.");

  // BEST_RUN: each month's best run, as the recap picks it; a run is cut at the month's edge, as in the recap.
  const runs = counted.flatMap((m) => { const { best } = bestRun(m.days, input.energy); return best ? [{ month: m.month, best }] : []; });
  if (runs.length) {
    const top1 = runs.reduce<{ month: number; best: BestRun }>((p, c) => (c.best.mean > p.best.mean ? c : p), runs[0]!);
    const r = top1.best, span = r.run.length === 1 ? short(r.run[0]!.date) : `${short(r.run[0]!.date)}–${short(r.run.at(-1)!.date)}`;
    cards.push({ id: "BEST_RUN", title: "Your best run of the year", lines: [
      `${span}: ${plural(r.run.length, "shift")}. Check-in energy averaged ${r.mean.toFixed(1)} of 5 (${plural(r.n, "day")}).`,
      `The highest of ${runs.length} monthly best runs (months with a run of at least 2 check-ins).`,
      ...spread(year, runs.map((x) => ({ month: x.month, value: x.best.mean })), (v) => `${v.toFixed(1)} of 5`, 0.3, "best-run energy"),
    ] });
  }

  // SLEEP: work-day sleep timing month by month, measured from the first such month so midnight never splits it.
  const timed = counted.flatMap((m) => { const g = m.rhythm?.groups.find((x) => x.kind === "WORK"); return g ? [{ month: m.month, g }] : []; });
  if (timed.length) {
    const anchor = timed[0]!.g.midpoint;
    const nights = timed.reduce((n, t) => n + t.g.nights, 0);
    const lines = [`Work-day main sleep was timed in ${plural(timed.length, "month")} (${plural(nights, "Garmin-timed night")}).`];
    if (timed.length >= 2) {
      const pts = timed.map((t) => ({ month: t.month, value: clockDifference(anchor, t.g.midpoint) }));
      const show = (v: number) => clock(anchor + v);
      const late = pts.reduce((p, c) => (c.value > p.value ? c : p)), early = pts.reduce((p, c) => (c.value < p.value ? c : p));
      lines.push(`Its middle was latest in ${monthName(year, late.month)} (${show(late.value)}) and earliest in ${monthName(year, early.month)} (${show(early.value)}).`);
      if (pts.length < MIN_MONTHS_FOR_A_TREND) lines.push(`No trend from ${plural(pts.length, "month")}; it needs ${MIN_MONTHS_FOR_A_TREND}.`);
      else {
        const half = Math.floor(pts.length / 2);
        const moved = Math.round(avg(pts.slice(-half).map((p) => p.value)) - avg(pts.slice(0, half).map((p) => p.value)));
        lines.push(Math.abs(moved) < 15 ? `Trend: about the same, the last ${half} timed months against the first ${half}.`
          : `Trend: its middle moved ${plural(Math.abs(moved), "minute")} ${moved > 0 ? "later" : "earlier"}, the last ${half} timed months against the first ${half}.`);
      }
    } else lines.push(`${monthName(year, timed[0]!.month, "long")}: usually ${clock(timed[0]!.g.start)}–${clock(timed[0]!.g.end)}.`);
    cards.push({ id: "SLEEP", title: "When you slept", lines });
  }

  // TRAINING: workouts per counted month.
  const workouts = logged.reduce((n, d) => n + d.workouts, 0);
  if (workouts) {
    const trained = logged.filter((d) => d.workouts > 0).length;
    const per = counted.map((m) => ({ month: m.month, value: m.days.reduce((n, d) => n + (d.dayId ? d.workouts : 0), 0) }));
    cards.push({ id: "TRAINING", title: "Training", lines: [
      `${plural(workouts, "workout")} on ${plural(trained, "day")}; ${(workouts / counted.length).toFixed(1)} a month across ${plural(counted.length, "counted month")}.`,
      ...spread(year, per, (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), 2, "workouts a month"),
    ] });
  }

  // TAGS and PEOPLE: the recap's day counts, added up over the counted months.
  const tagDays = new Map<string, number>(), personDays = new Map<string, number>(), tagMonths = new Map<string, number>(), personMonths = new Map<string, number>();
  for (const m of counted) {
    const c = noteDays(m.days, input.notes, input.people);
    for (const [t, n] of c.tagDays) { tagDays.set(t, (tagDays.get(t) ?? 0) + n); tagMonths.set(t, (tagMonths.get(t) ?? 0) + 1); }
    for (const [p, n] of c.personDays) { personDays.set(p, (personDays.get(p) ?? 0) + n); personMonths.set(p, (personMonths.get(p) ?? 0) + 1); }
  }
  if (tagDays.size) cards.push({ id: "TAGS", title: "Your top tags", lines: top(tagDays).map(([t, c]) => `#${t}: ${plural(c, "day")}, in ${plural(tagMonths.get(t)!, "month")}`) });
  if (personDays.size) cards.push({ id: "PEOPLE", title: "Who you wrote about", lines: top(personDays).map(([p, c]) => `[[${p}]]: ${plural(c, "day")}, in ${plural(personMonths.get(p)!, "month")}`) });

  // EXPERIMENTS: closed in a counted month.
  const finished = counted.flatMap((m) => finishedIn(input.experiments, year, m.month));
  if (finished.length) cards.push({ id: "EXPERIMENTS", title: plural(finished.length, "experiment") + " finished", lines: [
    ...finished.slice(0, 3).map((e) => `${e.what} (${plural(e.days, "day")}): ${e.entry.outcome ?? "closed"}`),
    ...(finished.length > 3 ? [`And ${finished.length - 3} more.`] : []),
  ] });

  return { title, months, counted: counted.length, cards: order(cards) };
}

const ORDER: RecapCard["id"][] = ["MONTH", "BEST_RUN", "SLEEP", "TRAINING", "TAGS", "PEOPLE", "EXPERIMENTS"];
const order = (cards: YearCard[]) => [...cards].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

export async function getYearReview(year: number, now: Date = new Date()): Promise<YearReview> {
  const summaries = await getDaySummaries();
  const thisMonth = now.getFullYear() * 12 + now.getMonth();
  const all = Array.from({ length: 12 }, (_, month) => ({ month, days: monthDays(summaries, year, month) }));
  const ids = all.flatMap((m) => m.days.flatMap((d) => (d.dayId ? [d.dayId] : [])));
  const [checkIns, notes, view, experiments, records] = await Promise.all([
    getEffectiveCheckIns(ids), db.dailyNotes.bulkGet(ids), getPeopleView(now).catch(() => null),
    getExperiments(), getImportedSleep(),
  ]);
  const energy = new Map<string, number>();
  for (const c of [...checkIns].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) energy.set(c.beyondDayId, c.energy);
  const evidence = records.map((r) => r.evidence);
  return deriveYearReview({
    year, now, energy, notes: notes.filter((n): n is DailyNote => !!n), people: view ? personNames(view) : [], experiments,
    months: all.map((m) => ({ ...m, rhythm: year * 12 + m.month > thisMonth ? null : monthRhythm(evidence, summaries, year, m.month, now) })),
  });
}
