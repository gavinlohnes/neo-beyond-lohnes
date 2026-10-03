import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { completeShiftDown, logSleep, logWater, markWorkEnded, setWorkContext, startDay, startShiftDown } from "../../src/application/commands";
import { getSleepDraftEvidence } from "../../src/application/queries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/** Sleep draft (2026-10-03): the evidence query, and how a drafted log is recorded. */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

async function workNight() {
  vi.setSystemTime(at(12, 16, 30));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(at(13, 6, 10));
  await markWorkEnded(day.id);
  vi.setSystemTime(at(13, 6, 50));
  const started = await startShiftDown(day.id, 15);
  vi.setSystemTime(at(13, 7, 5));
  await completeShiftDown(day.id, started);
  return day;
}

describe("getSleepDraftEvidence", () => {
  it("starts from the latest of MARK WORK ENDED / Shift Down, and the operator's last action before this open", async () => {
    const day = await workNight();
    expect(await getSleepDraftEvidence(day.id, at(13, 14, 20))).toEqual({
      anchorAt: at(13, 7, 5).toISOString(),
      anchorKind: "SHIFT_DOWN",
      lastOperatorActionAt: at(13, 7, 5).toISOString(),
    });
  });

  it("counts an action after Shift Down only when it came before this open", async () => {
    const day = await workNight();
    vi.setSystemTime(at(13, 14, 25));
    await logWater(day.id, 16); // during this visit — after the 14:20 open
    expect((await getSleepDraftEvidence(day.id, at(13, 14, 20))).lastOperatorActionAt).toBe(at(13, 7, 5).toISOString());
    expect((await getSleepDraftEvidence(day.id, at(13, 14, 30))).lastOperatorActionAt).toBe(at(13, 14, 25).toISOString());
  });
});

describe("a drafted sleep log", () => {
  it("records how it was decided, and History says so", async () => {
    const day = await workNight();
    vi.setSystemTime(at(13, 14, 21));
    await logSleep(day.id, 435, "PRIMARY", "CONFIRMED");
    await logSleep(day.id, 30, "SUPPLEMENTAL");
    const logs = (await db.events.where("beyondDayId").equals(day.id).toArray())
      .filter((e) => e.type === "SLEEP_LOGGED")
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(logs.map((e) => e.payload)).toMatchObject([{ durationMinutes: 435, kind: "PRIMARY", draft: "CONFIRMED" }, { durationMinutes: 30 }]);
    expect(logs[1]!.payload).not.toHaveProperty("draft");
    expect(describeEvent(logs[0]!)).toBe("Sleep logged: 7 hr 15 min (main sleep, BEYOND's draft as proposed).");
    expect(describeEvent(logs[1]!)).toBe("Sleep logged: 30 min (nap).");
  });
});
