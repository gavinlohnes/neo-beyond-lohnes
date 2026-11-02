import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { confirmProposal, undoSavedLog } from "../../src/application/alfred/alfredActions";

/** CARD-UNDO-001: every log card's save can be voided exactly as LOG's UNDO does. Invented data. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("water, sleep, weight and meal saves each come back out of the day's totals", async () => {
  const day = await startDay();
  const results = [
    await confirmProposal({ kind: "log_water", oz: 20 }),
    await confirmProposal({ kind: "log_sleep", minutes: 300 }),
    await confirmProposal({ kind: "log_weight", lbs: 200 }),
    await confirmProposal({ kind: "log_meal", name: "Burger", calories: 650, protein_g: 30 }),
  ];
  for (const r of results) expect(await undoSavedLog(r.undo!)).toBe(true);
  const today = (await getDaySummaries()).find((s) => s.beyondDayId === day.id)!;
  expect(today.waterOz ?? 0).toBe(0);
  expect(today.sleep.primaryMinutes).toBeUndefined();
  expect(today.kcal ?? 0).toBe(0);
});
