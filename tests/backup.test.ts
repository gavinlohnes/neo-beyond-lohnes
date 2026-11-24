import { afterEach, describe, expect, it } from "vitest";
import "dexie-export-import";
import { db } from "../src/persistence/db";
import { exportNativeBackup } from "../src/persistence/backup";
import { applyAnyRestore } from "../src/persistence/restore";
import { startDay } from "../src/application/commands";
import type { AskCount } from "../src/domain/askCounts";

/** GRAYSON-ASKS-COUNT-001: the askCounts table rides in the native backup like every other table. */
const asFile = (text: string) => new File([text], "backup.json", { type: "application/json" });
const count: AskCount = { id: "2026-11-24|TODAY|FIELD|checkin.energy", date: "2026-11-24", area: "TODAY", kind: "FIELD", key: "checkin.energy", count: 1, firstAt: "2026-11-24T23:00:00.000Z" };
afterEach(async () => { await db.askCounts.clear(); });

describe("GRAYSON-ASKS-COUNT-001 backup", () => {
  it("a backup with askCounts round-trips", async () => {
    await startDay();
    await db.askCounts.add(count);
    const text = await (await exportNativeBackup(false)).text();
    expect(JSON.parse(text).data.data.some((t: { tableName: string }) => t.tableName === "askCounts")).toBe(true);
    await db.askCounts.clear();
    await applyAnyRestore(asFile(text));
    expect(await db.askCounts.toArray()).toEqual([count]);
  });

  it("an older backup without the table imports, and the table stays empty", async () => {
    await startDay();
    await db.askCounts.add(count);
    const parsed = JSON.parse(await (await exportNativeBackup(false)).text());
    parsed.data.tables = parsed.data.tables.filter((t: { name: string }) => t.name !== "askCounts");
    parsed.data.data = parsed.data.data.filter((t: { tableName: string }) => t.tableName !== "askCounts");
    await applyAnyRestore(asFile(JSON.stringify(parsed)));
    expect(await db.askCounts.count()).toBe(0);
    expect(await db.beyondDays.count()).toBeGreaterThan(0);
  });
});
