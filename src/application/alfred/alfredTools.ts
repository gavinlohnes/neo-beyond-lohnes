import type Anthropic from "@anthropic-ai/sdk";
import { captureItem, ensureActiveDay, logBodyweight, logProtein, logSleep, logWater, markWorkEnded, markWorkStarted, noteShiftHandoff, setWorkContext, submitCheckIn, correctWater, correctSleep, correctBodyweight, voidSleepLog, voidBodyweightLog } from "../commands";
import { getActiveDay, getBodyweightEntries, getHydrationEntries, getSleepEntries, getWorkPeriodEnded } from "../queries";
import { createSavedMeal, logManualMeal, logMeal } from "../nutritionCommands";
import { getActiveWorkoutSession, getPerformedSets } from "../trainQueries";
import { logSet } from "../trainCommands";
import { createObligation, markObligationWaiting, modifyObligation, releaseObligation, satisfyObligation } from "../intentCommands";
import { getObligation } from "../intentQueries";
import { createProject } from "../projectCommands";
import { getProject } from "../projectQueries";
import { createRoutine, getRoutines, matchSteps, modifyRoutine, setRoutineStep } from "../routineCommands";
import { ROUTINE_MOMENTS, ROUTINE_MOMENT_LABELS } from "../../domain/routines";
import { logCleanDay, logUrge } from "../quitCommands";
import { forgetFact, rememberFact, stopUsingMemory, restoreMemory } from "./alfredMemory";
import { addPersonDate, anchorRule, describeMonthDay } from "../peopleCommands";
import { addHomeItem, describeRepeat, isRealDate, REPEAT_UNITS } from "../homeCommands";
import { formatLocalDate } from "../../engine/scheduledContext";
import { MEMORY_TOPICS } from "../../domain/alfred/types";
import { SHIFT_HANDOFF_MAX_LENGTH, URGE_TRIGGERS } from "../../domain/common/types";
import { setHabitDone } from "../habitCommands";
import { getActiveHabits } from "../habitQueries";
import { addCollectionItem } from "../collectionCommands";
import { getCollection, getCollections } from "../collectionQueries";
import { confirmScheduleException, confirmShiftSwap } from "../scheduleExceptions";
import { confirmFix, describeFix, resolveFix, hhmm, placeTime } from "./fixEntries";
import { matchOne } from "../helper/freeHelper";
import { db } from "../../persistence/db";
import type { AlfredProposal, ConfirmResult } from "./alfredActions";
import type { ProposalContext } from "./contextActions";

/**
 * ALFRED-TOOLS-001 (Gavin, 2026-11-15: "Start with missions 1 and 2 (tool registry + shift correction)"): the ONE
 * place that says what Alfred and the free helper may propose. Each kind has, side by side: the tool Claude sees (if
 * Alfred may call it), how its raw input is checked into a proposal, how BEYOND fills it from the records before a
 * card shows, the card's one line, the guard re-checked inside the confirm transaction, and the existing BEYOND
 * command the confirm runs (with its undo, where one exists). Alfred never writes: every entry here is a card the
 * operator confirms (ALFRED-001, DOCTRINE-ALFRED-001). The mapped type below makes a kind without an entry a type error.
 */
export type Kind = AlfredProposal["kind"];
export type ProposalOf<K extends Kind> = Extract<AlfredProposal, { kind: K }>;
type Input = Record<string, unknown>;
export interface ActionSpec<K extends Kind> {
  /** What Claude sees. Absent: the free helper makes this card, Alfred cannot. */
  tool?: { description: string; input_schema: Anthropic.Beta.BetaTool["input_schema"] };
  /** Raw tool input to a proposal, or null when it's unusable. Pure. Required with `tool`. */
  parse?: (i: Input) => ProposalOf<K> | null;
  /** Fill the card from the records before it shows. A string goes back to Alfred instead of a card. */
  resolve?: (p: ProposalOf<K>, now: Date) => Promise<ProposalOf<K> | string>;
  /** The card's one line. */
  describe: (p: ProposalOf<K>) => string;
  /** Re-checked inside the confirm's transaction; throws CONTEXT_CHANGED when the record moved since the card. */
  guard?: (p: ProposalOf<K>, expected: ProposalContext) => Promise<void>;
  /** The confirm: runs the matching BEYOND command. */
  confirm: (p: ProposalOf<K>) => Promise<ConfirmResult>;
  /** OPEN for a card that only opens a screen; SAVE otherwise. */
  label?: "OPEN" | "SAVE";
}
export type Registry = { [K in Kind]: ActionSpec<K> };

const n = (description: string) => ({ type: "number" as const, description });
const s = (description: string) => ({ type: "string" as const, description });
const scale = (description: string, minimum: number) => ({ type: "integer" as const, minimum, maximum: 5, description });
const none = { type: "object" as const, additionalProperties: false, properties: {} };
const obj = (required: string[], properties: Record<string, unknown>) => ({ type: "object" as const, additionalProperties: false, required, properties });
const TIME = s("only if he named when: HH:MM, 24-hour (\"03:10\"), inside the current lived day; omit for now");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
type Scale = 1 | 2 | 3 | 4 | 5;
type Zero = 0 | Scale;

/** LIFE-HUB-001: a card's date as he'd say it ("Sun, Nov 15"), not YYYY-MM-DD. Review of #362: the year when it isn't this year. */
export const humanDate = (iso: string, now = new Date()) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}) });
};
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
const at = (p: { at?: string | undefined }) => (p.at ? ` · at ${hhmm(p.at)}` : "");

/** RELATIONSHIPS-001 fix: anchor Alfred's bare RRULE on its due date (or today) so repeats don't drift. */
function anchoredRepeat(rule: string, due: string | undefined): string {
  try { return anchorRule(rule, due ?? formatLocalDate(new Date())); } catch { throw new Error("INVALID_REPEAT: rrule could not be read."); }
}

