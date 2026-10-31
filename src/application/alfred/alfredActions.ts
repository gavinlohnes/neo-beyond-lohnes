import type Anthropic from "@anthropic-ai/sdk";
import { captureItem, ensureActiveDay, logBodyweight, logSleep, logWater } from "../commands";
import { logManualMeal, logMeal } from "../nutritionCommands";
import { createObligation } from "../intentCommands";

/**
 * ALFRED-001: what Alfred may propose. Each tool call becomes a card the operator confirms; only the
 * confirm runs a BEYOND command, with its usual history and corrections. Alfred never writes.
 */
export type AlfredProposal =
  | { kind: "log_meal"; saved_meal_id?: string | undefined; name: string; calories: number; protein_g: number; carbs_g?: number | undefined; fat_g?: number | undefined; servings?: number | undefined }
  | { kind: "log_water"; oz: number }
  | { kind: "log_sleep"; minutes: number; nap?: boolean }
  | { kind: "log_weight"; lbs: number }
  | { kind: "add_reminder"; title: string; due_date?: string | undefined; repeat_rrule?: string | undefined; when_note?: string | undefined }
  | { kind: "capture_note"; text: string };

const n = (description: string) => ({ type: "number" as const, description });
const s = (description: string) => ({ type: "string" as const, description });

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
    input_schema: { type: "object", additionalProperties: false, required: ["title"], properties: { title: s("short reminder text in his words"), due_date: s("YYYY-MM-DD"), repeat_rrule: s("RRULE, only if it repeats"), when_note: s("time or moment of day he named") } } },
  { name: "capture_note", description: "Propose saving a note or thought he wants kept, with no due date.",
    input_schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: s("the note") } } },
];

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
    case "add_reminder": { const t = str(i.title); const due = str(i.due_date); return t ? { kind: "add_reminder", title: t, due_date: due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : undefined, repeat_rrule: str(i.repeat_rrule), when_note: str(i.when_note) } : null; }
    case "capture_note": { const t = str(i.text); return t ? { kind: "capture_note", text: t } : null; }
    default: return null;
  }
}

/** One line for the confirm card. */
export function describeProposal(p: AlfredProposal): string {
  switch (p.kind) {
    case "log_meal": return `Log ${p.name}${p.servings && p.servings !== 1 ? ` × ${p.servings}` : ""} · ${Math.round(p.calories)} kcal · ${Math.round(p.protein_g)} g protein`;
    case "log_water": return `Log ${Math.round(p.oz)} oz water`;
    case "log_sleep": return `Log ${p.nap ? "nap" : "main sleep"} ${Math.floor(p.minutes / 60)}h ${String(p.minutes % 60).padStart(2, "0")}m`;
    case "log_weight": return `Log weight ${p.lbs} lb`;
    case "add_reminder": return `Remind: ${p.title}${p.due_date ? ` · ${p.due_date}` : ""}${p.when_note ? ` · ${p.when_note}` : ""}${p.repeat_rrule ? " · repeats" : ""}`;
    case "capture_note": return `Note: ${p.text}`;
  }
}

/** The operator's confirm: runs the matching BEYOND command. */
export async function confirmProposal(p: AlfredProposal): Promise<void> {
  if (p.kind === "capture_note") { await captureItem(p.text); return; }
  if (p.kind === "add_reminder") {
    await createObligation({
      title: p.title,
      ...(p.when_note ? { description: p.when_note } : {}),
      ...(p.due_date ? { dueAt: p.due_date } : {}),
      ...(p.repeat_rrule ? { recurrence: { rrule: p.repeat_rrule } } : {}),
    });
    return;
  }
  const day = await ensureActiveDay();
  switch (p.kind) {
    case "log_water": await logWater(day.id, Math.round(p.oz)); return;
    case "log_sleep": await logSleep(day.id, p.minutes, p.nap ? "SUPPLEMENTAL" : "PRIMARY"); return;
    case "log_weight": await logBodyweight(day.id, p.lbs); return;
    case "log_meal":
      if (p.saved_meal_id) {
        try { await logMeal(day.id, p.saved_meal_id, p.servings ?? 1); return; } catch { /* unknown id: log as given */ }
      }
      await logManualMeal(day.id, { name: p.name, calories: Math.round(p.calories), proteinG: Math.round(p.protein_g), carbsG: Math.round(p.carbs_g ?? 0), fatG: Math.round(p.fat_g ?? 0) });
      return;
  }
}
