import { describe, expect, it } from "vitest";
import type { DomainEvent } from "../src/domain/common/types";
import { activeVoidedIds, activeVoids, voidedRootId } from "../src/domain/logVoids";

/** GRAYSON-FIX-UNDO-001: which log removals still count. Invented data. */
let seq = 0;
function ev(type: DomainEvent["type"], payload: object, id = `e${++seq}`): DomainEvent {
  return { id, type, beyondDayId: "d1", occurredAt: "2026-11-24T10:00:00.000Z", recordedAt: "2026-11-24T10:00:00.000Z", payload, source: "USER", correlationId: id, seq };
}
const water = ev("WATER_LOGGED", { amountOz: 16 }, "w1");
const meal = ev("MEAL_LOGGED", { calories: 600 }, "m1");
const voidWater = ev("WATER_LOG_VOIDED", { loggedEventId: "w1" }, "v1");
const voidMeal = ev("MEAL_LOG_VOIDED", { mealEventId: "m1" }, "v2");
const putBack = (voidEventId: string, voidedType: string, id?: string) => ev("LOG_VOID_UNDONE", { voidEventId, voidedType }, id);

describe("activeVoids", () => {
  it("a removal counts", () => {
    expect(activeVoids([water, voidWater]).map((e) => e.id)).toEqual(["v1"]);
    expect([...activeVoidedIds([water, voidWater], "WATER_LOG_VOIDED")]).toEqual(["w1"]);
  });

  it("a removal put back doesn't", () => {
    expect(activeVoids([water, voidWater, putBack("v1", "WATER_LOG_VOIDED")])).toEqual([]);
    expect(activeVoidedIds([water, voidWater, putBack("v1", "WATER_LOG_VOIDED")], "WATER_LOG_VOIDED").size).toBe(0);
  });

  it("putting back twice changes nothing more", () => {
    const events = [water, voidWater, putBack("v1", "WATER_LOG_VOIDED"), putBack("v1", "WATER_LOG_VOIDED")];
    expect(activeVoids(events)).toEqual([]);
  });

  it("remove, put back, remove again counts once", () => {
    const again = ev("WATER_LOG_VOIDED", { loggedEventId: "w1" }, "v3");
    const events = [water, voidWater, putBack("v1", "WATER_LOG_VOIDED"), again];
    expect(activeVoids(events).map((e) => e.id)).toEqual(["v3"]);
    expect([...activeVoidedIds(events, "WATER_LOG_VOIDED")]).toEqual(["w1"]);
  });

  it("a day with no put-backs reads exactly as before", () => {
    const events = [water, meal, voidWater, voidMeal];
    expect(activeVoids(events)).toEqual([voidWater, voidMeal]);
    expect(voidedRootId(voidMeal)).toBe("m1");
    expect([...activeVoidedIds(events, "MEAL_LOG_VOIDED")]).toEqual(["m1"]);
  });
});
