import { expect, it } from "vitest";
import { diffLook, firstKnown, mergeLook, sinceLabel, type LookSnapshot } from "../src/application/sinceLastLook";

/** OPERATOR-EXPERIENCE-001 slice 3: what changed since the last look, never from fields not known yet. */
const look = (o: Partial<LookSnapshot> = {}): LookSnapshot => ({
  at: "2026-11-18T14:00:00.000Z", state: "FLIP", next: "Next shift: Wed, Nov 18 · 18:00 · forecast", confirmed: 0,
  advice: { id: "r1", title: "Sleep before the shift" }, garmin: { end: "2026-11-18T13:00:00.000Z", minutes: 430 }, ...o,
});

it("nothing changed, or no earlier look: nothing to say", () => {
  expect(diffLook(look(), look())).toEqual([]);
  expect(diffLook(null, look())).toEqual([]);
});

it("names new advice, a state change, a schedule change and a Garmin sync, most decision-relevant first", () => {
  const cur = look({ state: "WORK RUN", confirmed: 1, next: "Next day off: Fri, Nov 20 · forecast", advice: { id: "r2", title: "Eat before the shift" }, garmin: { end: "2026-11-19T13:00:00.000Z", minutes: 395 } });
  expect(diffLook(look(), cur)).toEqual(["New advice: Eat before the shift", "FLIP → WORK RUN", "Confirmed changes: 0 → 1", "Garmin sleep synced: 6h 35m"]);
  // A changed NEXT is named when the schedule count didn't change.
  expect(diffLook(look(), look({ next: "Next day off: Fri, Nov 20 · forecast" }))).toEqual(["Next day off: Fri, Nov 20 · forecast"]);
  // Advice going away, or Garmin having nothing, isn't news.
  expect(diffLook(look(), look({ advice: "none", garmin: "none" }))).toEqual([]);
  expect(diffLook(look({ advice: "none", garmin: "none" }), look())).toEqual(["New advice: Sleep before the shift", "Garmin sleep synced: 7h 10m"]);
});

it("unknown fields are never changes, and a slow read never erases what was known", () => {
  expect(diffLook(look({ state: null, garmin: null }), look({ state: "FREE" }))).toEqual([]);
  expect(diffLook(look(), look({ state: null, garmin: null, advice: null, confirmed: null, next: null }))).toEqual([]);
  expect(mergeLook(look(), look({ at: "2026-11-19T00:00:00.000Z", garmin: null })).garmin).toEqual(look().garmin);
  // The visit's baseline keeps the first value it saw, so its own actions aren't reported back.
  const base = firstKnown(look({ garmin: null }), look({ advice: { id: "r9", title: "Mine" }, garmin: { end: "x", minutes: 1 } }));
  expect([base.advice, base.garmin]).toEqual([look().advice, { end: "x", minutes: 1 }]);
});

it("labels the last look by time, with the weekday when it wasn't today", () => {
  const at = new Date(2026, 10, 18, 9, 5).toISOString();
  expect(sinceLabel(at, new Date(2026, 10, 18, 20))).toBe("SINCE 09:05");
  expect(sinceLabel(at, new Date(2026, 10, 19, 20))).toBe("SINCE WED 09:05");
});
