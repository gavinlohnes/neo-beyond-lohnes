import { z } from "zod";
import { db } from "../persistence/db";
import { writeAtomically } from "./atomicWrite";
import { logIntentEvent } from "./intentCommands";
import { getHabitWorkspace } from "./habitQueries";
import { getEffectiveCheckIns } from "./queries";
import {
  LADDER_REASONS, LADDER_REPLIES, LADDER_STAGES, deriveLadderLine,
  type LadderAnswer, type LadderAnswerValue, type LadderHabit, type LadderLine,
} from "../domain/habitLadder";

/**
 * GRAYSON-CHALLENGE-LADDER-001 (C6.6): reads the habit calendar he already keeps and his answers to ladder lines, and
 * appends HABIT_LADDER_ANSWERED when he answers. Global events (not day-scoped), strict payload. Never writes a habit,
 * a recommendation or anything the Engine reads.
 */
export const ladderAnswerSchema = z.object({
  habitId: z.string().min(1),
  habitName: z.string().min(1).max(200),
  stage: z.enum(LADDER_STAGES),
  answer: z.enum([...LADDER_REASONS, ...LADDER_REPLIES] as [LadderAnswerValue, ...LadderAnswerValue[]]),
  /** The lived date he answered on. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  missDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict().refine((p) => (p.stage === "ASK") === (p.missDate !== undefined) && (p.stage !== "ASK" || p.answer === "LATER" || (LADDER_REASONS as readonly string[]).includes(p.answer)));

/** Answers that don't parse are left out; a bad one never stops the others or the screen. */
export async function getLadderAnswers(): Promise<LadderAnswer[]> {
  const events = await db.events.where("type").equals("HABIT_LADDER_ANSWERED").toArray();
  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0))
    .flatMap((e) => { const p = ladderAnswerSchema.safeParse(e.payload); return p.success ? [p.data] : []; });
}

/** "Stop asking about this habit": per habit, on this phone, travels with the backup. Turning the line off for all is TODAY's quiet-line switch. */
export const HABIT_LADDER_KEY = "beyond.habitLadder.v1";
export function readLadderOff(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(HABIT_LADDER_KEY) ?? "null") as { off?: unknown } | null;
    return new Set(Array.isArray(raw?.off) ? raw.off.filter((id): id is string => typeof id === "string") : []);
  } catch { return new Set(); }
}
export function setLadderHabitOff(habitId: string, off: boolean): void {
  const next = readLadderOff();
  if (off) next.add(habitId); else next.delete(habitId);
  localStorage.setItem(HABIT_LADDER_KEY, JSON.stringify({ off: [...next].sort() }));
}

/** Low capacity for a lived day: his last check-in that day put energy at 2 or below, or the day's guidance was to recover. */
const LOW_KINDS = new Set(["RECOVER", "STABILIZE"]);

export async function getHabitLadderLine(now = new Date()): Promise<LadderLine | null> {
  const workspace = await getHabitWorkspace(now);
  if (!workspace.habits.length) return null;
  const dayIds = [...new Set(workspace.habits.flatMap((h) => h.history.flatMap((d) => d.dayId ? [d.dayId] : [])))];
  const [checkIns, recommendations, answers] = await Promise.all([
    getEffectiveCheckIns(dayIds), db.recommendations.where("beyondDayId").anyOf(dayIds).toArray(), getLadderAnswers(),
  ]);
  const low = new Set<string>();
  const lastCheckIn = new Map<string, { at: string; energy: number }>();
  for (const c of checkIns) { const prev = lastCheckIn.get(c.beyondDayId); if (!prev || c.recordedAt > prev.at) lastCheckIn.set(c.beyondDayId, { at: c.recordedAt, energy: c.energy }); }
  for (const [id, c] of lastCheckIn) if (c.energy <= 2) low.add(id);
  const lastRec = new Map<string, { at: string; kind: string }>();
  for (const r of recommendations) { const prev = lastRec.get(r.beyondDayId); if (!prev || r.issuedAt > prev.at) lastRec.set(r.beyondDayId, { at: r.issuedAt, kind: r.kind }); }
  for (const [id, r] of lastRec) if (LOW_KINDS.has(r.kind)) low.add(id);
  const habits: LadderHabit[] = workspace.habits.map(({ habit, history }) => ({
    id: habit.id, name: habit.name,
    history: history.map((d) => ({ date: d.date, applies: d.applies, answer: d.answer, work: d.work === "WORK" ? "WORK" : d.work === "UNKNOWN" ? "UNKNOWN" : "OFF", lowCapacity: !!d.dayId && low.has(d.dayId) })),
  }));
  const todayDay = workspace.habits[0]!.history.at(-1)!;
  return deriveLadderLine({ habits, answers, today: workspace.date, todayLowCapacity: !!todayDay.dayId && low.has(todayDay.dayId), off: readLadderOff() });
}

/**
 * His answer to the line he was shown. If the line changed since (another answer, a new habit answer), nothing is
 * written. The same tap twice returns the first answer.
 */
export async function answerLadder(line: LadderLine, answer: LadderAnswerValue, now = new Date()): Promise<LadderAnswer> {
  // The guard re-reads the whole ladder (habits, days, schedule, check-ins), so the transaction names every table.
  return writeAtomically(db.tables.map((t) => t.name), async () => {
    const date = (await getHabitWorkspace(now)).date;
    const already = (await getLadderAnswers()).find((a) => a.date === date && a.habitId === line.habitId && a.stage === line.stage && a.missDate === line.missDate);
    if (already) { if (already.answer === answer) return already; throw new Error("You already answered this today. Nothing was changed."); }
    const current = await getHabitLadderLine(now);
    if (!current || current.habitId !== line.habitId || current.stage !== line.stage || current.missDate !== line.missDate) throw new Error("This changed since it was shown. Nothing was saved.");
    const payload = ladderAnswerSchema.safeParse({ habitId: line.habitId, habitName: line.habitName, stage: line.stage, answer, date, ...(line.missDate ? { missDate: line.missDate } : {}) });
    if (!payload.success) throw new Error("That answer couldn't be saved. Nothing was changed.");
    await logIntentEvent("HABIT_LADDER_ANSWERED", payload.data, "USER", line.habitId, {});
    return payload.data;
  });
}