/** ALFRED-TOOLS-001: a time he named, placed in the active lived day (LOG-TIME-001's rule), before the card shows. */
async function placeAt<P extends { at?: string | undefined; time?: string | undefined }>(p: P, now: Date): Promise<P | string> {
  if (!p.time) return p;
  const day = await getActiveDay();
  const placed = day ? placeTime(p.time, day.startedAt, now) : null;
  if (!placed) return "That time can't be placed in the current lived day. Give a real time as HH:MM, 24-hour, or leave it out for now.";
  const { time: _time, ...rest } = p;
  return { ...rest, at: placed } as P;
}

/** CONTEXT-ACTIONS guard (review of #357/#366): a task card applies only to the task as it was read. */
async function taskGuard(p: { task_id: string; title: string }, expected: ProposalContext) {
  const current = await getObligation(p.task_id);
  if (!current || current.title !== p.title || expected.taskVersions[p.task_id] !== JSON.stringify(current)) throw new Error("CONTEXT_CHANGED");
}
const taskInput = (i: Input) => { const id = str(i.task_id), t = str(i.title); return id && t ? { task_id: id, title: t } : null; };
const TASK = (what: string) => ({ description: what, input_schema: obj(["task_id", "title"], { task_id: s("id from OPEN TASKS"), title: s("the task's title") }) });

/** Today's latest sleep or weight log (and water, for a plain correction), as the free helper reads it. */
async function latestLog(metric: "water" | "sleep" | "weight") {
  const day = await getActiveDay();
  if (!day) return null;
  if (metric === "water") { const e = (await getHydrationEntries(day.id)).at(-1); return e ? { day: day.id, root: e.rootEventId, head: e.headEventId, value: e.effectiveAmountOz } : null; }
  if (metric === "sleep") { const e = (await getSleepEntries(day.id)).at(-1); return e ? { day: day.id, root: e.rootEventId, head: e.headEventId, value: e.effectiveDurationMinutes } : null; }
  const e = (await getBodyweightEntries(day.id)).at(-1);
  return e ? { day: day.id, root: e.rootEventId, head: e.headEventId, value: e.effectiveWeightLbs } : null;
}
const metricOf = (v: unknown) => (v === "water" || v === "sleep" || v === "weight" ? v : undefined);
const describeMetric = (metric: "water" | "sleep" | "weight", v: number) => (metric === "water" ? `${v} oz` : metric === "sleep" ? hm(v) : `${v} lbs`);

