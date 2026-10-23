import { writeFileSync } from "node:fs";
import "dexie-export-import";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, endDay, logSleep, logProtein, logBodyweight, setWorkContext, submitCheckIn } from "../../src/application/commands";
import { startWorkout, logSet, completeWorkout } from "../../src/application/trainCommands";
import { createMission, createObligation, satisfyObligation, releaseObligation } from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { getWholePicture } from "../../src/application/wholePictureQueries";
import { GARMIN_ORIGIN } from "../../src/domain/health/sleepImport";
import type { ActivityHour, RestingHeartRate } from "../../src/domain/health/activityImport";

/** A labelled synthetic acceptance history, built through canonical commands; never a shipped fallback. */
afterEach(() => vi.useRealTimers());
it("connects a complete synthetic multi-domain history and optionally exports it for isolated built-PWA acceptance", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const hours: ActivityHour[] = [], resting: RestingHeartRate[] = [];
  let missionId: string | undefined;
  for (let index = 0; index < 56; index++) {
    const at = new Date(2026, 7, 25 + index, 20); vi.setSystemTime(at);
    const day = await startDay(), work = index % 7 < 3;
    if (!missionId) missionId = (await createMission({ title: "SYNTHETIC · Make health easier" })).id;
    await setWorkContext(day.id, work ? "WORK" : "OFF", "MANUAL");
    if (index % 13 !== 0) await logSleep(day.id, (work ? 390 : 480) - (index >= 28 ? 30 : 0), "PRIMARY");
    if (index % 4 !== 0) await logProtein(day.id, 120 + index % 6 * 8);
    if (index % 3 !== 0) await logBodyweight(day.id, Math.round((185 - index * .06) * 10) / 10);
    await submitCheckIn(day.id, { energy: work ? 2 : 4, stress: work ? 4 : 2, mood: work ? 3 : 4, soreness: 1, alcoholUrge: 0 });
    if (!work && index % 2 === 0) {
      const session = await startWorkout(day.id, "A", "STANDARD");
      await logSet(day.id, session.id, "machine-chest-press", 1, 100, 8 + Math.floor(index / 14));
      vi.setSystemTime(new Date(2026, 7, 25 + index, 20, 30));
      await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    }
    if (index >= 28 && index % 7 === 2) {
      const item = await createObligation({ title: "SYNTHETIC · Prepared food for the next work block", missionId });
      await satisfyObligation(item.id, "Prepared the meals I chose; this does not confirm all intake was logged.");
    }
    if (index === 53) {
      const item = await createObligation({ title: "SYNTHETIC · Released a commitment that no longer fit" });
      await releaseObligation(item.id, "Deliberately set aside, not completed.");
    }
    if (index === 48 || index === 54) {
      const entry = await createDecisionJournalEntry({ title: index === 54 ? "SYNTHETIC · An earlier stop helped me wind down" : "SYNTHETIC · A shorter plan was easier to return to", expectation: "Leaving space might make the first day off easier.", decision: "Choose one essential task and leave the rest open.", context: "After a block of overnight shifts.", reasoning: "I wanted to reduce unnecessary decisions." });
      await reviewDecisionJournalEntry(entry.id, { outcome: "I completed the chosen task. This was one attempt, not proof of a pattern.", lesson: "Leave some space and inspect the next attempt before deciding." });
    }
    for (let hour = 18; hour < 21; hour++) {
      const time = new Date(2026, 7, 25 + index, hour).toISOString();
      hours.push({ startTime: time, endTime: new Date(Date.parse(time) + 3600000).toISOString(), zoneOffsetSeconds: null, steps: (work ? 2400 : 1300) + index % 5 * 100, heartRateMinBpm: 60, heartRateAvgBpm: 78, heartRateMaxBpm: 110 });
    }
    const time = new Date(2026, 7, 25 + index, 19).toISOString();
    resting.push({ id: `synthetic-rest-${index}`, dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: time, time, zoneOffsetSeconds: null, bpm: work ? 63 : 58 });
    await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 20, 20)); await startDay();
  await importActivitySnapshot({ format: "BEYOND_HEALTH_CONNECT_ACTIVITY", schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "synthetic-acceptance" }, source: GARMIN_ORIGIN, exportedAt: new Date().toISOString(), window: { startTime: new Date(2026, 7, 25, 17).toISOString(), endTime: new Date(2026, 9, 20, 0).toISOString() }, hours, restingHeartRate: resting });
  const picture = await getWholePicture(); expect(picture.rows.flatMap((row) => row.dayIds)).toHaveLength(56);
  expect(picture.stories.filter((story) => story.kind === "LESSON")).toHaveLength(2);
  expect(picture.stories.some((story) => story.status === "RELEASED")).toBe(true);
  expect(picture.lifts[0]!.sets.at(-1)!.reps).toBeGreaterThan(picture.lifts[0]!.sets[0]!.reps);
  expect(picture.rows.at(-1)!.measuredHours).toBe(3);
  if (process.env.BEYOND_ACCEPTANCE_BACKUP) writeFileSync(process.env.BEYOND_ACCEPTANCE_BACKUP, await (await db.export({ prettyJson: true })).text());
});
