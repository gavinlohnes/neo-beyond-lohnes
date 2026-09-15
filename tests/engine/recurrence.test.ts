import { describe, expect, it } from "vitest";
import {
  buildRecurrenceRule,
  deriveNextOccurrenceDate,
  describeRecurrence,
  parseRecurrencePreset,
} from "../../src/engine/recurrence";

/**
 * INTENT-002: pure wrapper around rrule.js. Every case here was checked
 * against the actual installed rrule version's real behavior first
 * (empirically, before this module was written) — per this repo's own
 * CAPABILITY_MAP.md caveat that rrule.js's behavior should never be
 * trusted unquestioned. 2026-09-14 is a real Monday, used as a stable
 * anchor throughout.
 */

describe("buildRecurrenceRule", () => {
  it("produces a DTSTART + RRULE two-line string for DAILY", () => {
    const rrule = buildRecurrenceRule({ freq: "DAILY", interval: 2, anchor: "2026-09-14" });
    expect(rrule).toContain("DTSTART:20260914T000000Z");
    expect(rrule).toContain("RRULE:FREQ=DAILY;INTERVAL=2");
  });

  it("includes BYDAY for WEEKLY with specific weekdays", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"], anchor: "2026-09-14" });
    expect(rrule).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
  });

  it("omits BYDAY for WEEKLY with no weekdays selected", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 2, anchor: "2026-09-14" });
    expect(rrule).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2");
    expect(rrule).not.toContain("BYDAY");
  });

  it("ignores byDay for MONTHLY (not offered by this repo's picker for that frequency)", () => {
    const rrule = buildRecurrenceRule({ freq: "MONTHLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    expect(rrule).not.toContain("BYDAY");
  });
});

describe("deriveNextOccurrenceDate", () => {
  it("WEEKLY on MO/WE/FR: the day after the anchor Monday is that same week's Wednesday", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE", "FR"], anchor: "2026-09-14" });
    expect(deriveNextOccurrenceDate(rrule, "2026-09-14")).toBe("2026-09-16");
  });

  it("WEEKLY on MO only: the next occurrence after the anchor Monday is the following Monday, not the same day", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    expect(deriveNextOccurrenceDate(rrule, "2026-09-14")).toBe("2026-09-21");
  });

  it("DAILY every 2 days: the next occurrence after the anchor is exactly 2 days later", () => {
    const rrule = buildRecurrenceRule({ freq: "DAILY", interval: 2, anchor: "2026-09-14" });
    expect(deriveNextOccurrenceDate(rrule, "2026-09-14")).toBe("2026-09-16");
  });

  it("MONTHLY every month: the next occurrence after the anchor is the same day next month", () => {
    const rrule = buildRecurrenceRule({ freq: "MONTHLY", interval: 1, anchor: "2026-09-14" });
    expect(deriveNextOccurrenceDate(rrule, "2026-09-14")).toBe("2026-10-14");
  });

  it("is anchored to dtstart, not to whenever it happens to be evaluated — querying far past the anchor still returns a real future occurrence, not something drifted off the actual schedule", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    // Querying "after" a date years in the future from the anchor must
    // still land exactly on a real Monday of the WEEKLY/MO schedule —
    // proving occurrences are computed from dtstart, never from "now".
    const next = deriveNextOccurrenceDate(rrule, "2030-01-01");
    expect(next).not.toBeNull();
    expect(new Date(`${next}T00:00:00Z`).getUTCDay()).toBe(1); // Monday
  });

  it("returns null for a query date the rule has already passed only in the sense of no matching future occurrence existing (sanity: a real schedule always has a next occurrence, this proves the null path is reachable via an artificial UNTIL)", () => {
    // rrule.js supports UNTIL directly in the RRULE string; construct one
    // by hand here (not via buildRecurrenceRule, which doesn't expose
    // UNTIL) purely to exercise deriveNextOccurrenceDate's null branch.
    const bounded = "DTSTART:20260914T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260921T000000Z";
    expect(deriveNextOccurrenceDate(bounded, "2026-09-21")).toBeNull();
  });
});

describe("parseRecurrencePreset — round-trips buildRecurrenceRule's own output", () => {
  it("DAILY", () => {
    const rrule = buildRecurrenceRule({ freq: "DAILY", interval: 3, anchor: "2026-09-14" });
    expect(parseRecurrencePreset(rrule)).toEqual({ freq: "DAILY", interval: 3, anchor: "2026-09-14" });
  });

  it("WEEKLY with byDay", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 2, byDay: ["TU", "TH"], anchor: "2026-09-14" });
    expect(parseRecurrencePreset(rrule)).toEqual({ freq: "WEEKLY", interval: 2, byDay: ["TU", "TH"], anchor: "2026-09-14" });
  });

  it("MONTHLY", () => {
    const rrule = buildRecurrenceRule({ freq: "MONTHLY", interval: 1, anchor: "2026-09-14" });
    expect(parseRecurrencePreset(rrule)).toEqual({ freq: "MONTHLY", interval: 1, anchor: "2026-09-14" });
  });

  it("returns null for a frequency this repo's picker doesn't offer", () => {
    const yearly = "DTSTART:20260914T000000Z\nRRULE:FREQ=YEARLY;INTERVAL=1";
    expect(parseRecurrencePreset(yearly)).toBeNull();
  });
});

describe("describeRecurrence", () => {
  it("produces a plain-language summary matching the rule's real semantics", () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE"], anchor: "2026-09-14" });
    expect(describeRecurrence(rrule)).toBe("every week on Monday, Wednesday");
  });
});
