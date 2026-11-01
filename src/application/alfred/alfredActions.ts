import type Anthropic from "@anthropic-ai/sdk";
import { captureItem, ensureActiveDay, logBodyweight, logSleep, logWater, markWorkEnded, markWorkStarted, submitCheckIn } from "../commands";
import { logManualMeal, logMeal } from "../nutritionCommands";
import { createObligation, modifyObligation, satisfyObligation } from "../intentCommands";
import { createProject } from "../projectCommands";
import { getProject } from "../projectQueries";
import { createRoutine, getRoutines, matchSteps, modifyRoutine } from "../routineCommands";
import { ROUTINE_MOMENTS, ROUTINE_MOMENT_LABELS, type RoutineMoment } from "../../domain/routines";
import { logCleanDay, logUrge } from "../quitCommands";
import { forgetFact, rememberFact } from "./alfredMemory";
import { addPersonDate, anchorRule, describeMonthDay } from "../peopleCommands";
import { addHomeItem, describeRepeat, isRealDate, REPEAT_UNITS, type RepeatUnit } from "../homeCommands";
import { formatLocalDate } from "../../engine/scheduledContext";
import { getDays, searchRecords } from "./alfredSearch";
import { MEMORY_TOPICS, type MemoryTopic } from "../../domain/alfred/types";
import { URGE_TRIGGERS, type UrgeTrigger } from "../../domain/common/types";

/**
 * ALFRED-001: what Alfred may propose. Each tool call becomes a card the operator confirms; only the
 * confirm runs a BEYOND command, with its usual history and corrections. Alfred never writes.
 */
export type AlfredProposal =
  | { kind: "log_meal"; saved_meal_id?: string | undefined; name: string; calories: number; protein_g: number; carbs_g?: number | undefined; fat_g?: number | undefined; servings?: number | undefined }
  | { kind: "log_water"; oz: number }
  | { kind: "log_sleep"; minutes: number; nap?: boolean }
  | { kind: "log_weight"; lbs: number }
  | { kind: "add_reminder"; title: string; due_date?: string | undefined; repeat_rrule?: string | undefined; when_note?: string | undefined; project_id?: string | undefined; project_title?: string | undefined }
  | { kind: "capture_note"; text: string }
  // ALFRED-003 (owner go "go cheap + 1 and 2"): Alfred can do what the buttons do, still one card at a time.
  | { kind: "check_in"; energy: Scale; stress: Scale; mood: Scale; soreness: Zero; alcohol_urge: Zero }
  | { kind: "work_started" }
  | { kind: "work_ended" }
  | { kind: "task_done"; task_id: string; title: string }
  | { kind: "task_new_date"; task_id: string; title: string; due_date: string }
  // WEEK-PLAN-001: the day he means to work on an open task (its planned date), not its due date.
  | { kind: "task_plan"; task_id: string; title: string; planned_date: string }
  | { kind: "clean_day" }
  | { kind: "open_training" }
  // ALFRED-004: memory and urges.
  | { kind: "remember"; text: string; topic: MemoryTopic }
  | { kind: "forget"; memory_id: string; text: string }
  | { kind: "log_urge"; trigger: UrgeTrigger }
  // RELATIONSHIPS-001: a person's yearly date, kept as a fact plus a yearly reminder in one card.
  | { kind: "person_date"; person: string; occasion: string; month: number; day: number; note?: string | undefined }
  // HOME-001: a home item: what BEYOND should know about it and/or when it repeats.
  | { kind: "home_item"; item: string; details?: string | undefined; every?: number | undefined; unit?: RepeatUnit | undefined; first_due?: string | undefined }
  // PROJECTS-001: a finite effort and its first steps, in one card.
  | { kind: "project_new"; title: string; finish?: string | undefined; steps: { title: string; due_date?: string | undefined }[] }
  // ROUTINES-001: a routine he describes, or a change he asked for to one of his ROUTINES.
  | { kind: "routine_new"; title: string; moment: RoutineMoment; steps: string[] }
  | { kind: "routine_edit"; routine_id: string; title: string; moment?: RoutineMoment | undefined; steps?: string[] | undefined };
type Scale = 1 | 2 | 3 | 4 | 5;
type Zero = 0 | Scale;

