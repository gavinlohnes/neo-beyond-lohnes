import { expect, it } from "vitest";
import { getCalendarExport } from "../../src/application/calendarExportQueries";
import { createMission, createObligation, archiveMission, satisfyObligation } from "../../src/application/intentCommands";
import { addPersonDate } from "../../src/application/peopleCommands";
import { addHomeItem } from "../../src/application/homeCommands";
import { db } from "../../src/persistence/db";

it("exports eligible dated People/Home commitments, excludes archived/resolved tasks and reads without writes", async () => {
  const now = new Date(2026, 10, 2, 17);
  const mission = await createMission({ title: "Archived project" });
  await createObligation({ title: "Hidden", missionId: mission.id, dueAt: "2026-11-04" });
  await archiveMission(mission.id);
  const done = await createObligation({ title: "Already done", dueAt: "2026-11-04" });
  await satisfyObligation(done.id);
  await addPersonDate({ person: "Synthetic friend", occasion: "Birthday", month: 11, day: 5, note: "PRIVATE" }, now);
  await addHomeItem({ item: "Synthetic filter", details: "PRIVATE", repeat: { every: 1, unit: "MONTHS", firstDue: "2026-11-06" } });
  const tables = [db.events, db.obligations, db.alfredMemories];
  const before = await Promise.all(tables.map((t) => t.toArray()));
  const result = await getCalendarExport({ weeks: 4, includePlans: true }, now);
  expect(result.contents).toContain("Synthetic friend's birthday · Due");
  expect(result.contents).toContain("Home: Synthetic filter · Due");
  expect(result.contents).not.toMatch(/PRIVATE|Hidden|Already done/);
  expect(await Promise.all(tables.map((t) => t.toArray()))).toEqual(before);
  expect((await getCalendarExport({ weeks: 4, includePlans: false }, now)).contents).not.toContain("Synthetic");
});
