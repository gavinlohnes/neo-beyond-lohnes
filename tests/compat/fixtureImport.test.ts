import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BeyondDB } from "../../src/persistence/db";
import { importLegacyBackup, parseLegacyBackup } from "../../src/persistence/compat/legacyBackup";
import { getEffectiveHydrationTotal, getHydrationEntries } from "../../src/application/queries";

const PROTECTED_DIR = join(__dirname, "../../test-fixtures/protected");

const FIXTURE_A = {
  file: "beyond-backup-2026-08-17T23-15-09-360Z.json",
  sha256: "8818f6e7e8c6a23d2c89b148c7975176f9f2314af3e4178c1a66ec34a496a8db",
};
const FIXTURE_B = {
  file: "beyond-backup-2026-08-18T06-33-36-443Z.json",
  sha256: "a5bb46f1b1da5070f55f1c255812235ba33e643a41f9af176dfccbb0e9481c15",
};

function readFixture(name: string): unknown {
  const raw = readFileSync(join(PROTECTED_DIR, name), "utf8");
  return JSON.parse(raw);
}

function assertFixtureUntouched(fixture: { file: string; sha256: string }) {
  const bytes = readFileSync(join(PROTECTED_DIR, fixture.file));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(fixture.sha256);
}

let db: BeyondDB;

afterEach(async () => {
  db?.close();
  await BeyondDB.delete("beyond");
});

describe("Fixture A (app 0.1.0, schema 2) import", () => {
  it("reconstructs exact documented record counts", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_A.file));
    db = new BeyondDB();
    await db.open();

    const result = await importLegacyBackup(db, backup);

    expect(result.beyondDays).toBe(1);
    expect(result.events).toBe(69);
    expect(result.recommendations).toBe(15);
    expect(result.outcomes).toBe(5);
    expect(result.workoutSessions).toBe(0);
    expect(result.performedSets).toBe(0);

    expect(await db.beyondDays.count()).toBe(1);
    expect(await db.events.count()).toBe(69);
    expect(await db.recommendations.count()).toBe(15);
    expect(await db.outcomes.count()).toBe(5);
    expect(await db.workoutSessions.count()).toBe(0);
    expect(await db.performedSets.count()).toBe(0);

    assertFixtureUntouched(FIXTURE_A);
  });

  it("has no hydration facts (this snapshot predates the first WATER_LOGGED event)", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_A.file));
    db = new BeyondDB();
    await db.open();
    await importLegacyBackup(db, backup);

    const day = await db.beyondDays.toCollection().first();
    expect(await getHydrationEntries(day!.id)).toEqual([]);
    expect(await getEffectiveHydrationTotal(day!.id)).toBe(0);
  });
});

describe("Fixture B (app 0.2.0, schema 3) import", () => {
  it("reconstructs exact documented record counts", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();

    const result = await importLegacyBackup(db, backup);

    expect(result.beyondDays).toBe(1);
    expect(result.events).toBe(85);
    expect(result.recommendations).toBe(16);
    expect(result.outcomes).toBe(6);
    expect(result.workoutSessions).toBe(1);
    expect(result.performedSets).toBe(0);

    expect(await db.beyondDays.count()).toBe(1);
    expect(await db.events.count()).toBe(85);
    expect(await db.recommendations.count()).toBe(16);
    expect(await db.outcomes.count()).toBe(6);
    expect(await db.workoutSessions.count()).toBe(1);
    expect(await db.performedSets.count()).toBe(0);

    assertFixtureUntouched(FIXTURE_B);
  });

  it("reconstructs the one effective hydration correction to 17oz via the app's own query layer", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();
    await importLegacyBackup(db, backup);

    const day = await db.beyondDays.toCollection().first();
    const entries = await getHydrationEntries(day!.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.originalAmountOz).toBe(13);
    expect(entries[0]!.effectiveAmountOz).toBe(17);
    expect(entries[0]!.correctionCount).toBe(1);
    expect(await getEffectiveHydrationTotal(day!.id)).toBe(17);
  });

  it("reconstructs the single STANDARD template A ABANDONED workout session", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();
    await importLegacyBackup(db, backup);

    const sessions = await db.workoutSessions.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      templateId: "A",
      sessionType: "STANDARD",
      status: "ABANDONED",
    });
  });

  it("reconstructs the documented recommendation kind distribution (14 RECOVER, 2 NO_ACTION_REQUIRED)", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();
    await importLegacyBackup(db, backup);

    const recs = await db.recommendations.toArray();
    const counts = recs.reduce<Record<string, number>>((acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ RECOVER: 14, NO_ACTION_REQUIRED: 2 });
  });

  it("reconstructs checkIns from STATE_CHECKED_IN events (16, matching the documented event count)", async () => {
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();
    const result = await importLegacyBackup(db, backup);

    expect(result.checkIns).toBe(16);
    expect(await db.checkIns.count()).toBe(16);
  });

  it("is independently importable without Fixture A having been imported first", async () => {
    // Each fixture is a complete, self-contained snapshot of the same
    // continuing BeyondDay — Fixture B must reconstruct correctly on its
    // own, not merely as a delta on top of Fixture A.
    const backup = parseLegacyBackup(readFixture(FIXTURE_B.file));
    db = new BeyondDB();
    await db.open();
    await importLegacyBackup(db, backup);
    expect(await db.events.count()).toBe(85);
  });
});
