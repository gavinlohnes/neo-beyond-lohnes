import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getPersonalUnderstanding } from "../../src/application/personalUnderstandingQueries";
import { createMission, archiveMission } from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { saveNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { startDay, endDay, setWorkContext, logSleep, correctSleep } from "../../src/application/commands";

afterEach(() => vi.useRealTimers());
const now = new Date(2026, 9, 27, 20);
async function snapshot() { return Promise.all(db.tables.map(async (table) => [table.name, await table.toArray()])); }

it("never manufactures owner preferences from defaults and performs no writes", async () => {
  await db.open();
  const before = await snapshot();
  const view = await getPersonalUnderstanding(now);
  expect(view.targets).toEqual([]);
  expect(view.missions).toEqual([]);
  expect(view.lessons).toEqual([]);
  expect(view.positions).toEqual([]);
  expect(view.baselines.every(({ reading }) => reading.kind === "LEARNING" && reading.have === 0)).toBe(true);
  expect(await snapshot()).toEqual(before);
});

it("connects canonical active priorities, explicit targets and real reviewed lessons without writing relationships", async () => {
  const mission = await createMission({ title: "Prepare frozen work meals" });
  const archived = await createMission({ title: "An old priority" });
  await archiveMission(archived.id);
  const entry = await createDecisionJournalEntry({ title: "Frozen work meals", decision: "Pack a frozen backup", expectation: "Less effort" });
  await reviewDecisionJournalEntry(entry.id, { outcome: "I used it", lesson: "Frozen work meals are a practical backup" });
  await createDecisionJournalEntry({ title: "Unreviewed meal decision", decision: "Try another option" });
  const noLesson = await createDecisionJournalEntry({ title: "Another outcome", decision: "Try it" });
  await reviewDecisionJournalEntry(noLesson.id, { outcome: "Recorded, but no lesson" });
  await saveNutritionTargets({ proteinMultiplierGPerLb: 1, goalWeightLbs: 185, strengthSessionsTargetPerWeek: 3 });
  const before = await snapshot();
  const view = await getPersonalUnderstanding(now);
  expect(view.missions.map((m) => m.id)).toEqual([mission.id]);
  expect(view.missions[0]!.relatedLessons.map((e) => e.id)).toEqual([entry.id]);
  expect(view.lessons.map((e) => e.id)).toEqual([entry.id]);
  expect(view.targets.map((target) => [target.key, target.value])).toEqual([["goalWeightLbs", 185], ["strengthSessionsTargetPerWeek", 3]]);
  expect(view.targets.some((target) => target.label.includes("Protein"))).toBe(false);
  expect(await snapshot()).toEqual(before);
  await saveNutritionTargets({ strengthSessionsTargetPerWeek: null });
  expect((await getPersonalUnderstanding(now)).targets.map((target) => target.key)).toEqual(["goalWeightLbs"]);
});

it("exposes exactly the existing corrected baseline samples in disjoint windows and excludes the unfinished day", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const baselineIds: string[] = [], recentIds: string[] = [];
  for (const dayOfMonth of [...Array.from({ length: 12 }, (_, index) => index + 1), 21, 22, 23]) {
    vi.setSystemTime(new Date(2026, 9, dayOfMonth, 20));
    const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
    const event = await logSleep(day.id, dayOfMonth < 20 ? 360 : 420, "PRIMARY");
    if (dayOfMonth === 1) await correctSleep(day.id, event, 300);
    (dayOfMonth < 20 ? baselineIds : recentIds).push(day.id);
    await endDay(day.id);
  }
  vi.setSystemTime(now);
  const current = await startDay(); await setWorkContext(current.id, "WORK", "MANUAL"); await logSleep(current.id, 900, "PRIMARY");
  const before = await snapshot();
  const view = await getPersonalUnderstanding(now);
  const workSleep = view.baselines.find(({ reading }) => reading.measure === "MAIN_SLEEP" && reading.dayKind === "WORK")!;
  expect(workSleep.reading.kind).toBe("COMPARED");
  expect(workSleep.baseline.flatMap((point) => point.dayIds)).toEqual(baselineIds);
  expect(workSleep.recent.flatMap((point) => point.dayIds)).toEqual(recentIds);
  expect(workSleep.baseline[0]!.value).toBe(300);
  expect(workSleep.baseline.some((point) => point.dayIds.includes(current.id))).toBe(false);
  expect(workSleep.recent.some((point) => point.dayIds.includes(current.id))).toBe(false);
  expect(view.baselineWindow.to).toEqual(view.periodWindow.from);
  expect(await snapshot()).toEqual(before);
});
