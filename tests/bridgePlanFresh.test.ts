import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BRIDGE_PLAN_SETTINGS, HORIZON_DAYS, PLAN_SENT_KEY, PLAN_SETTINGS_KEY, helperPlanUrl, markPlanLineTapped,
  phoneAlertsBehindDue, planBehind, planFingerprint, planLivedDay, readBridgePlanSettings, readPlanLineDay, readPlanSent,
  sentStateOf, writeBridgePlanSettings, writePlanSent, type BridgeMoment, type BridgePlan,
} from "../src/application/bridgePlan";
import { readTodayQuietSettings, setQuietLineOn, quietLineOn, effectiveQuietOff } from "../src/ui/screens/today/todayQuietStore";

/** GRAYSON-PLAN-FRESH-001 (C7.2): the plan's fingerprint, the update link, what was sent, and the TODAY line's rule.
 * Runs under TZ=UTC and TZ=America/Chicago. */
const H = 3_600_000;
const t0 = new Date(2026, 10, 24, 12, 0).getTime();
const m = (at: number, kind: BridgeMoment["kind"] = "BEFORE_SHIFT", text = "Eat"): BridgeMoment => ({ at, kind, title: "Shift in 30 minutes", text, go: "" });
const plan = (moments: BridgeMoment[], brief = "Sleep first."): BridgePlan => ({ home: "https://example.test/beyond/", brief, moments });

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("planFingerprint", () => {
  const base = plan([m(t0 + H), m(t0 + 2 * H, "WAKE")]);
  it("changes when a moment, its text or the brief changes", () => {
    const f = planFingerprint(base);
    expect(planFingerprint(plan([m(t0 + H + 60_000), m(t0 + 2 * H, "WAKE")]))).not.toBe(f);
    expect(planFingerprint(plan([m(t0 + H, "BEFORE_SHIFT", "Drink water"), m(t0 + 2 * H, "WAKE")]))).not.toBe(f);
    expect(planFingerprint(plan([m(t0 + H), m(t0 + 2 * H, "SHIFT_DONE")]))).not.toBe(f);
    expect(planFingerprint(plan(base.moments, "Eat first."))).not.toBe(f);
    expect(planFingerprint(plan([m(t0 + H)]))).not.toBe(f);
  });
  it("doesn't change when equal moments come in another order", () => {
    expect(planFingerprint(plan([...base.moments].reverse()))).toBe(planFingerprint(base));
  });
});

describe("helperPlanUrl", () => {
  it("round-trips the plan on the plan host, with the fallback back to BEYOND", () => {
    const p = plan([m(t0 + H), m(t0 + 2 * H, "TASK_DUE", "Call the bank; then \"file\" & #2")]);
    const url = helperPlanUrl(p, "https://example.test/beyond/?bridge=update");
    expect(url.startsWith("intent://plan?plan=")).toBe(true);
    expect(url).toContain("#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;S.browser_fallback_url=");
    expect(url.endsWith(";end")).toBe(true);
    const query = url.slice("intent://plan?".length, url.indexOf("#Intent"));
    expect(JSON.parse(new URLSearchParams(query).get("plan")!)).toEqual(p);
    const fallback = url.slice(url.indexOf("S.browser_fallback_url=") + "S.browser_fallback_url=".length, url.lastIndexOf(";end"));
    expect(decodeURIComponent(fallback)).toBe("https://example.test/beyond/?bridge=update");
  });
  it("has no fallback when none is given", () => {
    expect(helperPlanUrl(plan([]))).not.toContain("browser_fallback_url");
  });
});

