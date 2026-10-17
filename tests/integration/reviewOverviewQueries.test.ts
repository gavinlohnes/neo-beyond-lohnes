import { readFileSync } from "node:fs";
import { importLegacyBackup, parseLegacyBackup } from "../../src/persistence/compat/legacyBackup";
import { afterEach, expect, it, vi } from "vitest";
import { startDay, endDay, logBodyweight, correctBodyweight, voidBodyweightLog, logProtein } from "../../src/application/commands";
import { getReviewOverview } from "../../src/application/reviewOverviewQueries";
import { db } from "../../src/persistence/db";
afterEach(() => vi.useRealTimers());
it("uses effective canonical weights, excludes voids/current day and writes nothing", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 18, 20));
  const day = await startDay(); const first = await logBodyweight(day.id, 200); await correctBodyweight(day.id, first, 180);
  const second = await logBodyweight(day.id, 300); await voidBodyweightLog(day.id, second);
  await logProtein(day.id, 0); await endDay(day.id);
  vi.setSystemTime(new Date(2026, 9, 20, 20)); const current = await startDay(); await logBodyweight(current.id, 500);
  const before = await db.events.toArray();
  const result = await getReviewOverview();
  expect(result.rows.flatMap((row) => row.weights.map((w) => w.lbs))).toEqual([180]);
  expect(result.protein).toEqual({ days: 1, mean: 0 });
  expect(await db.events.toArray()).toEqual(before);
});

for (const filename of ["beyond-backup-2026-08-17T23-15-09-360Z.json", "beyond-backup-2026-08-18T06-33-36-443Z.json"]) it(`reads protected historical data without writing or changing the fixture: ${filename}`, async () => {
  const path = new URL(`../../test-fixtures/protected/${filename}`, import.meta.url);
  const bytes = readFileSync(path);
  await importLegacyBackup(db, parseLegacyBackup(JSON.parse(bytes.toString("utf8"))));
  const before = await db.events.toArray();
  const result = await getReviewOverview(new Date(2026, 7, 20, 20));
  expect(result.rows).toHaveLength(28);
  expect(result.rows.flatMap((row) => row.weights).every((weight) => Number.isFinite(weight.lbs))).toBe(true);
  expect(await db.events.toArray()).toEqual(before);
  expect(readFileSync(path).equals(bytes)).toBe(true);
});
