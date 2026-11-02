import * as chrono from "chrono-node";
import { formatLocalDate } from "../../engine/scheduledContext";
import type { AlfredProposal } from "../alfred/alfredActions";
import type { UrgeTrigger } from "../../domain/common/types";

/**
 * FREE-HELPER-001 (owner go 2026-11-01): BEYOND's free helper. It turns plain, common phrasings into
 * the SAME confirm cards Alfred makes, with no AI, no network and no cost. It is deliberately
 * narrow: a clause it isn't sure about is returned as `unknown`, never guessed, so the operator can
 * hand just that part to Alfred. Pure: reads nothing, writes nothing; the caller supplies context.
 */

export interface HelperContext {
  now: Date;
  savedMeals: { id: string; name: string; calories: number; proteinG: number }[];
  openTasks: { id: string; title: string }[];
  openProjects: { id: string; title: string }[];
  routines: { id: string; title: string; steps: { id: string; text: string }[] }[];
}

export interface HelperResult { cards: AlfredProposal[]; unknown: string[] }

const QUESTION = /^(how|what|whats|what's|when|where|who|which|is|are|did|do|does|have|has|am|was|were|show|tell|list)\b/i;
export const isQuestion = (text: string) => text.trim().endsWith("?") || QUESTION.test(text.trim());

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const singular = (s: string) => s.split(" ").map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).join(" ");
const key = (s: string) => singular(norm(s).replace(/^(the|my|a|an) /, ""));

/** One unambiguous match: exact name first, else a single item whose name contains (or is contained by) it. */
export function matchOne<T extends { title?: string; name?: string; text?: string }>(items: T[], wanted: string): T | null {
  const w = key(wanted);
  if (!w) return null;
  const name = (t: T) => key(t.title ?? t.name ?? t.text ?? "");
  const exact = items.filter((t) => name(t) === w);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  // Review of #366 (B1): never the other way round ("skipped the chicken bowl" contains a meal's name).
  // Every wanted word must be in the name, and cover at least half of the name's real words.
  const words = (s: string) => s.split(" ").filter((x) => x && !FILLER.has(x));
  const want = words(w);
  const loose = items.filter((t) => {
    const have = words(name(t));
    if (!(want.length > 0 && have.length > 0 && want.every((x) => have.includes(x)))) return false;
    // FREE-HELPER-002 (#366 N1): cover more than half the name, or exactly half with distinctive words
    // only (5+ letters). "garage" finds "Clear the garage"; "car" no longer guesses "Pay car", nor "bowl" "Chicken bowl".
    return want.length * 2 > have.length || (want.length * 2 === have.length && want.every((x) => x.length >= 5));
  });
  return loose.length === 1 ? loose[0]! : null;
}

const FILLER = new Set(["the", "a", "an", "my", "of", "to", "for", "and"]);
/** Review of #366: a clause with a negation or a "skip" is never turned into a card. */
const NEGATION = /\b(not|no|never|without|skip|skipped|skipping|didnt|dont|wont|cant|isnt|wasnt|havent|hasnt|didn't|don't|won't|can't|isn't|wasn't|haven't|hasn't)\b|n't\b/i;