describe("sent state", () => {
  it("reads back what was written, and nothing when unset or broken", () => {
    expect(readPlanSent()).toBeNull();
    const p = plan([m(t0 + H)]);
    writePlanSent(p, t0);
    expect(readPlanSent()).toEqual(sentStateOf(p, t0));
    expect(readPlanSent()!.hash).toBe(planFingerprint(p));
    expect(readPlanSent()!.at).toBe(t0);
    localStorage.setItem(PLAN_SENT_KEY, "{nope");
    expect(readPlanSent()).toBeNull();
    localStorage.setItem(PLAN_SENT_KEY, JSON.stringify({ hash: 3 }));
    expect(readPlanSent()).toBeNull();
  });
  it("the phone is behind only when the plan actually changed", () => {
    const p = plan([m(t0 + H), m(t0 + 30 * H, "WAKE")]);
    expect(planBehind(p, null, t0)).toBe(true);
    const sent = sentStateOf(p, t0);
    expect(planBehind(p, sent, t0)).toBe(false);
    // A moment that has passed drops out of a rebuilt plan: not a change.
    expect(planBehind(plan([m(t0 + 30 * H, "WAKE")]), sent, t0 + 2 * H)).toBe(false);
    // A new day coming into the four-week reach: not a change.
    expect(planBehind(plan([m(t0 + H), m(t0 + 30 * H, "WAKE"), m(t0 + (HORIZON_DAYS * 24 + 6) * H)]), sent, t0)).toBe(false);
    // A task added, a kind turned off, a brief changed: behind.
    expect(planBehind(plan([...p.moments, m(t0 + 20 * H, "TASK_DUE")]), sent, t0)).toBe(true);
    expect(planBehind(plan([m(t0 + H)]), sent, t0)).toBe(true);
    expect(planBehind(plan(p.moments, "New brief."), sent, t0)).toBe(true);
  });
});

describe("settings", () => {
  it("both switches default on, round-trip, and survive junk", () => {
    expect(readBridgePlanSettings()).toEqual(DEFAULT_BRIDGE_PLAN_SETTINGS);
    expect(DEFAULT_BRIDGE_PLAN_SETTINGS).toEqual({ updateOnSave: true, showBehind: true });
    writeBridgePlanSettings({ updateOnSave: false, showBehind: true });
    expect(readBridgePlanSettings()).toEqual({ updateOnSave: false, showBehind: true });
    localStorage.setItem(PLAN_SETTINGS_KEY, "junk");
    expect(readBridgePlanSettings()).toEqual(DEFAULT_BRIDGE_PLAN_SETTINGS);
  });
  it("the TODAY line has one switch: KEY MOMENT ALERTS' and MORE → TODAY's are the same", () => {
    const s = readTodayQuietSettings();
    expect(quietLineOn(s, "PHONE_ALERTS_BEHIND")).toBe(true);
    setQuietLineOn(s, "PHONE_ALERTS_BEHIND", false);
    expect(readBridgePlanSettings().showBehind).toBe(false);
    expect(readTodayQuietSettings().off).not.toContain("PHONE_ALERTS_BEHIND");
    expect(effectiveQuietOff(readTodayQuietSettings())).toContain("PHONE_ALERTS_BEHIND");
    writeBridgePlanSettings({ updateOnSave: true, showBehind: true });
    expect(quietLineOn(readTodayQuietSettings(), "PHONE_ALERTS_BEHIND")).toBe(true);
  });
});

describe("the TODAY line is due", () => {
  const at = (h: number, min = 0) => new Date(2026, 10, 24, h, min);
  const due = (over: Partial<Parameters<typeof phoneAlertsBehindDue>[0]> = {}) =>
    phoneAlertsBehindDue({ android: true, on: true, behind: true, onShift: false, lineDay: null, now: at(12), ...over });
  it("on Android, when behind, outside a shift, and on", () => {
    expect(due()).toBe(true);
    expect(due({ android: false })).toBe(false);
    expect(due({ behind: false })).toBe(false);
    expect(due({ onShift: true })).toBe(false);
    expect(due({ on: false })).toBe(false);
  });
  it("at most once a lived day: 06:10 belongs to the night before", () => {
    expect(planLivedDay(at(6, 10))).toBe("2026-11-23");
    expect(planLivedDay(at(17, 0))).toBe("2026-11-24");
    markPlanLineTapped(at(6, 10));
    expect(readPlanLineDay()).toBe("2026-11-23");
    expect(due({ lineDay: readPlanLineDay(), now: at(12) })).toBe(false);
    expect(due({ lineDay: readPlanLineDay(), now: at(16, 29) })).toBe(false);
    expect(due({ lineDay: readPlanLineDay(), now: at(16, 30) })).toBe(true);
  });
});