export const REGISTRY: Registry = {
  log_meal: {
    tool: { description: "Propose logging food the operator says he ate. Use saved_meal_id when it matches one of his saved meals; otherwise give your best macro estimate and say it is an estimate. Give time only when he said when he ate it.",
      input_schema: obj(["name", "calories", "protein_g"], { saved_meal_id: s("id from SAVED MEALS when it matches"), name: s("what he ate"), calories: n("kcal for the amount eaten"), protein_g: n("grams of protein"), carbs_g: n("grams of carbs"), fat_g: n("grams of fat"), servings: n("servings of the saved meal, default 1"), time: TIME }) },
    parse: (i) => { const nm = str(i.name), kcal = num(i.calories), p = num(i.protein_g); return nm && kcal !== undefined && p !== undefined ? { kind: "log_meal", name: nm, calories: kcal, protein_g: p, carbs_g: num(i.carbs_g), fat_g: num(i.fat_g), saved_meal_id: str(i.saved_meal_id), servings: num(i.servings), time: str(i.time) } : null; },
    resolve: placeAt,
    describe: (p) => `Log ${p.name}${p.servings && p.servings !== 1 ? ` × ${p.servings}` : ""} · ${Math.round(p.calories)} kcal · ${Math.round(p.protein_g)} g protein${at(p)}`,
    confirm: async (p) => {
      const day = await ensureActiveDay();
      if (p.saved_meal_id) {
        try { return { undo: { kind: "meal", dayId: day.id, eventId: (await logMeal(day.id, p.saved_meal_id, p.servings ?? 1, p.at)).eventId } }; } catch { /* unknown id: log as given */ }
      }
      if (p.remember) {
        const kept = await createSavedMeal({ name: p.name.slice(0, 80), calories: Math.round(p.calories), proteinG: Math.round(p.protein_g), carbsG: Math.round(p.carbs_g ?? 0), fatG: Math.round(p.fat_g ?? 0) });
        return { undo: { kind: "meal", dayId: day.id, eventId: (await logMeal(day.id, kept.id, 1, p.at)).eventId } };
      }
      return { undo: { kind: "meal", dayId: day.id, eventId: (await logManualMeal(day.id, { name: p.name, calories: Math.round(p.calories), proteinG: Math.round(p.protein_g), carbsG: Math.round(p.carbs_g ?? 0), fatG: Math.round(p.fat_g ?? 0) }, false, p.at)).eventId } };
    },
  },
  log_water: {
    tool: { description: "Propose logging water or another plain drink, in fluid ounces. Give time only when he said when.", input_schema: obj(["oz"], { oz: n("fluid ounces"), time: TIME }) },
    parse: (i) => { const oz = num(i.oz); return oz ? { kind: "log_water", oz, time: str(i.time) } : null; },
    resolve: placeAt,
    describe: (p) => `Log ${Math.round(p.oz)} oz water${at(p)}`,
    confirm: async (p) => { const day = await ensureActiveDay(); return { undo: { kind: "water", dayId: day.id, eventId: await logWater(day.id, Math.round(p.oz), p.at) } }; },
  },
  // ALFRED-TOOLS-001: protein on its own (a shake, a bar's grams), the LOG sheet's PROTEIN.
  log_protein: {
    tool: { description: "Propose logging protein on its own (a shake, a scoop) in grams, when he gives grams rather than a meal. Give time only when he said when.", input_schema: obj(["grams"], { grams: n("grams of protein"), time: TIME }) },
    parse: (i) => { const g = num(i.grams); return g && g <= 1000 ? { kind: "log_protein", grams: g, time: str(i.time) } : null; },
    resolve: placeAt,
    describe: (p) => `Log ${Math.round(p.grams)} g protein${at(p)}`,
    confirm: async (p) => { const day = await ensureActiveDay(); return { undo: { kind: "protein", dayId: day.id, eventId: await logProtein(day.id, Math.round(p.grams), p.at) } }; },
  },
  log_sleep: {
    tool: { description: "Propose logging sleep he describes, as a duration. Main sleep unless he says nap.", input_schema: obj(["minutes"], { minutes: n("minutes slept"), nap: { type: "boolean", description: "true for a nap" } }) },
    parse: (i) => { const m = num(i.minutes); return m ? { kind: "log_sleep", minutes: Math.round(m), nap: i.nap === true } : null; },
    describe: (p) => `Log ${p.nap ? "nap" : "main sleep"} ${hm(p.minutes)}`,
    confirm: async (p) => { const day = await ensureActiveDay(); return { undo: { kind: "sleep", dayId: day.id, eventId: await logSleep(day.id, p.minutes, p.nap ? "SUPPLEMENTAL" : "PRIMARY") } }; },
  },
  log_weight: {
    tool: { description: "Propose logging a bodyweight he reports, in pounds.", input_schema: obj(["lbs"], { lbs: n("pounds") }) },
    parse: (i) => { const lbs = num(i.lbs); return lbs ? { kind: "log_weight", lbs } : null; },
    describe: (p) => `Log weight ${p.lbs} lb`,
    confirm: async (p) => { const day = await ensureActiveDay(); return { undo: { kind: "weight", dayId: day.id, eventId: await logBodyweight(day.id, p.lbs) } }; },
  },
  // CORRECTIONS-001, opened to Alfred by ALFRED-TOOLS-001: today's latest water, sleep or weight, through its correction chain.
  correct_log: {
    tool: { description: "Propose correcting today's latest water, sleep or weight log to the right amount (water oz, sleep minutes, weight lbs). BEYOND fills in which log and its current value. For meals, protein or older water use fix_entry.",
      input_schema: obj(["metric", "to"], { metric: { type: "string", enum: ["water", "sleep", "weight"] }, to: n("the right amount: oz, minutes or lbs") }) },
    parse: (i) => { const metric = metricOf(i.metric), to = num(i.to); return metric && to ? { kind: "correct_log", metric, target_id: "", from: 0, to: metric === "weight" ? to : Math.round(to) } : null; },
    resolve: async (p) => {
      const last = await latestLog(p.metric);
      if (!last) return `No ${p.metric} logged today to correct. Say so, or propose logging it.`;
      if (last.value === p.to) return `Today's latest ${p.metric} is already ${describeMetric(p.metric, p.to)}.`;
      return { ...p, target_id: last.head, from: last.value };
    },
    describe: (p) => p.metric === "water" ? `Change last water: ${p.from} → ${p.to} oz` : p.metric === "sleep" ? `Change last sleep: ${hm(p.from)} → ${hm(p.to)}` : `Change last weight: ${p.from} → ${p.to} lbs`,
    confirm: async (p) => {
      if (!p.target_id) throw new Error("CHANGED_SINCE_CARD: this card has no record behind it.");
      const day = await ensureActiveDay();
      if (p.metric === "water") await correctWater(day.id, p.target_id, p.to);
      else if (p.metric === "sleep") await correctSleep(day.id, p.target_id, p.to);
      else await correctBodyweight(day.id, p.target_id, p.to);
      return {};
    },
  },
  // ALFRED-TOOLS-001: take out today's latest sleep or weight log (the LOG sheet's own void; HISTORY keeps it).
  remove_log: {
    tool: { description: "Propose removing today's latest sleep or weight log when he says it was wrong and shouldn't count. BEYOND fills in which log. HISTORY keeps the original. For meals, water or protein use fix_entry.",
      input_schema: obj(["metric"], { metric: { type: "string", enum: ["sleep", "weight"] } }) },
    parse: (i) => (i.metric === "sleep" || i.metric === "weight" ? { kind: "remove_log", metric: i.metric, target_id: "", from: 0 } : null),
    resolve: async (p) => {
      const last = await latestLog(p.metric);
      return last ? { ...p, target_id: last.root, from: last.value } : `No ${p.metric} logged today to remove.`;
    },
    describe: (p) => `Remove today's last ${p.metric === "sleep" ? "sleep" : "weight"} (${describeMetric(p.metric, p.from)})`,
    guard: async (p) => {
      const last = await latestLog(p.metric);
      if (!last || last.root !== p.target_id || last.value !== p.from) throw new Error("CONTEXT_CHANGED");
    },
    confirm: async (p) => {
      const day = await ensureActiveDay();
      const done = p.metric === "sleep" ? await voidSleepLog(day.id, p.target_id) : await voidBodyweightLog(day.id, p.target_id);
      if (!done) throw new Error("LOG_NOT_FOUND: that log was already removed.");
      return {};
    },
  },
  add_reminder: {
    tool: { description: "Propose a reminder or task. due_date is the local calendar date it is due (YYYY-MM-DD). For repeats give an iCalendar RRULE (e.g. FREQ=MONTHLY;BYMONTHDAY=15). Put the time or moment he named (\"after I wake\", \"9:30\") in when_note.",
      input_schema: obj(["title"], { title: s("short reminder text in his words"), due_date: s("YYYY-MM-DD"), repeat_rrule: s("RRULE, only if it repeats"), when_note: s("time or moment of day he named"), project_id: s("id from OPEN PROJECTS, only when this is a step of that project"), project_title: s("that project's exact title, required with project_id") }) },
    parse: (i) => { const t = str(i.title); const due = str(i.due_date); return t ? { kind: "add_reminder", title: t, due_date: due && isRealDate(due) ? due : undefined, repeat_rrule: str(i.repeat_rrule), when_note: str(i.when_note), project_id: str(i.project_id), project_title: str(i.project_title) } : null; },
    describe: (p) => `${p.project_id ? `Add step to ${p.project_title ?? "a project"}` : "Remind"}: ${p.title}${p.due_date ? ` · ${humanDate(p.due_date)}` : ""}${p.when_note ? ` · ${p.when_note}` : ""}${p.repeat_rrule ? " · repeats" : ""}`,
    confirm: async (p) => {
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
    },
  },
  routine_new: {
    tool: { description: "Propose a ROUTINE he describes for one moment of his rotation: BEFORE_SHIFT, ON_SHIFT, AFTER_SHIFT or DAY_OFF. Steps are his own, short, in order (1 to 15). Use what he says he does; don't add steps he didn't mention without asking.",
      input_schema: obj(["title", "moment", "steps"], { title: s("short name, e.g. Pre-shift"), moment: { type: "string", enum: [...ROUTINE_MOMENTS], description: "when it applies" }, steps: { type: "array", minItems: 1, maxItems: 15, items: s("one step") } }) },
    parse: (i) => {
      const t = str(i.title), moment = ROUTINE_MOMENTS.find((m) => m === i.moment);
      const steps = Array.isArray(i.steps) ? i.steps.flatMap((x) => (str(x) ? [str(x)!] : [])).slice(0, 15) : undefined;
      return t && moment && steps?.length ? { kind: "routine_new", title: t, moment, steps } : null;
    },
    describe: (p) => `New routine · ${ROUTINE_MOMENT_LABELS[p.moment]}: ${p.title} · ${p.steps.map((st, k) => `${k + 1}. ${st}`).join("; ")}`,
    confirm: async (p) => { await createRoutine({ title: p.title, moment: p.moment, steps: p.steps }); return {}; },
  },
  routine_edit: {
    tool: { description: "Propose a change he asked for to one of his ROUTINES (by id): a new name, moment, or the full new list of steps in order. Only when he asks; never change a routine on your own.",
      input_schema: obj(["routine_id", "title"], { routine_id: s("id from ROUTINES"), title: s("the routine's name (new name if renaming)"), moment: { type: "string", enum: [...ROUTINE_MOMENTS], description: "new moment, if changing" }, steps: { type: "array", minItems: 1, maxItems: 15, items: s("one step"), description: "the full new list, if changing steps" } }) },
    parse: (i) => {
      const t = str(i.title), moment = ROUTINE_MOMENTS.find((m) => m === i.moment), id = str(i.routine_id);
      const steps = Array.isArray(i.steps) ? i.steps.flatMap((x) => (str(x) ? [str(x)!] : [])).slice(0, 15) : undefined;
      return id && t ? { kind: "routine_edit", routine_id: id, title: t, moment, steps: steps?.length ? steps : undefined } : null;
    },
    describe: (p) => `Change routine ${p.title}${p.moment ? ` · now ${ROUTINE_MOMENT_LABELS[p.moment].toLowerCase()}` : ""}${p.steps ? ` · steps: ${p.steps.map((st, k) => `${k + 1}. ${st}`).join("; ")}` : ""}`,
    // ROUTINES-001 (review of #357, L3): an edit card applies only to the routine it was proposed for.
    guard: async (p, expected) => { const current = await db.routines.get(p.routine_id); if (!current || expected.routineVersions?.[p.routine_id] !== current.updatedAt) throw new Error("CONTEXT_CHANGED"); },
    confirm: async (p) => {
      const routine = (await getRoutines()).find((r) => r.id === p.routine_id);
      if (!routine || routine.status !== "ACTIVE") throw new Error("ROUTINE_NOT_FOUND: no routine in use with that id.");
      await modifyRoutine(routine.id, { title: p.title, ...(p.moment ? { moment: p.moment } : {}), ...(p.steps ? { steps: matchSteps(routine, p.steps) } : {}) }, routine.updatedAt);
      return {};
    },
  },
  project_new: {
    tool: { description: "Propose a new PROJECT: something finite he wants to get done (renew a passport, clear the garage), with its first steps. Use it when he asks for help getting something done. Steps are concrete actions in his words, 1 to 8, in a sensible order. Give a due_date only for a date he named or one that is a fact (an appointment). Not for ongoing direction: that is a Mission.",
      input_schema: obj(["title", "steps"], { title: s("short project name"), finish: s("what finished looks like, in his words, if he said"), steps: { type: "array", minItems: 1, maxItems: 8, items: obj(["title"], { title: s("one concrete step"), due_date: s("YYYY-MM-DD, only if known") }) } }) },
    parse: (i) => {
      const t = str(i.title);
      const steps = (Array.isArray(i.steps) ? i.steps : []).slice(0, 8).flatMap((raw) => {
        const r = (raw && typeof raw === "object" ? raw : {}) as Input;
        const st = str(r.title), due = str(r.due_date);
        return st ? [{ title: st, due_date: due && isRealDate(due) ? due : undefined }] : [];
      });
      return t && steps.length ? { kind: "project_new", title: t, finish: str(i.finish), steps } : null;
    },
    describe: (p) => `New project: ${p.title}${p.finish ? ` (finished when ${p.finish})` : ""} · ${p.steps.length} ${p.steps.length === 1 ? "step" : "steps"}: ${p.steps.map((st, k) => `${k + 1}. ${st.title}${st.due_date ? ` (${humanDate(st.due_date)})` : ""}`).join("; ")}`,
    confirm: async (p) => { await createProject({ title: p.title, ...(p.finish ? { finish: p.finish } : {}) }, p.steps.map((st) => ({ title: st.title, ...(st.due_date ? { dueAt: st.due_date } : {}) }))); return {}; },
  },
  capture_note: {
    tool: { description: "Propose saving a note or thought he wants kept, with no due date.", input_schema: obj(["text"], { text: s("the note") }) },
    parse: (i) => { const t = str(i.text); return t ? { kind: "capture_note", text: t } : null; },
    describe: (p) => `Note: ${p.text}`,
    confirm: async (p) => { await captureItem(p.text); return {}; },
  },
  check_in: {
    tool: { description: "Propose BEYOND's check-in from how he says he feels. Use all five scales from his words; if he hasn't said enough to place one, ask instead of guessing. BEYOND's Engine reads the check-in and makes its own recommendation.",
      input_schema: obj(["energy", "stress", "mood", "soreness", "alcohol_urge"], { energy: scale("1 drained … 5 sharp", 1), stress: scale("1 calm … 5 maxed", 1), mood: scale("1 low … 5 good", 1), soreness: scale("0 none … 5 very sore", 0), alcohol_urge: scale("0 none … 5 strong", 0) }) },
    parse: (i) => {
      const v = (x: unknown, min: number) => (typeof x === "number" && Number.isInteger(x) && x >= min && x <= 5 ? x : undefined);
      const energy = v(i.energy, 1), stress = v(i.stress, 1), mood = v(i.mood, 1), soreness = v(i.soreness, 0), urge = v(i.alcohol_urge, 0);
      return energy && stress && mood && soreness !== undefined && urge !== undefined
        ? { kind: "check_in", energy: energy as Scale, stress: stress as Scale, mood: mood as Scale, soreness: soreness as Zero, alcohol_urge: urge as Zero } : null;
    },
    describe: (p) => `Check in · energy ${p.energy} · stress ${p.stress} · mood ${p.mood} · soreness ${p.soreness} · urge ${p.alcohol_urge}`,
    confirm: async (p) => { const day = await ensureActiveDay(); await submitCheckIn(day.id, { energy: p.energy, stress: p.stress, mood: p.mood, soreness: p.soreness, alcoholUrge: p.alcohol_urge }); return {}; },
  },
  work_started: {
    tool: { description: "Propose recording that his shift has actually started, now (he says he's at work, clocked in, started).", input_schema: none },
    parse: () => ({ kind: "work_started" }),
    describe: () => "Started work",
    confirm: async () => { const day = await ensureActiveDay(); await markWorkStarted(day.id); return {}; },
  },
  work_ended: {
    tool: { description: "Propose recording that his shift is over, now (he says he's off, done, leaving work). Never for a shift that is still going.", input_schema: none },
    parse: () => ({ kind: "work_ended" }),
    describe: () => "Work ended",
    confirm: async () => { const day = await ensureActiveDay(); await markWorkEnded(day.id); return {}; },
  },
  // ALFRED-TOOLS-001: today is a work day or a day off (TODAY's own WORK/OFF switch, always his MANUAL declaration).
  set_work_context: {
    tool: { description: "Propose setting TODAY (the current lived day) as a work day or a day off, when he says today is different from what BEYOND shows (\"I'm off today\", \"got called in\"). Not for future days: use schedule_change.",
      input_schema: obj(["context"], { context: { type: "string", enum: ["WORK", "OFF"] } }) },
    parse: (i) => (i.context === "WORK" || i.context === "OFF" ? { kind: "set_work_context", context: i.context } : null),
    resolve: async (p) => {
      const day = await getActiveDay();
      if (!day) return "There's no lived day open yet; BEYOND starts one when he logs something.";
      if (day.workContext === p.context) return `Today is already ${p.context === "WORK" ? "a work day" : "a day off"} in BEYOND.`;
      return { ...p, day_id: day.id };
    },
    describe: (p) => (p.context === "WORK" ? "Today is a work day" : "Today is a day off"),
    confirm: async (p) => {
      const day = await ensureActiveDay();
      if (p.day_id && day.id !== p.day_id) throw new Error("CONTEXT_CHANGED");
      await setWorkContext(day.id, p.context, "MANUAL");
      return {};
    },
  },
  // SCHEDULE-EXCEPTIONS-001, opened to Alfred by ALFRED-TOOLS-001: overtime or time off on one future day.
  schedule_change: {
    tool: { description: "Propose a confirmed change to his schedule on ONE future day: an extra shift (WORK on a scheduled day off) or time off (OFF on a scheduled work day). Use the date the shift starts. Not for today: use set_work_context.",
      input_schema: obj(["date", "kind"], { date: s("YYYY-MM-DD, a future day"), kind: { type: "string", enum: ["WORK", "OFF"] }, note: s("why, in his words, if he said") }) },
    parse: (i) => { const d = str(i.date); return d && isRealDate(d) && (i.kind === "WORK" || i.kind === "OFF") ? { kind: "schedule_change", date: d, work: i.kind, note: str(i.note) } : null; },
    describe: (p) => `${p.work === "WORK" ? "Extra shift" : "Day off"} · ${humanDate(p.date)}${p.note ? ` · ${p.note}` : ""}`,
    confirm: async (p) => { await confirmScheduleException({ date: p.date, kind: p.work, ...(p.note ? { note: p.note } : {}) }); return {}; },
  },
  schedule_swap: {
    tool: { description: "Propose a shift swap: he works work_date (a scheduled day off) instead of off_date (a scheduled work day). Both future days.",
      input_schema: obj(["work_date", "off_date"], { work_date: s("YYYY-MM-DD he will now work"), off_date: s("YYYY-MM-DD he will now have off"), note: s("why, if he said") }) },
    parse: (i) => { const w = str(i.work_date), o = str(i.off_date); return w && o && isRealDate(w) && isRealDate(o) ? { kind: "schedule_swap", work_date: w, off_date: o, note: str(i.note) } : null; },
    describe: (p) => `Swap shifts · work ${humanDate(p.work_date)} · off ${humanDate(p.off_date)}${p.note ? ` · ${p.note}` : ""}`,
    confirm: async (p) => { await confirmShiftSwap({ workDate: p.work_date, offDate: p.off_date, ...(p.note ? { note: p.note } : {}) }); return {}; },
  },
  // NOTES-HANDOFF-001, opened to Alfred: a note for his next shift, on a day whose shift is marked ended.
  handoff_note: {
    tool: { description: `Propose a handoff note for his NEXT shift (what to pick up, who to call), only after today's shift is marked ended. At most ${SHIFT_HANDOFF_MAX_LENGTH} characters, in his words.`,
      input_schema: obj(["note"], { note: s("the note") }) },
    parse: (i) => { const t = str(i.note); return t ? { kind: "handoff_note", note: t } : null; },
    resolve: async (p) => {
      if (p.note.length > SHIFT_HANDOFF_MAX_LENGTH) return `A handoff note is at most ${SHIFT_HANDOFF_MAX_LENGTH} characters; shorten it.`;
      const day = await getActiveDay();
      if (!day || !(await getWorkPeriodEnded(day.id))) return "A handoff note goes on a day whose shift is marked ended. Propose work_ended first if he is off, or capture_note instead.";
      return { ...p, day_id: day.id };
    },
    describe: (p) => `Note for next shift: ${p.note}`,
    confirm: async (p) => {
      const day = await ensureActiveDay();
      if (p.day_id && day.id !== p.day_id) throw new Error("CONTEXT_CHANGED");
      await noteShiftHandoff(day.id, p.note);
      return {};
    },
  },
  task_done: {
    tool: TASK("Propose marking one of his OPEN TASKS done. Use the task's id from the records."),
    parse: (i) => { const t = taskInput(i); return t ? { kind: "task_done", ...t } : null; },
    describe: (p) => `Done: ${p.title}`,
    guard: taskGuard,
    confirm: async (p) => { await satisfyObligation(p.task_id); return {}; },
  },
  // ALFRED-TOOLS-001: "no longer needed" (RELEASED, distinct from done) and "waiting on someone".
  task_release: {
    tool: TASK("Propose dropping one of his OPEN TASKS because it's no longer needed (not done). Only when he says so."),
    parse: (i) => { const t = taskInput(i); return t ? { kind: "task_release", ...t } : null; },
    describe: (p) => `No longer needed: ${p.title}`,
    guard: taskGuard,
    confirm: async (p) => { await releaseObligation(p.task_id); return {}; },
  },
  task_waiting: {
    tool: TASK("Propose marking one of his OPEN TASKS as waiting on someone or something else."),
    parse: (i) => { const t = taskInput(i); return t ? { kind: "task_waiting", ...t } : null; },
    describe: (p) => `Waiting: ${p.title}`,
    guard: taskGuard,
    confirm: async (p) => { await markObligationWaiting(p.task_id); return {}; },
  },
  task_new_date: {
    tool: { description: "Propose moving one of his OPEN TASKS to a new due date (YYYY-MM-DD). Use the task's id from the records.",
      input_schema: obj(["task_id", "title", "due_date"], { task_id: s("id from OPEN TASKS"), title: s("the task's title"), due_date: s("YYYY-MM-DD") }) },
    parse: (i) => { const t = taskInput(i), due = str(i.due_date); return t && due && isRealDate(due) ? { kind: "task_new_date", ...t, due_date: due } : null; },
    describe: (p) => `New date: ${p.title} · ${humanDate(p.due_date)}`,
    guard: taskGuard,
    confirm: async (p) => { await modifyObligation(p.task_id, { dueAt: p.due_date }); return {}; },
  },
  // WEEK-PLAN-001: the day he means to work on an open task (its planned date), not its due date.
  task_plan: {
    tool: { description: "Propose the day he'll work on one of his OPEN TASKS (its planned date, YYYY-MM-DD), for planning his week. Not its due date. One card per task; fit his shifts and sleep, keep work nights light, and never treat unknown time as free.",
      input_schema: obj(["task_id", "title", "planned_date"], { task_id: s("id from OPEN TASKS"), title: s("the task's title"), planned_date: s("YYYY-MM-DD") }) },
    parse: (i) => { const t = taskInput(i), day = str(i.planned_date); return t && day && isRealDate(day) ? { kind: "task_plan", ...t, planned_date: day } : null; },
    describe: (p) => `Plan: ${p.title} · ${humanDate(p.planned_date)}`,
    guard: taskGuard,
    confirm: async (p) => { await modifyObligation(p.task_id, { plannedAt: p.planned_date }); return {}; },
  },
  // HABITS-001 (free helper), opened to Alfred by name: BEYOND finds the habit, never Alfred's guess.
  habit_done: {
    tool: { description: "Propose ticking one of his habits done for today, by the habit's name as he says it. BEYOND finds the habit; if it can't, you'll be told.", input_schema: obj(["habit"], { habit: s("the habit's name") }) },
    parse: (i) => { const h = str(i.habit); return h ? { kind: "habit_done", habit_id: "", name: h } : null; },
    resolve: async (p) => {
      if (p.habit_id) return p;
      const habit = matchOne(await getActiveHabits(), p.name);
      return habit ? { ...p, habit_id: habit.id, name: habit.name } : `No single habit matches "${p.name}". Ask him which habit he means.`;
    },
    describe: (p) => `Done today: ${p.name}`,
    confirm: async (p) => { await setHabitDone(p.habit_id, true); return {}; },
  },
  routine_tick: {
    describe: (p) => `Tick: ${p.text} (${p.routine_title})`,
    // FREE-HELPER-001 (review of #366): a tick applies only to the active routine it was read from.
    guard: async (p, expected) => {
      const current = await db.routines.get(p.routine_id);
      if (!current || expected.routineVersions?.[p.routine_id] !== current.updatedAt) throw new Error("CONTEXT_CHANGED");
      if (current.status !== "ACTIVE" || !current.steps.some((st) => st.id === p.step_id)) throw new Error("CONTEXT_CHANGED");
    },
    confirm: async (p) => { const day = await ensureActiveDay(); await setRoutineStep(day.id, p.routine_id, p.step_id, true); return {}; },
  },
  // COLLECTIONS-001 (free helper), opened to Alfred by name.
  collection_add: {
    tool: { description: "Propose adding one item to one of his COLLECTIONS (a list he keeps, e.g. Books, Gift ideas), by the collection's name. BEYOND finds the list; if it can't, you'll be told.", input_schema: obj(["collection", "value"], { collection: s("the list's name"), value: s("the item, in his words") }) },
    parse: (i) => { const c = str(i.collection), v = str(i.value); return c && v ? { kind: "collection_add", collection_id: "", collection_name: c, field_id: "", field_label: "", value: v.slice(0, 200) } : null; },
    resolve: async (p) => {
      if (p.collection_id) return p;
      const found = matchOne(await getCollections(), p.collection_name);
      const field = found?.fields[0];
      return found && field ? { ...p, collection_id: found.id, collection_name: found.name, field_id: field.id, field_label: field.label } : `No single collection matches "${p.collection_name}". Ask him which list.`;
    },
    describe: (p) => `Add to ${p.collection_name} · ${p.field_label}: ${p.value}`,
    confirm: async (p) => {
      const collection = await getCollection(p.collection_id);
      if (!collection || collection.name !== p.collection_name || collection.fields[0]?.id !== p.field_id) throw new Error("COLLECTION_MISMATCH");
      await addCollectionItem(collection.id, { [p.field_id]: p.value });
      return {};
    },
  },
  fix_entry: {
    tool: { description: "Propose fixing one meal, water or protein entry he logged in the current or previous lived day: move it to the time he really had it, correct its amount, or remove it. Call day_entries first for the entry's id. BEYOND checks the id and fills the card from the record; he confirms. Never use this to log something new.",
      input_schema: obj(["entry_id", "action"], {
        entry_id: s("the id from day_entries"), action: { type: "string", enum: ["move", "correct", "remove"] },
        time: s("move only: the new time as HH:MM, 24-hour (\"23:00\")"),
        calories: { type: "number", description: "correct, meal only" }, protein_g: { type: "number", description: "correct, meal only" },
        carbs_g: { type: "number", description: "correct, meal only" }, fat_g: { type: "number", description: "correct, meal only" },
        oz: { type: "number", description: "correct, water only" }, grams: { type: "number", description: "correct, protein only" } }) },
    parse: (i) => {
      const id = str(i.entry_id), action = i.action === "move" || i.action === "correct" || i.action === "remove" ? i.action : undefined;
      if (!id || !action) return null;
      const values = { calories: num(i.calories), protein_g: num(i.protein_g), carbs_g: num(i.carbs_g), fat_g: num(i.fat_g), oz: num(i.oz), grams: num(i.grams) };
      return { kind: "fix_entry", action, entry_id: id, time: str(i.time), values: Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) };
    },
    // ALFRED-FIX-001: a fix is filled from the record before it can be a card; a wrong id or time goes back to Alfred.
    resolve: (p, now) => resolveFix(p, now),
    describe: describeFix,
    confirm: async (p) => { await confirmFix(p); return {}; },
  },
  // GYM-SETS-001: one set into the workout in progress. Free helper only.
  log_set: {
    describe: (p) => `Log set: ${p.exercise_name} ${p.weight} × ${p.reps}`,
    confirm: async (p) => {
      const session = await getActiveWorkoutSession();
      if (!session || session.id !== p.session_id) throw new Error("WORKOUT_NOT_ACTIVE: that workout is no longer in progress.");
      // The next number after any logged or skipped set of this exercise, as TRAIN numbers them (review of #386).
      const last = Math.max(0, ...(await getPerformedSets(session.id)).filter((st) => st.exerciseId === p.exercise_id && st.setKind !== "WARMUP").map((st) => st.setNumber));
      await logSet(session.beyondDayId, session.id, p.exercise_id, last + 1, p.weight, p.reps);
      return {};
    },
  },
  clean_day: {
    tool: { description: "Propose logging today as a clean day in his QUIT TRACKER, only when he says today was clean.", input_schema: none },
    parse: () => ({ kind: "clean_day" }),
    describe: () => "Log today clean",
    confirm: async () => { const day = await ensureActiveDay(); await logCleanDay(day.id); return {}; },
  },
  open_training: {
    tool: { description: "Offer to open TRAIN so he can start or resume today's workout. BEYOND picks the session there.", input_schema: none },
    parse: () => ({ kind: "open_training" }),
    describe: () => "Open TRAIN for today's workout",
    confirm: async () => ({ open: "TRAIN" }),
    label: "OPEN",
  },
  person_date: {
    tool: { description: "Propose keeping a person's yearly date (birthday, anniversary) as one card: it saves the fact and a reminder that repeats every year. Use it instead of remember plus add_reminder whenever he gives a person and a month and day. Only dates he stated; never guess a year or a date.",
      input_schema: obj(["person", "occasion", "month", "day"], { person: s("the person, as he names them"), occasion: s("Birthday, Anniversary, or a short name for the date"),
        month: { type: "integer", minimum: 1, maximum: 12, description: "month number" }, day: { type: "integer", minimum: 1, maximum: 31, description: "day of the month" }, note: s("anything he added about them, e.g. a gift idea") }) },
    parse: (i) => {
      const person = str(i.person), occasion = str(i.occasion);
      const month = typeof i.month === "number" && Number.isInteger(i.month) ? i.month : undefined;
      const day = typeof i.day === "number" && Number.isInteger(i.day) ? i.day : undefined;
      // Review of #355: don't offer a card for a date that doesn't exist (Feb 30).
      const fits = month && day && month <= 12 && day <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
      return person && occasion && fits ? { kind: "person_date", person, occasion, month, day, note: str(i.note) } : null;
    },
    describe: (p) => `Remember ${p.person}'s ${p.occasion.toLowerCase()} · ${describeMonthDay(p.month, p.day)} · reminder every year${p.note ? ` · ${p.note}` : ""}`,
    confirm: async (p) => { await addPersonDate({ person: p.person, occasion: p.occasion, month: p.month, day: p.day, note: p.note }); return {}; },
  },
  home_item: {
    tool: { description: "Propose keeping a HOME item as one card: what to know about it (size, model, who to call, warranty) and, if it recurs, how often and the next due date. Use it for house upkeep (furnace filter every 3 months, smoke alarm batteries every year). Only facts and intervals he stated; ask for the next due date rather than guessing it.",
      input_schema: obj(["item"], { item: s("short name, e.g. Furnace filter"), details: s("what to know, in his words, e.g. 16x25x1, Home Depot"),
        every: { type: "integer", minimum: 1, maximum: 60, description: "repeat every N units, only if it recurs" }, unit: { type: "string", enum: [...REPEAT_UNITS], description: "WEEKS, MONTHS or YEARS" }, first_due: s("YYYY-MM-DD, next due date, required with every") }) },
    parse: (i) => {
      const item = str(i.item), details = str(i.details), due = str(i.first_due);
      const every = typeof i.every === "number" && Number.isInteger(i.every) && i.every >= 1 && i.every <= 60 ? i.every : undefined;
      const unit = REPEAT_UNITS.find((u) => u === i.unit);
      const repeats = every && unit && due && isRealDate(due);
      if (!item || (!details && !repeats)) return null;
      return { kind: "home_item", item, details, ...(repeats ? { every, unit, first_due: due } : {}) };
    },
    describe: (p) => `Home: ${p.item}${p.details ? ` · ${p.details}` : ""}${p.every && p.unit && p.first_due ? ` · ${describeRepeat(p.every, p.unit)} from ${humanDate(p.first_due)}` : ""}`,
    confirm: async (p) => { await addHomeItem({ item: p.item, details: p.details, ...(p.every && p.unit && p.first_due ? { repeat: { every: p.every, unit: p.unit, firstDue: p.first_due } } : {}) }); return {}; },
  },
  remember: {
    tool: { description: "Propose keeping a fact he wants remembered: people (birthdays, sizes, gift ideas), money (a bill's amount and due day), health, home, work. One fact per call, in his words.",
      input_schema: obj(["text", "topic"], { text: s("the fact"), topic: { type: "string", enum: [...MEMORY_TOPICS], description: "what it's about" } }) },
    parse: (i) => { const t = str(i.text); const topic = MEMORY_TOPICS.find((m) => m === i.topic) ?? "OTHER"; return t ? { kind: "remember", text: t, topic } : null; },
    describe: (p) => `Remember (${p.topic.toLowerCase()}): ${p.text}`,
    confirm: async (p) => { await rememberFact(p.text, p.topic); return {}; },
  },
  forget: {
    tool: { description: "Propose physical deletion of an unconverted ALFRED_MEMORY legacy entry only. For PERSONAL_FACT use memory_retire, which retains history.",
      input_schema: obj(["memory_id", "text", "source"], { source: { type: "string", enum: ["ALFRED_MEMORY"] }, memory_id: s("id from WHAT HE ASKED YOU TO REMEMBER"), text: s("the fact") }) },
    parse: (i) => { const id = str(i.memory_id), t = str(i.text); return id && t && (i.source === undefined || i.source === "ALFRED_MEMORY") ? { kind: "forget", source: "ALFRED_MEMORY", memory_id: id, text: t } : null; },
    describe: (p) => `Forget: ${p.text}`,
    confirm: async (p) => { await forgetFact(p.memory_id, undefined, p.text); return {}; },
  },
  memory_retire: {
    tool: { description: "Propose STOP USING an active PERSONAL_FACT. Keeps correction history; does not erase it.", input_schema: memoryRef() },
    parse: (i) => { const r = memoryInput(i); return r ? { kind: "memory_retire", ...r } : null; },
    describe: (p) => `Stop using: ${p.text} · Correction history retained.`,
    confirm: async (p) => { await stopUsingMemory({ source: p.source, id: p.memory_id, revision: p.revision }, p.text); return {}; },
  },
  memory_restore: {
    tool: { description: "Propose RESTORE of a PERSONAL_FACT only from an operator-provided exact reference. Never invent a missing revision.", input_schema: memoryRef() },
    parse: (i) => { const r = memoryInput(i); return r ? { kind: "memory_restore", ...r } : null; },
    describe: (p) => `Restore: ${p.text} · Available to Alfred again.`,
    confirm: async (p) => { await restoreMemory({ source: p.source, id: p.memory_id, revision: p.revision }, p.text); return {}; },
  },
  log_urge: {
    tool: { description: "Propose logging an urge (his quit tracker) he says he had, with what set it off.", input_schema: obj(["trigger"], { trigger: { type: "string", enum: [...URGE_TRIGGERS], description: "what set it off" } }) },
    parse: (i) => { const trigger = URGE_TRIGGERS.find((u) => u === i.trigger); return trigger ? { kind: "log_urge", trigger } : null; },
    describe: (p) => `Log an urge · ${p.trigger.toLowerCase().replace("_", " ")}`,
    confirm: async (p) => { const day = await ensureActiveDay(); await logUrge(day.id, p.trigger); return {}; },
  },
};

