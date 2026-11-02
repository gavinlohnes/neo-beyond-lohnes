import type { ReviewRow } from "../engine/reviewOverview";
import { reviewMean } from "../engine/reviewOverview";
import { weekWeightChange } from "../engine/weeklyDashboard";

export interface DebriefMeasure { average: number | null; days: number }
const measure = (rows: readonly ReviewRow[], key: "sleepHours" | "calories" | "protein" | "water" | "weight"): DebriefMeasure => {
  const values = rows.flatMap((row) => row[key] === undefined ? [] : [row[key]!]);
  return { average: reviewMean(values) ?? null, days: values.length };
};
export function deriveWeekInNumbers(rows: readonly ReviewRow[], previous: readonly ReviewRow[]) {
  const sleep = measure(rows, "sleepHours");
  const workSleep = measure(rows.filter((r) => r.context === "WORK"), "sleepHours");
  const offSleep = measure(rows.filter((r) => r.context === "OFF"), "sleepHours");
  const calories = measure(rows, "calories"), protein = measure(rows, "protein"), water = measure(rows, "water");
  const change = weekWeightChange(rows);
  const weight = { change: change?.change ?? null, weighIns: rows.reduce((n, r) => n + r.weights.length, 0), days: rows.filter((r) => r.weights.length).length };
  const candidates = ([
    ["Main sleep", "sleepHours", "h"], ["Calories", "calories", "kcal"], ["Protein", "protein", "g"], ["Water", "water", "oz"], ["Weight (logged-day average)", "weight", "lb"],
  ] as const).flatMap(([label, key, unit]) => {
    const current = measure(rows, key), before = measure(previous, key);
    if (current.average === null || before.average === null || before.average === 0) return [];
    return [{ label, current, before, unit, ratio: Math.abs((current.average - before.average) / before.average) }];
  }).sort((a, b) => b.ratio - a.ratio);
  const currentSessions = rows.reduce((n, r) => n + r.sessions, 0);
  const priorSessions = previous.reduce((n, r) => n + r.sessions, 0);
  const largest = [...candidates, ...(priorSessions > 0 && rows.some((r) => r.dayIds.length) ? [{
    label: "Strength sessions", unit: "sessions", current: { average: currentSessions, days: rows.filter((r) => r.sessions > 0).length },
    before: { average: priorSessions, days: previous.filter((r) => r.sessions > 0).length }, ratio: Math.abs((currentSessions - priorSessions) / priorSessions),
  }] : [])].sort((a, b) => b.ratio - a.ratio)[0];
  const dayWord = (n: number) => n === 1 ? "day" : "days";
  const comparison = largest && largest.ratio > 0
    ? `Largest proportional change among comparable logged measures: ${largest.label.toLowerCase()} was ${largest.current.average!.toFixed(1)} ${largest.unit} on ${largest.current.days} ${dayWord(largest.current.days)}, compared with ${largest.before.average!.toFixed(1)} ${largest.unit} on ${largest.before.days} ${dayWord(largest.before.days)} the week before.`
    : largest ? "The comparable logged measures were unchanged from the week before."
    : "Not enough logged data in both weeks to compare measures.";
  return { sleep, workSleep, offSleep, calories, protein, water, weight, comparison };
}