/** What a confirm asks of the shell beyond the write (open TRAIN). */
export interface ConfirmResult { open?: "TRAIN" }

const n = (description: string) => ({ type: "number" as const, description });
const s = (description: string) => ({ type: "string" as const, description });
const scale = (description: string, minimum: number) => ({ type: "integer" as const, minimum, maximum: 5, description });
const none = { type: "object" as const, additionalProperties: false, properties: {} };

export const ALFRED_TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: "log_meal", description: "Propose logging food the operator says he ate. Use saved_meal_id when it matches one of his saved meals; otherwise give your best macro estimate and say it is an estimate.",
    input_schema: { type: "object", additionalProperties: false, required: ["name", "calories", "protein_g"],
      properties: { saved_meal_id: s("id from SAVED MEALS when it matches"), name: s("what he ate"), calories: n("kcal for the amount eaten"), protein_g: n("grams of protein"), carbs_g: n("grams of carbs"), fat_g: n("grams of fat"), servings: n("servings of the saved meal, default 1") } } },
  { name: "log_water", description: "Propose logging water or another plain drink, in fluid ounces.",
    input_schema: { type: "object", additionalProperties: false, required: ["oz"], properties: { oz: n("fluid ounces") } } },
  { name: "log_sleep", description: "Propose logging sleep he describes. Main sleep unless he says nap.",
    input_schema: { type: "object", additionalProperties: false, required: ["minutes"], properties: { minutes: n("minutes slept"), nap: { type: "boolean", description: "true for a nap" } } } },
  { name: "log_weight", description: "Propose logging a bodyweight he reports, in pounds.",
    input_schema: { type: "object", additionalProperties: false, required: ["lbs"], properties: { lbs: n("pounds") } } },
  { name: "add_reminder", description: "Propose a reminder or task. due_date is the local calendar date it is due (YYYY-MM-DD). For repeats give an iCalendar RRULE (e.g. FREQ=MONTHLY;BYMONTHDAY=15). Put the time or moment he named (\"after I wake\", \"9:30\") in when_note.",
    input_schema: { type: "object", additionalProperties: false, required: ["title"], properties: { title: s("short reminder text in his words"), due_date: s("YYYY-MM-DD"), repeat_rrule: s("RRULE, only if it repeats"), when_note: s("time or moment of day he named"), project_id: s("id from OPEN PROJECTS, only when this is a step of that project"), project_title: s("that project's exact title, required with project_id") } } },
  { name: "routine_new", description: "Propose a ROUTINE he describes for one moment of his rotation: BEFORE_SHIFT, ON_SHIFT, AFTER_SHIFT or DAY_OFF. Steps are his own, short, in order (1 to 15). Use what he says he does; don't add steps he didn't mention without asking.",
    input_schema: { type: "object", additionalProperties: false, required: ["title", "moment", "steps"], properties: {
      title: s("short name, e.g. Pre-shift"), moment: { type: "string", enum: [...ROUTINE_MOMENTS], description: "when it applies" },
      steps: { type: "array", minItems: 1, maxItems: 15, items: s("one step") } } } },
  { name: "routine_edit", description: "Propose a change he asked for to one of his ROUTINES (by id): a new name, moment, or the full new list of steps in order. Only when he asks; never change a routine on your own.",
    input_schema: { type: "object", additionalProperties: false, required: ["routine_id", "title"], properties: {
      routine_id: s("id from ROUTINES"), title: s("the routine's name (new name if renaming)"), moment: { type: "string", enum: [...ROUTINE_MOMENTS], description: "new moment, if changing" },
      steps: { type: "array", minItems: 1, maxItems: 15, items: s("one step"), description: "the full new list, if changing steps" } } } },
  { name: "project_new", description: "Propose a new PROJECT: something finite he wants to get done (renew a passport, clear the garage), with its first steps. Use it when he asks for help getting something done. Steps are concrete actions in his words, 1 to 8, in a sensible order. Give a due_date only for a date he named or one that is a fact (an appointment). Not for ongoing direction: that is a Mission.",
    input_schema: { type: "object", additionalProperties: false, required: ["title", "steps"], properties: {
      title: s("short project name"), finish: s("what finished looks like, in his words, if he said"),
      steps: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["title"], properties: { title: s("one concrete step"), due_date: s("YYYY-MM-DD, only if known") } } } } } },
  { name: "capture_note", description: "Propose saving a note or thought he wants kept, with no due date.",
    input_schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: s("the note") } } },
  { name: "check_in", description: "Propose BEYOND's check-in from how he says he feels. Use all five scales from his words; if he hasn't said enough to place one, ask instead of guessing. BEYOND's Engine reads the check-in and makes its own recommendation.",
    input_schema: { type: "object", additionalProperties: false, required: ["energy", "stress", "mood", "soreness", "alcohol_urge"],
      properties: { energy: scale("1 drained … 5 sharp", 1), stress: scale("1 calm … 5 maxed", 1), mood: scale("1 low … 5 good", 1), soreness: scale("0 none … 5 very sore", 0), alcohol_urge: scale("0 none … 5 strong", 0) } } },
  { name: "work_started", description: "Propose recording that his shift has actually started (he says he's at work, clocked in, started).", input_schema: none },
  { name: "work_ended", description: "Propose recording that his shift is over (he says he's off, done, leaving work).", input_schema: none },
  { name: "task_done", description: "Propose marking one of his OPEN TASKS done. Use the task's id from the records.",
    input_schema: { type: "object", additionalProperties: false, required: ["task_id", "title"], properties: { task_id: s("id from OPEN TASKS"), title: s("the task's title") } } },
  { name: "task_new_date", description: "Propose moving one of his OPEN TASKS to a new due date (YYYY-MM-DD). Use the task's id from the records.",
    input_schema: { type: "object", additionalProperties: false, required: ["task_id", "title", "due_date"], properties: { task_id: s("id from OPEN TASKS"), title: s("the task's title"), due_date: s("YYYY-MM-DD") } } },
  { name: "task_plan", description: "Propose the day he'll work on one of his OPEN TASKS (its planned date, YYYY-MM-DD), for planning his week. Not its due date. One card per task; fit his shifts and sleep, keep work nights light, and never treat unknown time as free.",
    input_schema: { type: "object", additionalProperties: false, required: ["task_id", "title", "planned_date"], properties: { task_id: s("id from OPEN TASKS"), title: s("the task's title"), planned_date: s("YYYY-MM-DD") } } },
  { name: "clean_day", description: "Propose logging today as a clean day in his QUIT TRACKER, only when he says today was clean.", input_schema: none },
  { name: "open_training", description: "Offer to open TRAIN so he can start or resume today's workout. BEYOND picks the session there.", input_schema: none },
  { name: "person_date", description: "Propose keeping a person's yearly date (birthday, anniversary) as one card: it saves the fact and a reminder that repeats every year. Use it instead of remember plus add_reminder whenever he gives a person and a month and day. Only dates he stated; never guess a year or a date.",
    input_schema: { type: "object", additionalProperties: false, required: ["person", "occasion", "month", "day"], properties: {
      person: s("the person, as he names them"), occasion: s("Birthday, Anniversary, or a short name for the date"),
      month: { type: "integer", minimum: 1, maximum: 12, description: "month number" }, day: { type: "integer", minimum: 1, maximum: 31, description: "day of the month" },
      note: s("anything he added about them, e.g. a gift idea") } } },
  { name: "home_item", description: "Propose keeping a HOME item as one card: what to know about it (size, model, who to call, warranty) and, if it recurs, how often and the next due date. Use it for house upkeep (furnace filter every 3 months, smoke alarm batteries every year). Only facts and intervals he stated; ask for the next due date rather than guessing it.",
    input_schema: { type: "object", additionalProperties: false, required: ["item"], properties: {
      item: s("short name, e.g. Furnace filter"), details: s("what to know, in his words, e.g. 16x25x1, Home Depot"),
      every: { type: "integer", minimum: 1, maximum: 60, description: "repeat every N units, only if it recurs" },
      unit: { type: "string", enum: [...REPEAT_UNITS], description: "WEEKS, MONTHS or YEARS" },
      first_due: s("YYYY-MM-DD, next due date, required with every") } } },
  { name: "remember", description: "Propose keeping a fact he wants remembered: people (birthdays, sizes, gift ideas), money (a bill's amount and due day), health, home, work. One fact per call, in his words.",
    input_schema: { type: "object", additionalProperties: false, required: ["text", "topic"], properties: { text: s("the fact"), topic: { type: "string", enum: [...MEMORY_TOPICS], description: "what it's about" } } } },
  { name: "forget", description: "Propose forgetting one remembered fact, by its id, when he says it's wrong or no longer true.",
    input_schema: { type: "object", additionalProperties: false, required: ["memory_id", "text"], properties: { memory_id: s("id from WHAT HE ASKED YOU TO REMEMBER"), text: s("the fact") } } },
  { name: "log_urge", description: "Propose logging an urge (his quit tracker) he says he had, with what set it off.",
    input_schema: { type: "object", additionalProperties: false, required: ["trigger"], properties: { trigger: { type: "string", enum: [...URGE_TRIGGERS], description: "what set it off" } } } },
];

