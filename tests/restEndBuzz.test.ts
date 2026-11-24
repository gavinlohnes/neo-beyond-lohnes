import { afterEach, describe, expect, it, vi } from "vitest";
import { REST_BUZZ_PATTERNS, restEndBuzz, shouldBuzzRestEnd } from "../src/ui/feel/restEndBuzz";
import { getRestBuzzPreference, setRestBuzzPreference } from "../src/application/restBuzzQueries";

/** GRAYSON-TRAIN-REST-001: once per rest end, live only, his switch. */
const END = "2026-11-24T10:00:00.000Z";
const at = (ms: number) => Date.parse(END) + ms;
const base = { endsAt: END, lastBuzzedEnd: null, visible: true, enabled: true };

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("GRAYSON-TRAIN-REST-001 rest-end buzz", () => {
  it("fires once per activeRestEndsAt, at or just after zero", () => {
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(-1) })).toBe(false);
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(0) })).toBe(true);
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(900) })).toBe(true);
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(1900), lastBuzzedEnd: END })).toBe(false);
  });

  it("never fires for a skipped rest, and fires once at a new end after +15 s", () => {
    expect(shouldBuzzRestEnd({ ...base, endsAt: null, nowMs: at(0) })).toBe(false);
    const later = new Date(at(15_000)).toISOString();
    expect(shouldBuzzRestEnd({ ...base, endsAt: later, lastBuzzedEnd: END, nowMs: at(15_400) })).toBe(true);
    expect(shouldBuzzRestEnd({ ...base, endsAt: later, lastBuzzedEnd: later, nowMs: at(16_400) })).toBe(false);
  });

  it("doesn't fire late, hidden or switched off", () => {
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(3001) })).toBe(false);
    expect(shouldBuzzRestEnd({ ...base, nowMs: at(60_000) })).toBe(false);
    expect(shouldBuzzRestEnd({ ...base, visible: false, nowMs: at(0) })).toBe(false);
    expect(shouldBuzzRestEnd({ ...base, enabled: false, nowMs: at(0) })).toBe(false);
    expect(shouldBuzzRestEnd({ ...base, endsAt: "not a time", nowMs: at(0) })).toBe(false);
  });

  it("sends Short and Long patterns, and a missing or throwing vibrate is harmless", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    restEndBuzz("SHORT");
    restEndBuzz("LONG");
    expect(vibrate.mock.calls).toEqual([[REST_BUZZ_PATTERNS.SHORT], [REST_BUZZ_PATTERNS.LONG]]);
    expect(REST_BUZZ_PATTERNS).toEqual({ SHORT: [200, 100, 200], LONG: [400, 150, 400] });
    vi.stubGlobal("navigator", {});
    expect(() => restEndBuzz("SHORT")).not.toThrow();
    vi.stubGlobal("navigator", { vibrate: () => { throw new Error("blocked"); } });
    expect(() => restEndBuzz("LONG")).not.toThrow();
  });

  it("buzzes under reduced motion (it doesn't check it)", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    restEndBuzz("SHORT");
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it("reads the preference safely, defaulting to on and short", () => {
    expect(getRestBuzzPreference()).toEqual({ enabled: true, strength: "SHORT" });
    localStorage.setItem("beyond:restBuzzPreference", "{not json");
    expect(getRestBuzzPreference()).toEqual({ enabled: true, strength: "SHORT" });
    localStorage.setItem("beyond:restBuzzPreference", JSON.stringify({ enabled: "yes", strength: "LOUD" }));
    expect(getRestBuzzPreference()).toEqual({ enabled: true, strength: "SHORT" });
    setRestBuzzPreference({ enabled: false, strength: "LONG" });
    expect(getRestBuzzPreference()).toEqual({ enabled: false, strength: "LONG" });
  });
});
