import { describe, expect, it } from "vitest";
import { closeNoteText, tomorrowDiffers } from "../src/application/dayClose";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";

/**
 * GRAYSON C1.4 · "Tomorrow differs" and the C1.3 close note. Week A 2026: Fri 13 / Sat 14 / Sun 15 Nov worked;
 * Week B: Wed 18 / Thu 19 worked. The close happens after SHIFT DOWN, around 06:45 the morning after a shift.
 * A saved schedule (updatedAt differs from the seeded default) so the rotation counts.
 */
const pattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-11-01T00:00:00.000Z" };
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const day = (d: number) => at(d, 16, 30).toISOString();

describe("tomorrowDiffers", () => {
  it("after night 2, names tonight as the run's last shift", () => {
    expect(tomorrowDiffers({ now: at(15, 6, 45), dayStartedAt: day(14), today: "WORK", pattern })).toBe("Next: tonight's shift is the last of the run.");
  });
  it("after night 1 of 3 it abstains: tomorrow is more of the same", () => {
    expect(tomorrowDiffers({ now: at(14, 6, 45), dayStartedAt: day(13), today: "WORK", pattern })).toBeNull();
  });
  it("after the run's last night, says the run is done and when he's back", () => {
    expect(tomorrowDiffers({ now: at(16, 6, 45), dayStartedAt: day(15), today: "WORK", pattern })).toBe("Next: the run is done. 2 days off, back on Wednesday.");
  });
  it("on the last day off, says he's back on shift and which night of the run", () => {
    expect(tomorrowDiffers({ now: at(17, 22, 0), dayStartedAt: day(17), today: "OFF", pattern })).toBe("Next: back on shift Wednesday at 18:00, night 1 of 2.");
    expect(tomorrowDiffers({ now: at(18, 9, 0), dayStartedAt: day(17), today: "OFF", pattern })).toBe("Next: back on shift tonight at 18:00, night 1 of 2.");
  });
  it("between two days off it abstains, and with no saved schedule it says nothing", () => {
    expect(tomorrowDiffers({ now: at(16, 22, 0), dayStartedAt: day(16), today: "OFF", pattern })).toBeNull();
    expect(tomorrowDiffers({ now: at(15, 6, 45), dayStartedAt: day(14), today: "WORK", pattern: DEFAULT_SCHEDULE_PATTERN })).toBeNull();
    expect(tomorrowDiffers({ now: at(15, 6, 45), dayStartedAt: day(14), today: "UNKNOWN", pattern })).toBeNull();
  });
  it("anchors to the day's own lived start, not the clock (review of #599)", () => {
    // A day started after midnight still belongs to the evening before; one held open past 16:30 still reads as itself.
    expect(tomorrowDiffers({ now: at(15, 6, 45), dayStartedAt: at(15, 2, 0).toISOString(), today: "WORK", pattern })).toBe("Next: tonight's shift is the last of the run.");
    expect(tomorrowDiffers({ now: at(15, 17, 0), dayStartedAt: day(14), today: "WORK", pattern })).toBe("Next: tonight's shift is the last of the run.");
  });
  it("a confirmed schedule change wins over the rotation", () => {
    const confirmed = new Map([["2026-11-15", "OFF" as const]]);
    expect(tomorrowDiffers({ now: at(15, 6, 45), dayStartedAt: day(14), today: "WORK", pattern, confirmed })).toMatch(/^Next: the run is done\./);
  });
});

describe("closeNoteText", () => {
  it("is a #close block of the answered prompts only, or nothing", () => {
    expect(closeNoteText("Sat, Nov 14", [{ prompt: "What went well?", answer: " Calm night, home safe. " }, { prompt: "Anything Delta should learn?", answer: "" }]))
      .toBe("#close Sat, Nov 14\nQ: What went well?\nA: Calm night, home safe.");
    expect(closeNoteText("Sat, Nov 14", [{ prompt: "What went well?", answer: "  " }])).toBeNull();
  });
});