/**
 * ALFRED-004: read tools. Alfred calls these himself and BEYOND answers at once from the records;
 * they never write, so they need no card.
 */
export const ALFRED_READ_TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: "search_records", description: "Search his whole BEYOND history (events, meals, sleep, workouts and sets, tasks, notes, remembered facts) for words, newest first. Use for \"when did I last…\" and anything older than the records above.",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: s("one or two words that would appear in the record, e.g. \"CPAP\", \"bench\", \"pizza\"") } } },
  { name: "get_days", description: "Read his lived days between two dates (YYYY-MM-DD, inclusive): work, sleep, food, water, check-in, workouts, urges, clean days. Use for weekly reviews and to compare periods (\"did this work for me?\"); compare numbers only as they appear.",
    input_schema: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { from: s("YYYY-MM-DD"), to: s("YYYY-MM-DD") } } },
];

/** Runs a read tool; null when `name` isn't one. */
export async function runReadTool(name: string, input: unknown, includePersonal = false): Promise<string | null> {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  if (name === "search_records") return typeof i.query === "string" ? searchRecords(i.query, 30, includePersonal) : "Give a word to search for.";
  if (name === "get_days") { const from = date(i.from), to = date(i.to); return from && to ? getDays(from, to) : "Give from and to as YYYY-MM-DD."; }
  return null;
}

