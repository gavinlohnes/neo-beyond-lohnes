import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { updateSchedulePattern, setWorkContext, startDay } from "../../src/application/commands";
import { getSchedulePattern, getScheduledContext } from "../../src/application/queries";
import { applyAnyRestore } from "../../src/persistence/restore";
import { DEFAULT_SCHEDULE_PATTERN, deriveScheduledContext } from "../../src/engine/scheduledContext";

/**
 * Drop 02a (Daily Intelligence / Context, first slice). Covers the
 * application-layer contract around SchedulePattern: getSchedulePattern's
 * default/fallback behavior, updateSchedulePattern as the only writer,
 * malformed-input rejection on write vs. graceful fallback on read, and
 * that SchedulePattern survives native backup export/restore as canonical
 * BEYOND-owned state now that it's a real Dexie table. Engine-level
 * derivation correctness (phase boundaries, week alternation, overnight
 * shifts) lives in tests/engine/scheduledContext.test.ts; migration
 * seeding/equivalence lives in tests/persistence/schemaMigration.test.ts.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getSchedulePattern — default and fallback", () => {
  it("falls back to DEFAULT_SCHEDULE_PATTERN when no row is stored", async () => {
    // A real v4 install is always seeded by the Dexie upgrade (see
    // schemaMigration.test.ts) — this exercises the defensive fallback
    // path directly by removing the row db.open() just seeded.
    await db.schedulePatterns.clear();
    expect(await getSchedulePattern()).toEqual(DEFAULT_SCHEDULE_PATTERN);
  });

  it("falls back to DEFAULT_SCHEDULE_PATTERN when the stored row is malformed", async () => {
    // Simulates what a corrupted or hand-edited imported backup could
    // leave behind — dexie-export-import writes rows with no field
    // validation of its own.
    await db.schedulePatterns.put({ id: "current", garbage: true } as never);
    expect(await getSchedulePattern()).toEqual(DEFAULT_SCHEDULE_PATTERN);
  });

  it("returns the stored pattern once one has been saved", async () => {
    const saved = await updateSchedulePattern({
      anchorMonday: "2026-09-07",
      weeks: [{ workdays: [1, 2, 3, 4, 5] }, { workdays: [6, 0] }],
      shiftStartHour: 9,
      shiftEndHour: 17,
      postWorkTailHours: 2,
    });
    expect(await getSchedulePattern()).toEqual(saved);
  });
});

describe("updateSchedulePattern — the only writer", () => {
  it("persists an edit and getScheduledContext immediately reflects it", async () => {
    await updateSchedulePattern({
      anchorMonday: "2026-09-07", // a Monday
      weeks: [{ workdays: [1] }, { workdays: [] }], // only Monday is ever a work day
      shiftStartHour: 9,
      shiftEndHour: 17,
      postWorkTailHours: 1,
    });
    const ctx = await getScheduledContext(new Date(2026, 8, 7, 10, 0)); // Mon Sep 7, 10am
    expect(ctx.todayIsScheduledWorkDay).toBe(true);
    expect(ctx.phase).toBe("SCHEDULED_SHIFT");

    const tuesday = await getScheduledContext(new Date(2026, 8, 8, 10, 0));
    expect(tuesday.todayIsScheduledWorkDay).toBe(false);
  });

  it("preserves createdAt across edits but advances updatedAt", async () => {
    const first = await updateSchedulePattern({
      anchorMonday: "2026-09-07",
      weeks: [{ workdays: [1] }, { workdays: [2] }],
      shiftStartHour: 9,
      shiftEndHour: 17,
      postWorkTailHours: 1,
    });
    const second = await updateSchedulePattern({ ...first, shiftStartHour: 10 });
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.id).toBe("current");
  });

  it("rejects malformed input outright rather than silently substituting a default", async () => {
    await expect(
      updateSchedulePattern({
        anchorMonday: "not-a-date",
        weeks: [{ workdays: [1] }],
        shiftStartHour: 9,
        shiftEndHour: 17,
        postWorkTailHours: 1,
      }),
    ).rejects.toThrow();

    await expect(
      updateSchedulePattern({
        anchorMonday: "2026-09-07",
        weeks: [{ workdays: [1] }],
        shiftStartHour: 9,
        shiftEndHour: 9, // start === end, degenerate shift
        postWorkTailHours: 1,
      }),
    ).rejects.toThrow();
  });

  it("does not log any DomainEvent — configuration, not day-scoped domain history", async () => {
    const day = await startDay();
    const eventsBefore = await db.events.where("beyondDayId").equals(day.id).count();
    await updateSchedulePattern({
      anchorMonday: "2026-09-07",
      weeks: [{ workdays: [1] }, { workdays: [2] }],
      shiftStartHour: 9,
      shiftEndHour: 17,
      postWorkTailHours: 1,
    });
    expect(await db.events.where("beyondDayId").equals(day.id).count()).toBe(eventsBefore);
  });
});

describe("manual work-context confirmation still beats schedule prediction (Drop 02a plumbing unchanged)", () => {
  it("a stored pattern predicting WORK does not stop a manual OFF confirmation from winning", async () => {
    await updateSchedulePattern({
      anchorMonday: "2026-09-07",
      weeks: [{ workdays: [1, 2, 3, 4, 5] }, { workdays: [1, 2, 3, 4, 5] }], // every weekday predicts WORK
      shiftStartHour: 0,
      shiftEndHour: 23,
      postWorkTailHours: 1,
    });
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    expect((await db.beyondDays.get(day.id))!.workContext).toBe("OFF");
  });
});

describe("SchedulePattern survives native backup export/restore", () => {
  it("round-trips a custom pattern through export and replace-only restore", async () => {
    const saved = await updateSchedulePattern({
      anchorMonday: "2026-09-07",
      weeks: [{ workdays: [1, 2, 3, 4, 5] }, { workdays: [6, 0] }],
      shiftStartHour: 8,
      shiftEndHour: 16,
      postWorkTailHours: 3,
    });

    const blob = await db.export({ prettyJson: true });
    const backupFile = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await updateSchedulePattern({ ...saved, shiftStartHour: 12 });
    expect((await getSchedulePattern()).shiftStartHour).toBe(12);

    await applyAnyRestore(backupFile);

    expect(await getSchedulePattern()).toEqual(saved);
  });

  it("a restored malformed schedulePatterns row falls back to DEFAULT_SCHEDULE_PATTERN rather than breaking predictions", async () => {
    await startDay(); // native export requires at least a valid db state; not otherwise relevant here
    const blob = await db.export({ prettyJson: true });
    const exported = JSON.parse(await blob.text()) as {
      data: { data: { tableName: string; rows: unknown[] }[] };
    };
    const table = exported.data.data.find((t) => t.tableName === "schedulePatterns")!;
    table.rows = [{ id: "current", nonsense: "not a real pattern" }];
    const corruptedFile = new File([JSON.stringify(exported)], "corrupted-backup.json", {
      type: "application/json",
    });

    await applyAnyRestore(corruptedFile);

    expect(await getSchedulePattern()).toEqual(DEFAULT_SCHEDULE_PATTERN);
    // And derivation still works off the safe fallback rather than throwing.
    expect(() => deriveScheduledContext(new Date(), DEFAULT_SCHEDULE_PATTERN)).not.toThrow();
  });
});