const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, half: 0.5, "half a": 0.5 };
const WEEKDAYS: Record<string, string> = { monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA", sunday: "SU" };

/** A single forward date chrono is sure about, and the text it matched. */
function oneDate(text: string, now: Date): { date: string; matched: string; hour?: number; minute?: number; ambiguousTime?: true } | null {
  const results = chrono.parse(text, now, { forwardDate: true });
  if (results.length !== 1) return null;
  const r = results[0]!;
  const d = r.start.date();
  // Review of #366 (M3): "at 5" doesn't say morning or evening; only am/pm or a 24-hour time is certain.
  const timeSaid = r.start.isCertain("hour");
  const meridiemKnown = r.start.isCertain("meridiem") || /\b\d{1,2}\s*(am|pm|a\.m\.|p\.m\.)\b/i.test(r.text) || d.getHours() >= 13 || /\b(noon|midnight)\b/i.test(r.text) || /\b(0\d|1[3-9]|2[0-3]):\d{2}\b/.test(r.text);
  return { date: formatLocalDate(d), matched: r.text, ...(timeSaid ? (meridiemKnown ? { hour: d.getHours(), minute: d.getMinutes() } : { ambiguousTime: true }) : {}) };
}

const strip = (text: string, part: string) => text.replace(part, " ").replace(/\b(on|by|for|at|this|next)\s*$/i, "").replace(/\s+/g, " ").trim();

function water(c: string): AlfredProposal | null {
  const m = c.match(/^(drank|had|drink|log(?:ged)?)?\s*(\d+(?:\.\d+)?)\s*(oz|ounces?|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?)(\s+(?:of\s+)?water)?$/);
  // Review of #366: "16 oz" alone could be anything; it needs "water" or a drink verb.
  if (!m || (!m[1] && !m[4])) return null;
  m.splice(1, 1);
  const n = Number(m[1]), unit = m[2]!;
  const oz = unit.startsWith("o") ? n : unit.startsWith("m") ? n / 29.5735 : n * 33.814;
  return oz > 0 && oz <= 200 ? { kind: "log_water", oz: Math.round(oz) } : null;
}

function weight(c: string): AlfredProposal | null {
  const m = c.match(/^(?:weigh(?:ed)?(?:\s+in)?(?:\s+at)?|weight(?:\s+is)?|bw)\s*(\d{2,3}(?:\.\d)?)\s*(?:lbs?|pounds)?$/) ?? c.match(/^(\d{2,3}(?:\.\d)?)\s*(?:lbs?|pounds)$/);
  if (!m) return null;
  const lbs = Number(m[1]);
  return lbs >= 50 && lbs <= 700 ? { kind: "log_weight", lbs } : null;
}

function sleep(c: string): AlfredProposal | null {
  const m = c.match(/^(slept|sleep|nap(?:ped)?)\s+(?:for\s+)?(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?))?\s*(?:and\s+)?(?:(\d+)\s*(?:m|mins?|minutes)?)?$/);
  if (!m || (!m[2] && !m[3])) return null;
  const minutes = Math.round(Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0));
  if (minutes < 5 || minutes > 1440) return null;
  // "slept 30" alone is ambiguous (minutes? hours?); a bare number needs a unit or an hour part.
  if (!m[2] && !/\d+\s*(m|mins?|minutes)$/.test(c)) return null;
  return { kind: "log_sleep", minutes, nap: m[1]!.startsWith("nap") };
}

const WORK_START = /^(at work|clocked in|clock in|started (?:work|my shift|shift)|on shift|on the clock|shift started)$/;
const WORK_END = /^(off work|clocked out|clock out|done (?:with )?(?:work|my shift|shift)|off shift|shift (?:over|done|ended)|finished (?:work|my shift|shift))$/;

function urge(c: string): AlfredProposal | null {
  const m = c.match(/^(?:had an? |log an? |logged an? )?urge(?:\s*(?:[,:\-–]|from|because of|after)?\s*(.*))?$/);
  if (!m) return null;
  const why = (m[1] ?? "").trim();
  // Review of #366 (M2): only a known reason; "urge to quit my job" or "urge 4" isn't a quit-tracker urge.
  const trigger: UrgeTrigger | null = !why ? "OTHER"
    : /^(?:after )?(?:shift|work)$/.test(why) ? "AFTER_SHIFT" : /^stress(?:ed)?$/.test(why) ? "STRESS" : /^(?:tired|exhausted)$/.test(why) ? "TIRED"
    : /^(?:social|friends?|a party|party)$/.test(why) ? "SOCIAL" : /^bored(?:om)?$/.test(why) ? "BORED" : null;
  return trigger ? { kind: "log_urge", trigger } : null;
}

