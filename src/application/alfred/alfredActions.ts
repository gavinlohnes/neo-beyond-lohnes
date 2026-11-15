import type Anthropic from "@anthropic-ai/sdk";
import { voidBodyweightLog, voidProteinLog, voidSleepLog, voidWaterLog } from "../commands";
import { voidMealLog } from "../nutritionCommands";
import type { RoutineMoment } from "../../domain/routines";
import type { MemoryTopic } from "../../domain/alfred/types";
import type { UrgeTrigger } from "../../domain/common/types";
import type { RepeatUnit } from "../homeCommands";
import { getDays, searchRecords } from "./alfredSearch";
import { describeRecentEntries, type FixProposal } from "./fixEntries";
import { confirmKind, describeKind, labelKind, parseTool, REGISTRY_TOOLS } from "./alfredTools";

/**
 * ALFRED-001: what Alfred may propose. Each tool call becomes a card the operator confirms; only the
 * confirm runs a BEYOND command, with its usual history and corrections. Alfred never writes.
 * ALFRED-TOOLS-001: what each kind does (tool, checks, card line, guard, confirm, undo) lives in one typed
 * registry, alfredTools.ts; this file keeps the proposal type and the stable names the rest of BEYOND imports.
 */
/** ALFRED-TOOLS-001: when it happened. `time` is what Alfred asked ("03:10"); BEYOND places it in the lived day as `at`. */
type Timed = { time?: string | undefined; at?: string | undefined };
export type AlfredProposal =
  | { kind: "log_meal"; saved_meal_id?: string | undefined; name: string; calories: number; protein_g: number; carbs_g?: number | undefined; fat_g?: number | undefined; servings?: number | undefined; /** FREE-HELPER-002: also keep it as a saved meal, so next time it logs free. */ remember?: boolean | undefined } & Timed
  | { kind: "log_water"; oz: number } & Timed
  // ALFRED-TOOLS-001: protein on its own.
  | { kind: "log_protein"; grams: number } & Timed
  | { kind: "log_sleep"; minutes: number; nap?: boolean }
  | { kind: "log_weight"; lbs: number }
  | { kind: "add_reminder"; title: string; due_date?: string | undefined; repeat_rrule?: string | undefined; when_note?: string | undefined; project_id?: string | undefined; project_title?: string | undefined }
  | { kind: "capture_note"; text: string }
  // ALFRED-003 (owner go "go cheap + 1 and 2"): Alfred can do what the buttons do, still one card at a time.
  | { kind: "check_in"; energy: Scale; stress: Scale; mood: Scale; soreness: Zero; alcohol_urge: Zero }
  | { kind: "work_started" }
  | { kind: "work_ended" }
  // ALFRED-TOOLS-001: today WORK/OFF, future-day schedule changes, the next-shift handoff note. day_id: filled by BEYOND.
  | { kind: "set_work_context"; context: "WORK" | "OFF"; day_id?: string | undefined }
  | { kind: "schedule_change"; date: string; work: "WORK" | "OFF"; note?: string | undefined }
  | { kind: "schedule_swap"; work_date: string; off_date: string; note?: string | undefined }
  | { kind: "handoff_note"; note: string; day_id?: string | undefined }
  | { kind: "task_done"; task_id: string; title: string }
  // ALFRED-TOOLS-001: no longer needed (RELEASED) and waiting.
  | { kind: "task_release"; task_id: string; title: string }
  | { kind: "task_waiting"; task_id: string; title: string }
  | { kind: "habit_done"; habit_id: string; name: string }
  | { kind: "task_new_date"; task_id: string; title: string; due_date: string }
  // WEEK-PLAN-001: the day he means to work on an open task (its planned date), not its due date.
  | { kind: "task_plan"; task_id: string; title: string; planned_date: string }
  // FREE-HELPER-001: tick one of his routine steps for today. Made only by the free helper, not by Alfred.
  | { kind: "routine_tick"; routine_id: string; step_id: string; text: string; routine_title: string }
  // GYM-SETS-001: one set into the workout in progress. Made only by the free helper, not by Alfred.
  // CORRECTIONS-001: change today's latest water/sleep/weight log through its correction chain. Free helper only.
  | { kind: "correct_log"; metric: "water" | "sleep" | "weight"; target_id: string; from: number; to: number }
  // ALFRED-TOOLS-001: take out today's latest sleep or weight (its existing void). target_id/from: filled by BEYOND.
  | { kind: "remove_log"; metric: "sleep" | "weight"; target_id: string; from: number }
  // ALFRED-FIX-001: move, correct or remove one logged meal, water or protein entry; BEYOND fills the card from the record.
  | FixProposal
  | { kind: "log_set"; session_id: string; exercise_id: string; exercise_name: string; weight: number; reps: number }
  | { kind: "clean_day" }
  | { kind: "open_training" }
  // ALFRED-004: memory and urges.
  | { kind: "remember"; text: string; topic: MemoryTopic }
  | { kind: "memory_retire"; memory_id: string; revision: string; source: "PERSONAL_FACT"; text: string }
  | { kind: "memory_restore"; memory_id: string; revision: string; source: "PERSONAL_FACT"; text: string }
  | { kind: "forget"; source: "ALFRED_MEMORY"; memory_id: string; text: string }
  | { kind: "log_urge"; trigger: UrgeTrigger }
  // RELATIONSHIPS-001: a person's yearly date, kept as a fact plus a yearly reminder in one card.
  | { kind: "person_date"; person: string; occasion: string; month: number; day: number; note?: string | undefined }
  // HOME-001: a home item: what BEYOND should know about it and/or when it repeats.
  | { kind: "home_item"; item: string; details?: string | undefined; every?: number | undefined; unit?: RepeatUnit | undefined; first_due?: string | undefined }
  // PROJECTS-001: a finite effort and its first steps, in one card.
  | { kind: "project_new"; title: string; finish?: string | undefined; steps: { title: string; due_date?: string | undefined }[] }
  // ROUTINES-001: a routine he describes, or a change he asked for to one of his ROUTINES.
  | { kind: "routine_new"; title: string; moment: RoutineMoment; steps: string[] }
  | { kind: "routine_edit"; routine_id: string; title: string; moment?: RoutineMoment | undefined; steps?: string[] | undefined }
  | { kind: "collection_add"; collection_id: string; collection_name: string; field_id: string; field_label: string; value: string };
