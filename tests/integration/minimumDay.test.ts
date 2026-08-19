import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  enableMinimumDay,
  logProtein,
  logWater,
  markHygieneCompleted,
  markMedsCompleted,
  markMoveCompleted,
  markRecoverConnectCompleted,
  startDay,
} from "../../src/application/commands";
import { completeRecoverySession, startWorkout } from "../../src/application/trainCommands";
import { getMinimumDayStatus } from "../../src/application/queries";

/**
 * MINIMUM DAY (Decision Register, RESET/CAPACITY — locked six-item
 * baseline, reconfirmed 2026-08-19: the earlier phone-session proposal
 * "any check-in + any BODY log" was explicitly REJECTED). Real threshold
 * values: HYDRATE >=40oz, PROTEIN >=25g, MEDS/HYGIENE generic completion,
 * MOVE >=5min, RECOVER/CONNECT >=10min. Existing domain events (a
 * RECOVERY session's actual duration) may satisfy MOVE/RECOVER-CONNECT
 * automatically; manual completion remains available for everything that
 * doesn't have an automatic path.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getMinimumDayStatus — defaults and enabling", () => {
  it("nothing is satisfied and it's not enabled by default", async () => {
    const day = await startDay();
    const status = await getMinimumDayStatus(day.id);
    expect(status).toEqual({
      enabled: false,
      hydrate: false,
      protein: false,
      meds: false,
      hygiene: false,
      move: false,
      recoverConnect: false,
      allSatisfied: false,
    });
  });

  it("enableMinimumDay is an explicit action reflected in status", async () => {
    const day = await startDay();
    await enableMinimumDay(day.id);
    expect((await getMinimumDayStatus(day.id)).enabled).toBe(true);
  });
});

describe("HYDRATE and PROTEIN — auto-derived from existing BODY logs at the real thresholds", () => {
  it("HYDRATE requires the real 40oz threshold, not the rejected simplified rule", async () => {
    const day = await startDay();
    await logWater(day.id, 39);
    expect((await getMinimumDayStatus(day.id)).hydrate).toBe(false);
    await logWater(day.id, 1);
    expect((await getMinimumDayStatus(day.id)).hydrate).toBe(true);
  });

  it("PROTEIN requires the real 25g threshold", async () => {
    const day = await startDay();
    await logProtein(day.id, 24);
    expect((await getMinimumDayStatus(day.id)).protein).toBe(false);
    await logProtein(day.id, 1);
    expect((await getMinimumDayStatus(day.id)).protein).toBe(true);
  });
});

describe("MEDS and HYGIENE — always manual, generic completion only", () => {
  it("are satisfied only by their explicit mark commands", async () => {
    const day = await startDay();
    expect((await getMinimumDayStatus(day.id)).meds).toBe(false);
    await markMedsCompleted(day.id);
    expect((await getMinimumDayStatus(day.id)).meds).toBe(true);

    expect((await getMinimumDayStatus(day.id)).hygiene).toBe(false);
    await markHygieneCompleted(day.id);
    expect((await getMinimumDayStatus(day.id)).hygiene).toBe(true);
  });

  it("stores no detail beyond the bare completion fact", async () => {
    const day = await startDay();
    await markMedsCompleted(day.id);
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const medsEvent = events.find((e) => e.type === "MEDS_COMPLETED")!;
    expect(Object.keys(medsEvent.payload as object)).toEqual(["commandId"]);
  });
});

describe("MOVE and RECOVER/CONNECT — auto-derived from a real RECOVERY session duration", () => {
  it("a 5-9 minute RECOVERY session satisfies MOVE but not RECOVER/CONNECT", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, session.id, 7);

    const status = await getMinimumDayStatus(day.id);
    expect(status.move).toBe(true);
    expect(status.recoverConnect).toBe(false);
  });

  it("a 10+ minute RECOVERY session satisfies both MOVE and RECOVER/CONNECT", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, session.id, 15);

    const status = await getMinimumDayStatus(day.id);
    expect(status.move).toBe(true);
    expect(status.recoverConnect).toBe(true);
  });

  it("an abandoned (0 minute) RECOVERY session satisfies neither", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, session.id, 0);

    const status = await getMinimumDayStatus(day.id);
    expect(status.move).toBe(false);
    expect(status.recoverConnect).toBe(false);
  });

  it("manual completion works as a fallback with no RECOVERY session at all", async () => {
    const day = await startDay();
    await markMoveCompleted(day.id);
    await markRecoverConnectCompleted(day.id);

    const status = await getMinimumDayStatus(day.id);
    expect(status.move).toBe(true);
    expect(status.recoverConnect).toBe(true);
  });
});

describe("allSatisfied", () => {
  it("is true only once every one of the six is satisfied", async () => {
    const day = await startDay();
    await logWater(day.id, 40);
    await logProtein(day.id, 25);
    await markMedsCompleted(day.id);
    await markHygieneCompleted(day.id);
    await markMoveCompleted(day.id);
    expect((await getMinimumDayStatus(day.id)).allSatisfied).toBe(false); // recoverConnect still missing

    await markRecoverConnectCompleted(day.id);
    expect((await getMinimumDayStatus(day.id)).allSatisfied).toBe(true);
  });
});