export function toProposal(name: string, input: unknown): AlfredProposal | null {
  if (!input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  switch (name) {
    case "log_meal": { const nm = str(i.name), kcal = num(i.calories), p = num(i.protein_g); return nm && kcal !== undefined && p !== undefined ? { kind: "log_meal", name: nm, calories: kcal, protein_g: p, carbs_g: num(i.carbs_g), fat_g: num(i.fat_g), saved_meal_id: str(i.saved_meal_id), servings: num(i.servings) } : null; }
    case "log_water": { const oz = num(i.oz); return oz ? { kind: "log_water", oz } : null; }
    case "log_sleep": { const m = num(i.minutes); return m ? { kind: "log_sleep", minutes: Math.round(m), nap: i.nap === true } : null; }
    case "log_weight": { const lbs = num(i.lbs); return lbs ? { kind: "log_weight", lbs } : null; }
    case "add_reminder": { const t = str(i.title); const due = str(i.due_date); return t ? { kind: "add_reminder", title: t, due_date: due && isRealDate(due) ? due : undefined, repeat_rrule: str(i.repeat_rrule), when_note: str(i.when_note), project_id: str(i.project_id), project_title: str(i.project_title) } : null; }
    case "routine_new": case "routine_edit": {
      const t = str(i.title), moment = ROUTINE_MOMENTS.find((m) => m === i.moment);
      const steps = Array.isArray(i.steps) ? i.steps.flatMap((x) => (str(x) ? [str(x)!] : [])).slice(0, 15) : undefined;
      if (name === "routine_new") return t && moment && steps?.length ? { kind: "routine_new", title: t, moment, steps } : null;
      const id = str(i.routine_id);
      return id && t ? { kind: "routine_edit", routine_id: id, title: t, moment, steps: steps?.length ? steps : undefined } : null;
    }
    case "project_new": {
      const t = str(i.title);
      const steps = (Array.isArray(i.steps) ? i.steps : []).slice(0, 8).flatMap((raw) => {
        const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const st = str(r.title), due = str(r.due_date);
        return st ? [{ title: st, due_date: due && isRealDate(due) ? due : undefined }] : [];
      });
      return t && steps.length ? { kind: "project_new", title: t, finish: str(i.finish), steps } : null;
    }
    case "capture_note": { const t = str(i.text); return t ? { kind: "capture_note", text: t } : null; }
    case "check_in": {
      const at = (v: unknown, min: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= 5 ? v : undefined);
      const energy = at(i.energy, 1), stress = at(i.stress, 1), mood = at(i.mood, 1), soreness = at(i.soreness, 0), urge = at(i.alcohol_urge, 0);
      return energy && stress && mood && soreness !== undefined && urge !== undefined
        ? { kind: "check_in", energy: energy as Scale, stress: stress as Scale, mood: mood as Scale, soreness: soreness as Zero, alcohol_urge: urge as Zero } : null;
    }
    case "work_started": case "work_ended": case "clean_day": case "open_training": return { kind: name } as AlfredProposal;
    case "task_done": { const id = str(i.task_id), t = str(i.title); return id && t ? { kind: "task_done", task_id: id, title: t } : null; }
    case "task_plan": { const id = str(i.task_id), t = str(i.title), day = str(i.planned_date); return id && t && day && isRealDate(day) ? { kind: "task_plan", task_id: id, title: t, planned_date: day } : null; }
    case "task_new_date": { const id = str(i.task_id), t = str(i.title), due = str(i.due_date); return id && t && due && isRealDate(due) ? { kind: "task_new_date", task_id: id, title: t, due_date: due } : null; }
    case "remember": { const t = str(i.text); const topic = MEMORY_TOPICS.find((m) => m === i.topic) ?? "OTHER"; return t ? { kind: "remember", text: t, topic } : null; }
    case "forget": { const id = str(i.memory_id), t = str(i.text); return id && t ? { kind: "forget", memory_id: id, text: t } : null; }
    case "home_item": {
      const item = str(i.item), details = str(i.details), due = str(i.first_due);
      const every = typeof i.every === "number" && Number.isInteger(i.every) && i.every >= 1 && i.every <= 60 ? i.every : undefined;
      const unit = REPEAT_UNITS.find((u) => u === i.unit);
      const repeats = every && unit && due && isRealDate(due);
      if (!item || (!details && !repeats)) return null;
      return { kind: "home_item", item, details, ...(repeats ? { every, unit, first_due: due } : {}) };
    }
    case "person_date": {
      const person = str(i.person), occasion = str(i.occasion);
      const month = typeof i.month === "number" && Number.isInteger(i.month) ? i.month : undefined;
      const day = typeof i.day === "number" && Number.isInteger(i.day) ? i.day : undefined;
      // Review of #355: don't offer a card for a date that doesn't exist (Feb 30).
      const fits = month && day && month <= 12 && day <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
      return person && occasion && fits ? { kind: "person_date", person, occasion, month, day, note: str(i.note) } : null;
    }
    case "log_urge": { const trigger = URGE_TRIGGERS.find((u) => u === i.trigger); return trigger ? { kind: "log_urge", trigger } : null; }
    default: return null;
  }
}

/** LIFE-HUB-001: a card's date as he'd say it ("Sun, Nov 15"), not YYYY-MM-DD. */
// Review of #362: the year is added when it isn't this year ("Tue, Jan 5, 2027").
const humanDate = (iso: string, now = new Date()) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}) });
};