type Scale = 1 | 2 | 3 | 4 | 5;
type Zero = 0 | Scale;

/** What a confirm asks of the shell beyond the write (open TRAIN). */
/** CARD-UNDO-001: what to void if he taps UNDO on a saved log card (the same void the LOG sheet's UNDO uses). */
export interface SavedLog { kind: "water" | "sleep" | "weight" | "meal" | "protein"; dayId: string; eventId: string }
export interface ConfirmResult { open?: "TRAIN"; undo?: SavedLog }
export async function undoSavedLog(saved: SavedLog): Promise<boolean> {
  if (saved.kind === "water") return voidWaterLog(saved.dayId, saved.eventId);
  if (saved.kind === "sleep") return voidSleepLog(saved.dayId, saved.eventId);
  if (saved.kind === "weight") return voidBodyweightLog(saved.dayId, saved.eventId);
  if (saved.kind === "protein") return voidProteinLog(saved.dayId, saved.eventId);
  return voidMealLog(saved.dayId, saved.eventId);
}

const s = (description: string) => ({ type: "string" as const, description });

/** The write tools Claude sees: every registry kind Alfred may call. */
export const ALFRED_TOOLS: Anthropic.Beta.BetaTool[] = REGISTRY_TOOLS;

/**
 * ALFRED-004: read tools. Alfred calls these himself and BEYOND answers at once from the records;
 * they never write, so they need no card.
 */
