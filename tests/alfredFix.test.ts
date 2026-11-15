import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import { logWater, startDay } from "../src/application/commands";
import { logManualMeal } from "../src/application/nutritionCommands";
import { getDayLogEntries, getDayLogEntry, correctLogEntry } from "../src/application/logEntries";
import { confirmFix, describeFix, describeRecentEntries, resolveFix, snapshotOf, type FixProposal } from "../src/application/alfred/fixEntries";
import { interpret, type HelperContext } from "../src/application/helper/freeHelper";
import { readHelperContext } from "../src/application/helper/helperContext";
import { toProposal, runReadTool } from "../src/application/alfred/alfredActions";

/** ALFRED-FIX-001: Alfred and the free helper propose a fix to one logged entry; the card shows the real record. */
beforeEach(async () => { await db.delete(); await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });
const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m);

async function seed() {
  vi.setSystemTime(at(17));
  const day = await startDay();
  vi.setSystemTime(at(19, 15));
  await logManualMeal(day.id, { name: "Butter Chicken and Rice", calories: 560, proteinG: 46, carbsG: 60, fatG: 18 });
  await logWater(day.id, 16);
  vi.setSystemTime(at(19, 26));
  const [meal, water] = await getDayLogEntries(day.id);
  return { day, meal: meal!, water: water! };
}