function checkIn(c: string): AlfredProposal | null | "unclear" {
  const found: Record<string, number> = {};
  for (const m of c.matchAll(/\b(energy|stress|mood|soreness|sore|urge|craving)\s*(?:is|at|of|:)?\s*(\d)\b/g)) found[m[1] === "sore" ? "soreness" : m[1] === "craving" ? "urge" : m[1]!] = Number(m[2]);
  const keys = Object.keys(found);
  if (keys.length === 0) return /\bcheck ?-?in\b/.test(c) ? "unclear" : null;
  const { energy, stress, mood, soreness, urge: u } = found;
  const scale = (v: number | undefined) => v !== undefined && v >= 1 && v <= 5;
  const zero = (v: number | undefined) => v !== undefined && v >= 0 && v <= 5;
  if (scale(energy) && scale(stress) && scale(mood) && zero(soreness) && zero(u)) {
    return { kind: "check_in", energy: energy as 1, stress: stress as 1, mood: mood as 1, soreness: soreness as 0, alcohol_urge: u as 0 };
  }
  return keys.length >= 2 ? "unclear" : null;
}

function meal(c: string, ctx: HelperContext): AlfredProposal | null | "unclear" {
  const manual = c.match(/^(?:ate|had|eat|log(?:ged)?)?\s*(.+?)\s+(\d{2,4})\s*(?:cal|cals|kcal|calories)\b[\s,]*(?:and\s+)?(?:(\d{1,3})\s*g?\s*(?:protein|p)\b)?$/);
  if (manual) {
    if (!manual[3]) return "unclear"; // a card needs protein; don't make it up
    return { kind: "log_meal", name: manual[1]!.trim(), calories: Number(manual[2]), protein_g: Number(manual[3]) };
  }
  const lead = c.match(/^(?:ate|had|eat|log(?:ged)?)\s+(.+)$/);
  const body = (lead ? lead[1]! : c).trim();
  const q = body.match(/^(\d+(?:\.\d+)?|a|an|one|two|three|four|half a|half)\s+(?:x\s+)?(?:servings? of\s+|bowls? of\s+)?(.+)$/);
  const servings = q ? (NUMBER_WORDS[q[1]!] ?? Number(q[1])) : 1;
  const name = q ? q[2]! : body;
  const saved = matchOne(ctx.savedMeals, name);
  if (saved && servings > 0 && servings <= 6) {
    return { kind: "log_meal", saved_meal_id: saved.id, name: saved.name, servings, calories: Math.round(saved.calories * servings), protein_g: Math.round(saved.proteinG * servings) };
  }
  return lead ? "unclear" : null; // "ate X" for an unknown food needs Alfred's estimate
}

function remind(raw: string, ctx: HelperContext): AlfredProposal | null {
  const m = raw.match(/^remind me (?:to |about |that )?(.+)$/i);
  if (!m) return null;
  let rest = m[1]!.trim();
  let rrule: string | undefined, due: string | undefined, when: string | undefined;
  const rep = rest.match(/\bevery\s+(day|week|month|(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?|(\d{1,2})(?:st|nd|rd|th)?(?:\s+of\s+(?:the|each|every)\s+month)?)\b/i);
  if (rep) {
    const what = rep[1]!.toLowerCase();
    const wd = Object.keys(WEEKDAYS).find((d) => what.startsWith(d));
    if (what === "day") rrule = "FREQ=DAILY";
    else if (what === "week") rrule = "FREQ=WEEKLY";
    else if (what === "month") rrule = "FREQ=MONTHLY";
    else if (wd) { rrule = `FREQ=WEEKLY;BYDAY=${WEEKDAYS[wd]}`; due = oneDate(wd, ctx.now)?.date; }
    else if (rep[3]) {
      const day = Number(rep[3]);
      if (day < 1 || day > 28) return null; // 29th–31st skip short months; let Alfred talk it through
      rrule = `FREQ=MONTHLY;BYMONTHDAY=${day}`;
      const d = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), day, 12);
      if (formatLocalDate(d) < formatLocalDate(ctx.now)) d.setMonth(d.getMonth() + 1);
      due = formatLocalDate(d);
    }
    rest = strip(rest, rep[0]);
  }
  const date = oneDate(rest, ctx.now);
  if (date?.ambiguousTime) return null;
  if (date) {
    due = due ?? date.date;
    if (date.hour !== undefined) when = `${String(date.hour).padStart(2, "0")}:${String(date.minute ?? 0).padStart(2, "0")}`;
    rest = strip(rest, date.matched);
  }
  const title = rest.replace(/[.!]+$/, "").replace(/^(to|about|that)\s+/i, "").trim();
  if (!title || /^(to|about|that)$/i.test(title) || title.length > 120) return null;
  return { kind: "add_reminder", title: title[0]!.toUpperCase() + title.slice(1), due_date: due, repeat_rrule: rrule, when_note: when };
}