/** One line for the confirm card. */
export function describeProposal(p: AlfredProposal): string {
  switch (p.kind) {
    case "log_meal": return `Log ${p.name}${p.servings && p.servings !== 1 ? ` × ${p.servings}` : ""} · ${Math.round(p.calories)} kcal · ${Math.round(p.protein_g)} g protein`;
    case "log_water": return `Log ${Math.round(p.oz)} oz water`;
    case "log_sleep": return `Log ${p.nap ? "nap" : "main sleep"} ${Math.floor(p.minutes / 60)}h ${String(p.minutes % 60).padStart(2, "0")}m`;
    case "log_weight": return `Log weight ${p.lbs} lb`;
    case "add_reminder": return `${p.project_id ? `Add step to ${p.project_title ?? "a project"}` : "Remind"}: ${p.title}${p.due_date ? ` · ${humanDate(p.due_date)}` : ""}${p.when_note ? ` · ${p.when_note}` : ""}${p.repeat_rrule ? " · repeats" : ""}`;
    case "routine_new": return `New routine · ${ROUTINE_MOMENT_LABELS[p.moment]}: ${p.title} · ${p.steps.map((st, n) => `${n + 1}. ${st}`).join("; ")}`;
    case "routine_edit": return `Change routine ${p.title}${p.moment ? ` · now ${ROUTINE_MOMENT_LABELS[p.moment].toLowerCase()}` : ""}${p.steps ? ` · steps: ${p.steps.map((st, n) => `${n + 1}. ${st}`).join("; ")}` : ""}`;
    case "project_new": return `New project: ${p.title}${p.finish ? ` (finished when ${p.finish})` : ""} · ${p.steps.length} ${p.steps.length === 1 ? "step" : "steps"}: ${p.steps.map((st, n) => `${n + 1}. ${st.title}${st.due_date ? ` (${humanDate(st.due_date)})` : ""}`).join("; ")}`;
    case "capture_note": return `Note: ${p.text}`;
    case "check_in": return `Check in · energy ${p.energy} · stress ${p.stress} · mood ${p.mood} · soreness ${p.soreness} · urge ${p.alcohol_urge}`;
    case "work_started": return "Started work";
    case "work_ended": return "Work ended";
    case "task_done": return `Done: ${p.title}`;
    case "task_new_date": return `New date: ${p.title} · ${humanDate(p.due_date)}`;
    case "task_plan": return `Plan: ${p.title} · ${humanDate(p.planned_date)}`;
    case "clean_day": return "Log today clean";
    case "open_training": return "Open TRAIN for today's workout";
    case "remember": return `Remember (${p.topic.toLowerCase()}): ${p.text}`;
    case "forget": return `Forget: ${p.text}`;
    case "home_item": return `Home: ${p.item}${p.details ? ` · ${p.details}` : ""}${p.every && p.unit && p.first_due ? ` · ${describeRepeat(p.every, p.unit)} from ${humanDate(p.first_due)}` : ""}`;
    case "person_date": return `Remember ${p.person}'s ${p.occasion.toLowerCase()} · ${describeMonthDay(p.month, p.day)} · reminder every year${p.note ? ` · ${p.note}` : ""}`;
    case "log_urge": return `Log an urge · ${p.trigger.toLowerCase().replace("_", " ")}`;
  }
}

