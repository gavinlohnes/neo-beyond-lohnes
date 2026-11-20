import { describe, expect, it } from "vitest";
import { DELTA_LINES, DEFAULT_VOICE, say, type DeltaLineKey, type DeltaVoice } from "../src/application/deltaVoice";
import { deriveOrientation, deltaLine, type OrientationInput } from "../src/application/orientation";

/**
 * GRAYSON C1.6 (Gavin, 2026-11-20): "Bruce → Terry by default, with Delta and Droid as switchable voices." Words only;
 * hard days drop the act. Sat Nov 14 2026, 15:05, night 2 of 3.
 */
const VOICES: DeltaVoice[] = ["PLAIN", "MENTOR", "DELTA", "DROID"];
const KEYS = Object.keys(DELTA_LINES) as DeltaLineKey[];
const vars = { kind: "WORK" as const, night: " going into night 2 of 3", since: "since the shift", hm: "6:40", n: 3, where: "before the shift" };
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const base = (over: Partial<OrientationInput> = {}): OrientationInput => ({
  now: at(14, 15, 5), day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "WORK" }, contextBySchedule: true, scheduled: "WORK",
  picture: { now: { state: "WORK_RUN", label: "WORK RUN", line: "Shift 2 of 3.", why: [] }, next: null },
  shift: { start: at(14, 18), end: at(15, 6) }, run: { position: 2, length: 3 }, plan: null,
  sleep: { minutes: 400, fromGarmin: true, band: { low: 415, high: 470, kind: "WORK" } }, checkIn: null, recommendation: null,
  draft: { kind: "RECOVER", title: "Protect recovery", reason: "r", nights: [] }, prep: null, obligations: [], ...over,
});

describe("Delta's voice library", () => {
  it("defaults to the mentor voice on screen", () => { expect(DEFAULT_VOICE).toBe("MENTOR"); });

  it("every line has every voice, and the three character voices differ from each other except on hard-day lines", () => {
    for (const key of KEYS) {
      const lines = VOICES.map((voice) => say(voice, key, vars));
      for (const line of lines) expect(line.trim().length, key).toBeGreaterThan(0);
      const hard = key === "MINIMUM" || key === "STABILIZE" || key === "SUSTAINED";
      expect(new Set(lines.slice(1)).size, key).toBe(hard ? 1 : 3);
    }
  });

  it("keeps the doctrine's language: no scores, streaks, cheerleading or exclamations, in any voice", () => {
    for (const key of KEYS) for (const voice of VOICES) {
      expect(say(voice, key, vars), `${key}/${voice}`).not.toMatch(/!|\bscore\b|streak|great job|awesome|crush|you got this|meatbag/i);
    }
  });

  it("says Gavin's approved samples", () => {
    expect(say("MENTOR", "OFF_NONE")).toBe("Nothing's due. The day is yours.");
    expect(say("MENTOR", "EXEC_SHORT")).toBe("You're up for it, but the last two sleeps were short. Session's cut down, not cancelled.");
    expect(say("DELTA", "EXEC_SHORT")).toBe("Your check-in says ready. Your sleep record disagrees. The reduced session is the logical compromise.");
    expect(say("DROID", "EXEC_SHORT")).toBe("Statement: you report readiness. Contradiction: your sleep log. Resolution: the session is reduced, not cancelled.");
  });
});

describe("voices in Orientation", () => {
  it("the same facts read in each voice", () => {
    expect(deriveOrientation(base({ voice: "MENTOR" })).delta).toBe("Two short sleeps going into night 2 of 3. Check in. Until then, we play it careful.");
    expect(deriveOrientation(base({ voice: "DELTA" })).delta).toBe("Two consecutive short sleeps going into night 2 of 3. Until you check in, I'm treating today conservatively.");
    expect(deriveOrientation(base({ voice: "DROID" })).delta).toBe("Observation: two short sleeps going into night 2 of 3. Query: will you check in, or shall I keep assuming caution?");
    // Words only: the recommendation, actions and everything else are identical.
    const plain = deriveOrientation(base()), droid = deriveOrientation(base({ voice: "DROID" }));
    expect({ ...droid, delta: null }).toEqual({ ...plain, delta: null });
  });

  it("hard days drop the act in every voice", () => {
    const stabilize = { kind: "STABILIZE" as const, title: "Stabilize first", rationale: "Capacity is low.", suggestedCommand: null };
    for (const voice of VOICES) {
      expect(deriveOrientation(base({ voice, draft: null, checkIn: { energy: 1, stress: 4, mood: 2 }, recommendation: stabilize, recentMoods: [4, 3, 2] })).delta)
        .toBe("Your check-in says today is heavy. The advice is to protect the basics and nothing more. This has gone on for a few days, so it's worth deliberate attention, not just one bad day.");
      expect(deltaLine({ voice, minimumDay: true, sleep: { state: "NONE" }, checkIn: { state: "NONE" }, recommendation: null, shortNights: 0, run: null }))
        .toBe("Minimum Day is on. Today is about the basics; nothing else is asked of you.");
    }
  });
});