function taskAction(c: string, ctx: HelperContext): AlfredProposal | null | "unclear" {
  let m = c.match(/^(?:move|push|reschedule)\s+(.+?)\s+to\s+(.+)$/);
  if (m) {
    const task = matchOne(ctx.openTasks, m[1]!), d = oneDate(m[2]!, ctx.now);
    if (d && (d.hour !== undefined || d.ambiguousTime)) return "unclear"; // a task has a date, not a time
    return task && d ? { kind: "task_new_date", task_id: task.id, title: task.title, due_date: d.date } : "unclear";
  }
  m = c.match(/^plan\s+(.+)$/);
  if (m) {
    const d = oneDate(m[1]!, ctx.now);
    if (d && (d.hour !== undefined || d.ambiguousTime)) return "unclear";
    const task = d ? matchOne(ctx.openTasks, strip(m[1]!, d.matched).replace(/\s+(for|on)$/, "")) : null;
    return task && d ? { kind: "task_plan", task_id: task.id, title: task.title, planned_date: d.date } : "unclear";
  }
  const stepForm = c.match(/^add (?:a )?step to (?:the )?(.+?)\s*(?:project)?\s*[:\-–]\s*(.+)$/);
  const toForm = c.match(/^add (.+?) to (?:the )?(.+?) project$/);
  const step = stepForm ? { project: stepForm[1]!, title: stepForm[2]! } : toForm ? { project: toForm[2]!, title: toForm[1]! } : null;
  if (step) {
    const project = matchOne(ctx.openProjects, step.project);
    if (!project) return "unclear";
    const title = step.title.trim();
    return { kind: "add_reminder", title: title[0]!.toUpperCase() + title.slice(1), project_id: project.id, project_title: project.title };
  }
  const done = c.match(/^(?:done|did|finished|completed|complete|mark(?:ed)? done)\s*[:\-–]?\s+(.+)$/) ?? c.match(/^(.+?)\s+(?:is\s+)?done$/);
  const tick = c.match(/^(?:ticked|tick(?: off)?|checked off)\s+(.+)$/);
  const wanted = (tick ?? done)?.[1];
  if (!wanted) return null;
  if (!tick) {
    const task = matchOne(ctx.openTasks, wanted);
    if (task) return { kind: "task_done", task_id: task.id, title: task.title };
  }
  const steps = ctx.routines.flatMap((r) => r.steps.map((s) => ({ text: s.text, routine: r, step: s })));
  const hit = matchOne(steps, wanted);
  if (hit) return { kind: "routine_tick", routine_id: hit.routine.id, step_id: hit.step.id, text: hit.step.text, routine_title: hit.routine.title };
  return "unclear";
}