/** The confirm button's word: OPEN for a card that only opens a screen, SAVE for a record. */
export const confirmLabel = (p: AlfredProposal) => (p.kind === "open_training" ? "OPEN" : "SAVE");

/** A plain reason a confirm didn't save, for the card. */
export function describeConfirmError(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (m.startsWith("NOT_AN_ACTIVE_WORK_DAY")) return "Today isn't set as a work day, so there's no shift to mark. Nothing changed.";
  if (m.startsWith("QUIT_HABIT_NOT_SET")) return "Set up the quit tracker first (MORE → Settings). Nothing changed.";
  if (m.startsWith("OBLIGATION_ALREADY_RESOLVED")) return "That task is already closed. Nothing changed.";
  if (m.startsWith("MEMORY_NOT_FOUND")) return "That fact is already gone. Nothing changed.";
  if (m.startsWith("PROJECT_MISMATCH")) return "That project doesn't match the card. Nothing changed. Ask again.";
  if (m.startsWith("ROUTINE_NOT_FOUND")) return "BEYOND couldn't find that routine. Nothing changed.";
  if (m.startsWith("INVALID_DATE")) return "That date doesn't exist. Nothing changed.";
  if (m.startsWith("INVALID_REPEAT")) return "BEYOND couldn't read that repeat. Nothing changed. Ask again with the dates.";
  if (m.startsWith("PROJECT_FINISHED")) return "That project is finished. Reopen it first. Nothing changed.";
  if (m.startsWith("PROJECT_NOT_FOUND")) return "BEYOND couldn't find that project. Nothing changed.";
  if (m.includes("NOT_FOUND")) return "BEYOND couldn't find that task. Nothing changed.";
  return "That didn't save. Nothing changed. Try again.";
}

/** RELATIONSHIPS-001 fix: anchor Alfred's bare RRULE on its due date (or today) so repeats don't drift. */
function anchoredRepeat(rule: string, due: string | undefined): string {
  try { return anchorRule(rule, due ?? formatLocalDate(new Date())); } catch { throw new Error("INVALID_REPEAT: rrule could not be read."); }
}