function memoryRef() {
  return obj(["memory_id", "revision", "source", "text"], { memory_id: s("exact PERSONAL_FACT id"), revision: s("exact revision from its source"), source: { type: "string", enum: ["PERSONAL_FACT"] }, text: s("exact current fact") });
}
function memoryInput(i: Input) {
  const id = str(i.memory_id), revision = str(i.revision), text = str(i.text);
  return id && revision && text && i.source === "PERSONAL_FACT" ? { memory_id: id, revision, source: "PERSONAL_FACT" as const, text } : null;
}

const spec = <K extends Kind>(kind: K) => REGISTRY[kind] as unknown as ActionSpec<K>;
const anySpec = (kind: Kind) => REGISTRY[kind] as unknown as ActionSpec<Kind>;

/** The tools Claude sees, in registry order: every kind with a `tool`. */
export const REGISTRY_TOOLS: Anthropic.Beta.BetaTool[] = (Object.keys(REGISTRY) as Kind[]).flatMap((kind) => {
  const t = anySpec(kind).tool;
  return t ? [{ name: kind, description: t.description, input_schema: t.input_schema }] : [];
});

/** A tool call to a proposal (unresolved). Only kinds Alfred may call; a helper-only kind's name gives null. */
export function parseTool(name: string, input: unknown): AlfredProposal | null {
  if (!input || typeof input !== "object" || !(name in REGISTRY)) return null;
  const entry = anySpec(name as Kind);
  return entry.tool && entry.parse ? entry.parse(input as Input) : null;
}

/** Fill a proposal from the records before it shows; a string is what to tell Alfred instead. */
export async function resolveProposal(p: AlfredProposal, now = new Date()): Promise<AlfredProposal | string> {
  const entry = anySpec(p.kind);
  return entry.resolve ? entry.resolve(p, now) : p;
}

export const describeKind = (p: AlfredProposal) => anySpec(p.kind).describe(p);
export const confirmKind = (p: AlfredProposal) => anySpec(p.kind).confirm(p);
export const guardKind = async (p: AlfredProposal, expected: ProposalContext) => { await anySpec(p.kind).guard?.(p, expected); };
export const labelKind = (p: AlfredProposal) => anySpec(p.kind).label ?? "SAVE";
export { spec as registryEntry };
