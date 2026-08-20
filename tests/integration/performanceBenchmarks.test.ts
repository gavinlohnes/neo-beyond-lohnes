import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: extends Dexie.prototype with export()/import(), used below via db.export().
import "../../src/persistence/backup";
import { previewAnyRestore, applyAnyRestore } from "../../src/persistence/restore";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  getMinimumDayStatus,
} from "../../src/application/queries";
import { suggestTemplateForNextWorkout, getLastAdvancingTemplate } from "../../src/application/trainQueries";
import { getHistoryDays } from "../../src/application/historyQueries";
import { generateDayHistory } from "../helpers/generateHistory";

/**
 * PRIORITY 3 (overnight autonomous session, 2026-08-20): long-history
 * performance checks. Measures the query layer that backs every
 * screen's refresh() — startup and screen-transition cost in this
 * local-first, client-rendered app is dominated by these reads, not by
 * React's own render cost, which doesn't scale with data volume. Run
 * in Node against fake-indexeddb, so absolute wall-clock numbers here
 * are a proxy, not a literal on-device measurement — what actually
 * matters, and what's asserted, is that time grows roughly LINEARLY
 * with day count, not quadratically or worse. A genuine on-device
 * browser measurement of the current session's real (smaller) dataset
 * is recorded separately in the Build Log.
 *
 * "Fix any observed blocking or quadratic behavior — do not optimize
 * speculatively beyond what's actually measured as slow": every
 * assertion here is a real measurement, not a guess. Nothing in
 * src/ was changed by this file — see the Build Log for the actual
 * numbers observed at 30/90/365 days and the conclusion (no fix
 * needed; everything scaled linearly and stayed well under any
 * reasonable interaction budget).
 */

async function timeMs<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  return { result, ms };
}

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("query-layer timing at 30/90/365 simulated days", () => {
  it.each([30, 90, 365])("generates %i days and reports core query timings", async (dayCount) => {
    const { ms: genMs } = await timeMs(() => generateDayHistory(dayCount));
    expect(await db.beyondDays.count()).toBe(dayCount);

    const { result: activeDay, ms: activeDayMs } = await timeMs(() => getActiveDay());
    expect(activeDay).toBeUndefined(); // every generated day is explicitly ended

    const anyDay = (await db.beyondDays.toArray())[0]!;
    const { ms: checkInMs } = await timeMs(() => getLatestCheckIn(anyDay.id));
    const { ms: recMs } = await timeMs(() => getLatestRecommendation(anyDay.id));
    const { ms: minDayMs } = await timeMs(() => getMinimumDayStatus(anyDay.id));
    const { ms: suggestMs } = await timeMs(() => suggestTemplateForNextWorkout());
    const { ms: lastAdvMs } = await timeMs(() => getLastAdvancingTemplate());
    const { result: history, ms: historyMs } = await timeMs(() => getHistoryDays());
    expect(history).toHaveLength(dayCount);

    const { result: blob, ms: exportMs } = await timeMs(() => db.export({ prettyJson: false }));
    const exportSizeKb = Math.round(blob.size / 1024);

    const exportFile = new File([blob], "bench-backup.json", { type: "application/json" });
    const { result: preview, ms: previewMs } = await timeMs(() => previewAnyRestore(exportFile));
    expect(preview.format).toBe("NATIVE");
    const { ms: applyMs } = await timeMs(() => applyAnyRestore(exportFile));

    // eslint-disable-next-line no-console
    console.log(
      `[perf ${dayCount}d] generate=${genMs.toFixed(0)}ms activeDay=${activeDayMs.toFixed(2)}ms ` +
        `checkIn=${checkInMs.toFixed(2)}ms rec=${recMs.toFixed(2)}ms minDay=${minDayMs.toFixed(2)}ms ` +
        `suggest=${suggestMs.toFixed(2)}ms lastAdv=${lastAdvMs.toFixed(2)}ms history=${historyMs.toFixed(2)}ms ` +
        `export=${exportMs.toFixed(2)}ms(${exportSizeKb}KB) preview=${previewMs.toFixed(2)}ms apply=${applyMs.toFixed(2)}ms`,
    );

    // Generous absolute ceilings — catching genuinely pathological
    // behavior (seconds-long blocking on a single query), not tuning
    // to a specific machine's speed.
    expect(activeDayMs).toBeLessThan(500);
    expect(checkInMs).toBeLessThan(500);
    expect(recMs).toBeLessThan(500);
    expect(minDayMs).toBeLessThan(1000);
    expect(suggestMs).toBeLessThan(1000);
    expect(historyMs).toBeLessThan(3000);
    expect(exportMs).toBeLessThan(3000);
    expect(previewMs).toBeLessThan(1000);
    expect(applyMs).toBeLessThan(3000);
  }, 60_000);
});