/** The operator's confirm: runs the matching BEYOND command. */
export async function confirmProposal(p: AlfredProposal): Promise<ConfirmResult> {
  if (p.kind === "open_training") return { open: "TRAIN" };
  if (p.kind === "capture_note") { await captureItem(p.text); return {}; }
  if (p.kind === "task_done") { await satisfyObligation(p.task_id); return {}; }
  if (p.kind === "task_new_date") { await modifyObligation(p.task_id, { dueAt: p.due_date }); return {}; }
  if (p.kind === "task_plan") { await modifyObligation(p.task_id, { plannedAt: p.planned_date }); return {}; }
  if (p.kind === "remember") { await rememberFact(p.text, p.topic); return {}; }
  if (p.kind === "forget") { await forgetFact(p.memory_id); return {}; }
  if (p.kind === "home_item") {
    await addHomeItem({ item: p.item, details: p.details, ...(p.every && p.unit && p.first_due ? { repeat: { every: p.every, unit: p.unit, firstDue: p.first_due } } : {}) });
    return {};
  }
  if (p.kind === "person_date") { await addPersonDate({ person: p.person, occasion: p.occasion, month: p.month, day: p.day, note: p.note }); return {}; }
  if (p.kind === "add_reminder") {
    // PROJECTS-001 review: the card names the project; the save checks it's the same one.
    if (p.project_id) {
      const project = await getProject(p.project_id);
      if (!project || project.title !== p.project_title) throw new Error("PROJECT_MISMATCH: the card's project doesn't match BEYOND's.");
    }
    await createObligation({
      title: p.title,
      ...(p.when_note ? { description: p.when_note } : {}),
      ...(p.due_date ? { dueAt: p.due_date } : {}),
      ...(p.repeat_rrule ? { recurrence: { rrule: anchoredRepeat(p.repeat_rrule, p.due_date) } } : {}),
      ...(p.project_id ? { projectId: p.project_id } : {}),
    });
    return {};
  }
  if (p.kind === "routine_new") { await createRoutine({ title: p.title, moment: p.moment, steps: p.steps }); return {}; }
  if (p.kind === "routine_edit") {
    const routine = (await getRoutines()).find((r) => r.id === p.routine_id);
    if (!routine || routine.status !== "ACTIVE") throw new Error("ROUTINE_NOT_FOUND: no routine in use with that id.");
    await modifyRoutine(routine.id, { title: p.title, ...(p.moment ? { moment: p.moment } : {}), ...(p.steps ? { steps: matchSteps(routine, p.steps) } : {}) }, routine.updatedAt);
    return {};
  }
  if (p.kind === "project_new") {
    await createProject({ title: p.title, ...(p.finish ? { finish: p.finish } : {}) }, p.steps.map((st) => ({ title: st.title, ...(st.due_date ? { dueAt: st.due_date } : {}) })));
    return {};
  }
  const day = await ensureActiveDay();
  switch (p.kind) {
    case "log_water": await logWater(day.id, Math.round(p.oz)); break;
    case "log_sleep": await logSleep(day.id, p.minutes, p.nap ? "SUPPLEMENTAL" : "PRIMARY"); break;
    case "log_weight": await logBodyweight(day.id, p.lbs); break;
    case "check_in": await submitCheckIn(day.id, { energy: p.energy, stress: p.stress, mood: p.mood, soreness: p.soreness, alcoholUrge: p.alcohol_urge }); break;
    case "work_started": await markWorkStarted(day.id); break;
    case "work_ended": await markWorkEnded(day.id); break;
    case "clean_day": await logCleanDay(day.id); break;
    case "log_urge": await logUrge(day.id, p.trigger); break;
    case "log_meal":
      if (p.saved_meal_id) {
        try { await logMeal(day.id, p.saved_meal_id, p.servings ?? 1); break; } catch { /* unknown id: log as given */ }
      }
      await logManualMeal(day.id, { name: p.name, calories: Math.round(p.calories), proteinG: Math.round(p.protein_g), carbsG: Math.round(p.carbs_g ?? 0), fatG: Math.round(p.fat_g ?? 0) });
      break;
  }
  return {};
}