/** Split a logging message into clauses. A reminder, note or step keeps its whole text. */
export function clauses(text: string): string[] {
  const t = text.trim();
  if (/^(remind me|note\b|add (?:a )?step\b)/i.test(t)) return [t];
  // A reminder, note or step after other items keeps the rest of the message as one clause.
  const tail = t.search(/[,;]?\s*(?:\band\s+)?\b(remind me|note\s*[:\-–]|add (?:a )?step to)\b/i);
  if (tail > 0) {
    const rest = t.slice(tail).replace(/^[,;]?\s*(?:and\s+)?/i, "");
    return [...clauses(t.slice(0, tail)), rest];
  }
  // "urge, stress" is one thing: keep an urge's reason with it.
  return t.replace(/\burge\s*[,:]\s*/gi, "urge ").split(/\s*(?:,|;|\n|\.\s|\band then\b|\bthen\b|\bplus\b|\band\b)\s*/i).map((s) => s.trim()).filter(Boolean);
}

/** Cards for every clause it is sure about; everything else is `unknown`, word for word. */
export function interpret(text: string, ctx: HelperContext): HelperResult {
  const cards: AlfredProposal[] = [], unknown: string[] = [];
  // Review of #366 (B1, M1): any negation outside a note's own words makes the whole message unclear,
  // so "don't remind me…" or "didn't eat the bowl" is never turned into a card.
  const beforeNote = text.split(/\bnote\s*[:\-–]/i)[0]!;
  if (NEGATION.test(beforeNote.replace(/[’]/g, "'"))) return { cards, unknown: [text.trim()] };
  for (const raw of clauses(text)) {
    const c = norm(raw.replace(/^(i |just |also |and )+/i, "")).replace(/\boz\b/g, "oz");
    const lower = raw.toLowerCase().trim().replace(/[.!]+$/, "").replace(/^(i |just |also )+/, "");
    let card: AlfredProposal | null | "unclear" = null;
    const note = raw.trim().match(/^note\s*[:\-–]?\s+(.+)$/i);
    if (note) card = { kind: "capture_note", text: note[1]!.trim() };
    else if (/^remind me\b/i.test(raw.trim())) card = remind(raw.trim(), ctx);
    else if (WORK_START.test(c)) card = { kind: "work_started" };
    else if (WORK_END.test(c)) card = { kind: "work_ended" };
    else if (/^(clean day|today was clean|log clean(?: day)?|clean today)$/.test(c)) card = { kind: "clean_day" };
    else card = water(lower) ?? weight(lower) ?? sleep(lower) ?? urge(c) ?? checkIn(c) ?? taskAction(lower, ctx)
      ?? (/(^|\s)-\s*\d/.test(lower) ? "unclear" : meal(lower.replace(/[^a-z0-9 .]+/g, " ").replace(/\s+/g, " "), ctx)); // a negative amount is a typo, not a log
    if (card && card !== "unclear") cards.push(card);
    else unknown.push(raw.trim());
  }
  return { cards, unknown };
}

/**
 * FREE-HELPER-002: the food a clause the helper couldn't log talks about, for the free food search.
 * "for dinner I just ate 2 pieces of pepperoni pizza from Little Caesars" → "pepperoni pizza little caesars".
 * Only clauses that say they ate or had something; anything else returns null.
 */
export function foodQuery(clause: string): string | null {
  const c = clause.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  // Review of #379: "ate" is about food; "had/got/grabbed" only with a meal cue ("had a bad day at work" is not food).
  const m = c.match(/\b(?:ate|eaten|eat|eating)\b\s+(.+)$/)
    ?? (/\b(breakfast|lunch|dinner|supper|snack|slices?|pieces?|servings?|bowl|plate|order)\b/.test(c) ? c.match(/\b(?:had|having|grabbed|got)\b\s+(.+)$/) : null);
  if (!m || /\b(no|not|never|didn't|didnt|skipped|without)\b/.test(c)) return null;
  const words = m[1]!
    .replace(/\b(will you|can you|could you|please|log|my|meal|and protein|protein intake|intake|for (breakfast|lunch|dinner|supper)|just|a|an|the|some|of|from|at|with|piece|pieces|slice|slices|serving|servings|bowl|plate|order|\d+(\.\d+)?|one|two|three|four|half)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  return words.length >= 3 ? words.slice(0, 60) : null;
}