describe("Alfred's fix_entry", () => {
  it("reads entries with ids, resolves a move to the real before and after, and confirms through the existing retime", async () => {
    try {
      const { day, meal } = await seed();
      const list = await runReadTool("day_entries", {});
      expect(list).toContain(`id=${meal.rootEventId} · MEAL · Butter Chicken and Rice · 19:15`);
      const raw = toProposal("fix_entry", { entry_id: meal.rootEventId, action: "move", time: "23:00" }) as FixProposal;
      const card = await resolveFix(raw, at(19, 26));
      expect(typeof card).toBe("object");
      expect(describeFix(card as FixProposal)).toBe("Move Butter Chicken and Rice · 19:15 → 23:00");
      await confirmFix(card as FixProposal);
      expect(new Date((await getDayLogEntry(day.id, meal.rootEventId))!.at).getHours()).toBe(23);
      expect((await db.events.toArray()).map((e) => e.type)).toContain("LOG_RETIMED");
    } finally { vi.useRealTimers(); }
  });

  it("tells Alfred instead of showing a card for an unknown id, a time outside the lived day, or nothing to change", async () => {
    try {
      const { meal, water } = await seed();
      expect(await resolveFix({ kind: "fix_entry", action: "remove", entry_id: "nope" })).toMatch(/^No meal, water or protein entry with that id/);
      // Not a real clock time: refused, never rolled over (25:00 is not 01:00).
      expect(await resolveFix({ kind: "fix_entry", action: "move", entry_id: meal.rootEventId, time: "25:00" }, at(19, 26))).toMatch(/can't be placed/);
      expect(await resolveFix({ kind: "fix_entry", action: "move", entry_id: meal.rootEventId, time: "23:60" }, at(19, 26))).toMatch(/can't be placed/);
      expect(await resolveFix({ kind: "fix_entry", action: "correct", entry_id: meal.rootEventId, values: { calories: 560 } })).toMatch(/^Nothing to change/);
      expect(await resolveFix({ kind: "fix_entry", action: "correct", entry_id: water.rootEventId, values: { oz: 0 } })).toMatch(/^Nothing to change/);
      const fix = await resolveFix({ kind: "fix_entry", action: "correct", entry_id: meal.rootEventId, values: { calories: 600, protein_g: 46 } }) as FixProposal;
      expect(describeFix(fix)).toBe("Correct Butter Chicken and Rice · 560 → 600 kcal");
      expect(describeFix(await resolveFix({ kind: "fix_entry", action: "remove", entry_id: water.rootEventId }) as FixProposal)).toBe("Remove Water (16 oz · 19:15)");
    } finally { vi.useRealTimers(); }
  });

  it("refuses to save a card when the entry changed or was removed since the card was made", async () => {
    try {
      const { day, meal } = await seed();
      const card = await resolveFix({ kind: "fix_entry", action: "correct", entry_id: meal.rootEventId, values: { calories: 600 } }) as FixProposal;
      await correctLogEntry(meal, { calories: 700 });
      await expect(confirmFix(card)).rejects.toThrow(/CHANGED_SINCE_CARD/);
      expect((await getDayLogEntry(day.id, meal.rootEventId))!.calories).toBe(700);
      const remove = await resolveFix({ kind: "fix_entry", action: "remove", entry_id: meal.rootEventId }) as FixProposal;
      await confirmFix(remove);
      await expect(confirmFix(remove)).rejects.toThrow(/LOG_NOT_FOUND/);
      expect(await describeRecentEntries()).not.toContain("Butter Chicken");
    } finally { vi.useRealTimers(); }
  });
});

describe("the free helper's fixes", () => {
  it("understands Gavin's phrasings, keeping 'Butter Chicken and Rice' whole", async () => {
    try {
      const { meal } = await seed();
      const ctx: HelperContext = await readHelperContext(at(19, 26));
      const card = (text: string) => { const r = interpret(text, ctx); return r.cards.length === 1 ? describeFix(r.cards[0] as FixProposal) : `none: ${JSON.stringify(r)}`; };
      expect(card("Move the butter chicken and rice to 23:00")).toBe("Move Butter Chicken and Rice · 19:15 → 23:00");
      expect(card("change the butter chicken to 2300 hours")).toBe("Move Butter Chicken and Rice · 19:15 → 23:00");
      expect(card("move butter chicken to 11pm")).toBe("Move Butter Chicken and Rice · 19:15 → 23:00");
      expect(card("butter chicken was at 11:30 pm")).toBe("Move Butter Chicken and Rice · 19:15 → 23:30");
      expect(card("the butter chicken was 600 kcal")).toBe("Correct Butter Chicken and Rice · 560 → 600 kcal");
      expect(card("remove the butter chicken")).toBe("Remove Butter Chicken and Rice (560 kcal · 46 g protein · 19:15)");
      expect(card("delete the water")).toBe("Remove Water (16 oz · 19:15)");
      // Not an entry: still a task, a log or nothing, exactly as before.
      const other = interpret("16 oz water", ctx).cards[0]!;
      expect(other.kind).toBe("log_water");
      expect(interpret("move the dentist to 23:00", ctx).cards.every((c) => c.kind !== "fix_entry")).toBe(true);
      // An impossible time is refused rather than guessed.
      expect(interpret("move the butter chicken to 25:00", ctx).cards).toEqual([]);
      // A bare hour could be morning or evening: asked, not guessed (review of #541).
      expect(interpret("move the butter chicken to 7", ctx).cards).toEqual([]);
      expect(card("move the butter chicken to 7:30 pm")).toBe("Move Butter Chicken and Rice · 19:15 → 19:30");
      void snapshotOf(meal);
    } finally { vi.useRealTimers(); }
  });

  it("review of #541: words longer than an entry's name, or naming an open task, are never a fix", async () => {
    try {
      vi.setSystemTime(at(17));
      const day = await startDay();
      vi.setSystemTime(at(18, 30));
      await logManualMeal(day.id, { name: "Dinner", calories: 700, proteinG: 40, carbsG: 70, fatG: 20 });
      const { createObligation } = await import("../src/application/intentCommands");
      await createObligation({ title: "Dinner reservation" });
      vi.setSystemTime(at(19));
      const ctx = await readHelperContext(at(19));
      for (const text of ["delete the dinner reservation", "move the dinner reservation to 20:00", "remove the dinner reservation"]) {
        expect(interpret(text, ctx).cards.some((c) => c.kind === "fix_entry"), text).toBe(false);
      }
      // Without the task, longer words still don't fix the shorter-named meal.
      const noTask = { ...ctx, openTasks: [] };
      expect(interpret("delete the dinner plans", noTask).cards.some((c) => c.kind === "fix_entry")).toBe(false);
      // The meal itself is still fixable by its own name.
      expect(describeFix(interpret("move dinner to 20:00", noTask).cards[0] as FixProposal)).toBe("Move Dinner · 18:30 → 20:00");
    } finally { vi.useRealTimers(); }
  });
});