export const ALFRED_READ_TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: "search_records", description: "Search his whole BEYOND history (events, meals, sleep, workouts and sets, tasks, notes, remembered facts) for words, newest first. Use for \"when did I last…\" and anything older than the records above.",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: s("one or two words that would appear in the record, e.g. \"CPAP\", \"bench\", \"pizza\"") } } },
  { name: "day_entries", description: "List his meal, water and protein entries in the current and previous lived day, each with its id, time and amount. Use before fix_entry.",
    input_schema: { type: "object", additionalProperties: false, properties: {} } },
  { name: "get_days", description: "Read his lived days between two dates (YYYY-MM-DD, inclusive): work, sleep, food, water, check-in, workouts, urges, clean days. Use for weekly reviews and to compare periods (\"did this work for me?\"); compare numbers only as they appear.",
    input_schema: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { from: s("YYYY-MM-DD"), to: s("YYYY-MM-DD") } } },
];

/** Runs a read tool; null when `name` isn't one. */
export async function runReadTool(name: string, input: unknown, includePersonal = false): Promise<string | null> {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  if (name === "search_records") return typeof i.query === "string" ? searchRecords(i.query, 30, includePersonal) : "Give a word to search for.";
  if (name === "day_entries") return describeRecentEntries();
  if (name === "get_days") { const from = date(i.from), to = date(i.to); return from && to ? getDays(from, to) : "Give from and to as YYYY-MM-DD."; }
  return null;
}

/** A tool call to a proposal, checked by its registry entry; null when unusable or not Alfred's. */
export function toProposal(name: string, input: unknown): AlfredProposal | null {
  return parseTool(name, input);
}

/** One line for the confirm card. */
export function describeProposal(p: AlfredProposal): string {
  return describeKind(p);
}

/** The confirm button's word: OPEN for a card that only opens a screen, SAVE for a record. */
export const confirmLabel = (p: AlfredProposal) => labelKind(p);

/** A plain reason a confirm didn't save, for the card. */
export function describeConfirmError(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (m.startsWith("NOT_AN_ACTIVE_WORK_DAY")) return "Today isn't set as a work day, so there's no shift to mark. Nothing changed.";
  if (m.startsWith("QUIT_HABIT_NOT_SET")) return "Set up the quit tracker first (MORE → Settings). Nothing changed.";
  if (m.startsWith("OBLIGATION_ALREADY_RESOLVED")) return "That task is already closed. Nothing changed.";
  if (m.startsWith("INVALID_OBLIGATION_TRANSITION")) return "That task can't be marked waiting from where it is. Nothing changed.";
  if (m.startsWith("MEMORY_NOT_FOUND")) return "That fact is already gone. Nothing changed.";
  if (m.startsWith("PROJECT_MISMATCH")) return "That project doesn't match the card. Nothing changed. Ask again.";
  if (m.startsWith("ROUTINE_NOT_FOUND")) return "BEYOND couldn't find that routine. Nothing changed.";
  if (m.startsWith("INVALID_DATE")) return "That date doesn't exist. Nothing changed.";
  if (m.startsWith("INVALID_REPEAT")) return "BEYOND couldn't read that repeat. Nothing changed. Ask again with the dates.";
  if (m.startsWith("PROJECT_FINISHED")) return "That project is finished. Reopen it first. Nothing changed.";
  if (m.startsWith("PROJECT_NOT_FOUND")) return "BEYOND couldn't find that project. Nothing changed.";
  // ALFRED-TOOLS-001: these commands already say what went wrong in plain words after the code.
  if (/^(EXCEPTION_[A-Z_]+|EMPTY_HANDOFF|HANDOFF_TOO_LONG|LOG_NOT_FOUND|CHANGED_SINCE_CARD|WORKOUT_NOT_ACTIVE|LOG_TIME_[A-Z_]+): /.test(m)) return `${m.slice(m.indexOf(": ") + 2).replace(/\.?$/, ".")} Nothing changed.`;
  if (m.includes("NOT_FOUND")) return "BEYOND couldn't find that task. Nothing changed.";
  return "That didn't save. Nothing changed. Try again.";
}

/** The operator's confirm: runs the matching BEYOND command (ALFRED-TOOLS-001: from its registry entry). */
export async function confirmProposal(p: AlfredProposal): Promise<ConfirmResult> {
  return confirmKind(p);
}
