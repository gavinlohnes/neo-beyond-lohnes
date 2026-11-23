import { describe, expect, it } from "vitest";
import { deriveOrientation, deltaLine, MAX_ACTIONS, type OrientationInput } from "../src/application/orientation";
import type { PreparationState } from "../src/domain/preparation";

/**
 * GRAYSON C1.1 · Orientation slice 1: the pure composition. Sat Nov 14 2026, 15:05, night 2 of 3, shift 18:00–06:00.
 * Local Date constructors keep these independent of the runner's timezone.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const PREP_OPEN: PreparationState = {
  FOOD: { id: null, value: "UNCONFIRMED", recordedAt: null },
  BOTTLE: { id: null, value: "UNCONFIRMED", recordedAt: null },
};
const base = (over: Partial<OrientationInput> = {}): OrientationInput => ({
  now: at(14, 15, 5),
  day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "WORK" },
  contextBySchedule: true,
  scheduled: "WORK",
  picture: { now: { state: "WORK_RUN", label: "WORK RUN", line: "Shift 2 of 3. Fuel, water and sleep between shifts carry the run.", why: [] }, next: null },
  shift: { start: at(14, 18), end: at(15, 6) },
  run: { position: 2, length: 3 },
  plan: null,
  sleep: { minutes: 400, fromGarmin: true, band: { low: 415, high: 470, kind: "WORK" } },
  checkIn: null,
  recommendation: null,
  draft: null,
  prep: PREP_OPEN,
  obligations: [],
  ...over,
});
const DRAFT = { kind: "RECOVER" as const, title: "Protect recovery", reason: "Your last two main sleeps were below your usual range for those kinds of day.", nights: [{ livedDayStart: "", minutes: 400, kind: "WORK" as const, low: 415, high: 470 }, { livedDayStart: "", minutes: 390, kind: "WORK" as const, low: 415, high: 470 }] };

describe("deriveOrientation · work day", () => {
  it("leads with tonight's shift, your sleep against your own range, and the draft before check-in", () => {
    const o = deriveOrientation(base({ draft: DRAFT }));
    expect(o.mode).toBe("WORK");
    expect(o.date).toBe("SAT, NOV 14");
    expect(o.situation).toEqual({ kind: "SHIFT", time: "18:00", sub: "on shift · in 2 h 55 min", line: "Shift 2 of 3. Fuel, water and sleep between shifts carry the run.", source: "SAVED SCHEDULE" });
    expect(o.sleep).toEqual({ state: "KNOWN", minutes: 400, source: "GARMIN", band: { low: 415, high: 470, kind: "WORK" }, under: true });
    expect(o.checkIn).toEqual({ state: "NONE" });
    expect(o.recommendation).toEqual({ source: "DRAFT", kind: "RECOVER", title: "Protect recovery", rationale: DRAFT.reason, opensTrain: false });
    expect(o.delta).toBe("Two short sleeps going into night 2 of 3. Your check-in sets today's advice; until you answer, the draft below is the cautious read.");
    expect(o.actions).toEqual([{ kind: "PREP", line: "Food and bottle", detail: "Not confirmed for tonight." }]);
    expect(o.runway.map((r) => [r.kind, r.time])).toEqual([["NOW", "15:05"], ["SHIFT", "18:00"]]);
    expect(o.release).toBe("No other recorded item is due before 18:00.");
  });

  it("after check-in the Engine's recommendation replaces the draft; there is never a second one", () => {
    const o = deriveOrientation(base({
      draft: DRAFT, checkIn: { energy: 4, stress: 2, mood: 4 },
      recommendation: { kind: "EXECUTE_PLANNED_WORK", title: "Proceed with planned work — reduced session", rationale: "Capacity is good and there is planned work for today. Your last two main sleeps were below your usual range, so the reduced session is suggested.", suggestedCommand: "START_WORKOUT" },
    }));
    expect(o.recommendation).toMatchObject({ source: "ENGINE", kind: "EXECUTE_PLANNED_WORK", opensTrain: true });
    expect(o.checkIn).toEqual({ state: "DONE", energy: 4, stress: 2, mood: 4 });
    expect(o.delta).toBe("You feel up for it. The last two sleeps were short, so the session is scaled down rather than skipped.");
  });

  it("puts only real times on the runway: nap window, a timed commitment, the shift and the caffeine cut-off, in order", () => {
    const o = deriveOrientation(base({
      plan: {
        shift: { date: "2026-11-14", start: at(14, 18).toISOString(), end: at(15, 6).toISOString(), overnight: true, firstOfRun: false, lastOfRun: false },
        cards: [], windows: [{ kind: "NAP", start: at(14, 14, 30).toISOString(), end: at(14, 17).toISOString(), basis: "RHYTHM" }],
        caffeine: { hours: 8, setBy: "OWNER" }, caffeineAt: at(14, 23, 30).toISOString(), trainWindow: null,
      },
      obligations: [
        { id: "vet", title: "Call the vet", dueAt: "2026-11-14", remindAt: "16:00", status: "OPEN" },
        { id: "late", title: "Renew registration", dueAt: "2026-11-10", status: "OPEN" },
        { id: "later", title: "Dentist", dueAt: "2026-11-20", status: "OPEN" },
      ],
    }));
    expect(o.runway.map((r) => `${r.time} ${r.label} · ${r.detail}`)).toEqual([
      "15:05 Now · ",
      "15:05 Nap window · until 17:00 · from your usual wake time",
      "16:00 Call the vet · due today · your reminder",
      "18:00 On shift · until 06:00 · saved schedule",
      "23:30 Caffeine cutoff · 8 h before you'd sleep · your setting",
    ]);
    // The timed commitment sits on the runway, so it doesn't take an action slot; the overdue one does.
    expect(o.actions).toEqual([
      { kind: "PREP", line: "Food and bottle", detail: "Not confirmed for tonight." },
      { kind: "COMMITMENT", obligationId: "late", line: "Renew registration", detail: "Overdue." },
    ]);
  });

  it(`never shows more than ${MAX_ACTIONS} actions`, () => {
    const o = deriveOrientation(base({ obligations: ["a", "b", "c"].map((id) => ({ id, title: id, dueAt: "2026-11-14", status: "OPEN" as const })) }));
    expect(o.actions).toHaveLength(MAX_ACTIONS);
  });

  it("confirmed preparation leaves the action list", () => {
    const ready: PreparationState = { FOOD: { id: "f", value: "READY", recordedAt: "x" }, BOTTLE: { id: "b", value: "READY", recordedAt: "x" } };
    expect(deriveOrientation(base({ prep: ready })).actions).toEqual([]);
    expect(deriveOrientation(base({ prep: { ...ready, BOTTLE: PREP_OPEN.BOTTLE } })).actions).toEqual([{ kind: "PREP", line: "Bottle", detail: "Not confirmed for tonight." }]);
  });

  it("on shift already: the situation counts to the shift's end and the runway has nothing before it", () => {
    const o = deriveOrientation(base({ now: at(14, 19) }));
    expect(o.situation).toMatchObject({ sub: "on shift · ends 06:00" });
    expect(o.runway.map((r) => r.kind)).toEqual(["NOW"]);
    expect(o.actions).toEqual([]);
  });
});

describe("deriveOrientation · sparse, unknown and failed reads", () => {
  it("unknown work context asks the one question and doesn't read anything into today", () => {
    const o = deriveOrientation(base({ day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "UNKNOWN" }, sleep: null, picture: { now: null, next: null } }));
    expect(o.mode).toBe("UNKNOWN");
    expect(o.stateLabel).toBe("NOT CONFIRMED");
    expect(o.situation).toEqual({ kind: "ASK", predicted: "WORK", line: "Your saved schedule predicts a work day, but today isn't confirmed." });
    expect(o.sleep).toEqual({ state: "NONE" });
    expect(o.delta).toBeNull();
    expect(o.recommendation).toBeNull();
    expect(o.actions).toEqual([]);
    expect(o.release).toBe("Not enough is recorded yet for a recommendation. Nothing here is assumed.");
  });

  it("no main sleep recorded: says so, never 'poor sleep'", () => {
    const o = deriveOrientation(base({ sleep: null }));
    expect(o.sleep).toEqual({ state: "NONE" });
    expect(o.delta).toBe("No main sleep is recorded since the shift, so I can't say how rested you are. Your check-in sets today's advice.");
  });

  it("a read failure is shown as unread, never as empty, and the rest still works", () => {
    const o = deriveOrientation(base({ sleep: "ERROR", prep: "ERROR" }));
    expect(o.sleep).toEqual({ state: "ERROR" });
    expect(o.delta).toBe("I can't see last night's sleep, so I'm not reading anything into today. Your check-in sets today's advice.");
    expect(o.situation).toMatchObject({ kind: "SHIFT", time: "18:00" });
    expect(o.actions).toEqual([]);
    expect(o.release).toBe("Some records couldn't be read (sleep, preparation). Your records are unchanged.");
  });

  it("an unread recommendation is reported, and no draft stands in for it", () => {
    const o = deriveOrientation(base({ recommendation: "ERROR", draft: DRAFT, checkIn: { energy: 3, stress: 3, mood: 3 } }));
    expect(o.guidanceUnread).toBe(true);
    expect(o.recommendation).toMatchObject({ source: "DRAFT" });
    expect(o.unread).toContain("advice");
  });
});

describe("deltaLine", () => {
  const known = { state: "KNOWN" as const, minutes: 450, source: "GARMIN" as const, band: { low: 415, high: 470, kind: "WORK" as const }, under: false };
  it("matches certainty to evidence: no range means no comparison", () => {
    expect(deltaLine({ sleep: { ...known, band: null }, checkIn: { state: "NONE" }, recommendation: null, shortNights: 0, run: null }))
      .toBe("Slept 7:30. BEYOND is still learning your usual, so there's no comparison yet. Your check-in sets today's advice.");
    expect(deltaLine({ sleep: known, checkIn: { state: "NONE" }, recommendation: null, shortNights: 0, run: null }))
      .toBe("Sleep is in your usual range for a work day. Your check-in sets today's advice.");
    expect(deltaLine({ sleep: { ...known, minutes: 400, under: true }, checkIn: { state: "NONE" }, recommendation: null, shortNights: 0, run: null }))
      .toBe("Last night was under your usual for a work day. Your check-in sets today's advice.");
  });

  it("after check-in it restates the Engine's advice and adds none", () => {
    const engine = (kind: "STABILIZE" | "NO_ACTION_REQUIRED") => ({ source: "ENGINE" as const, kind, title: "", rationale: "", opensTrain: false });
    expect(deltaLine({ sleep: known, checkIn: { state: "DONE", energy: 1, stress: 5, mood: 1 }, recommendation: engine("STABILIZE"), shortNights: 0, run: null }))
      .toBe("Your check-in says today is heavy. The advice is to protect the basics and nothing more.");
    expect(deltaLine({ sleep: known, checkIn: { state: "DONE", energy: 4, stress: 2, mood: 4 }, recommendation: engine("NO_ACTION_REQUIRED"), shortNights: 0, run: null }))
      .toBe("Nothing in your records asks for more than the basics before the shift.");
    expect(deltaLine({ sleep: { ...known, minutes: 395, under: true }, checkIn: { state: "DONE", energy: 4, stress: 2, mood: 4 }, recommendation: engine("NO_ACTION_REQUIRED"), shortNights: 0, run: null }))
      .toBe("Nothing in your records asks for more than the basics before the shift. Last night was under your usual for a work day.");
  });
});
