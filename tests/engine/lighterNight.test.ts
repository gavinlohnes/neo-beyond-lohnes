import { describe, expect, it } from "vitest";
import { foldedLine, homeLine, lighterNight, lighterNightWhy, type LighterNightInput } from "../../src/engine/lighterNight";

/** GRAYSON-LIGHTER-NIGHT-001: the pure card. */
const base = (over: Partial<LighterNightInput> = {}): LighterNightInput => ({
  moment: "LAST_SHIFT", run: { position: 3, length: 3 }, beforeShift: true, minimumDay: false,
  switches: { on: true, lift: true, food: true, home: true }, dismissed: false,
  energy: { mean: 2.6, days: 6, basis: "SAME_LENGTH" }, floor: 3,
  lift: { name: "SHORT B", minutes: 25 }, food: true,
  home: { jobs: [{ title: "Home: Filter change", dueTonight: false }], toLabel: "Mon" },
  taken: {}, ...over,
});

describe("lighterNight", () => {
  it("the brief's card: the why and three part lines", () => {
    expect(lighterNight(base())).toEqual({
      kind: "OFFER",
      why: "Last night of 3. On past 3-night runs your energy on this night ran 2.6 of 5 (6 nights).",
      lines: { lift: "Lift: SHORT B (about 25 min)", food: "Food: your work-night usuals first", home: "Home: Filter change moves to Mon, your first day off" },
    });
  });

  it("only on the last shift of a run of two or more, before the shift, never on a Minimum Day", () => {
    expect(lighterNight(base({ moment: "RUN_STARTS" }))).toBeNull();
    expect(lighterNight(base({ moment: null }))).toBeNull();
    expect(lighterNight(base({ run: { position: 1, length: 1 } }))).toBeNull();
    expect(lighterNight(base({ beforeShift: false }))).toBeNull();
    expect(lighterNight(base({ minimumDay: true }))).toBeNull();
    expect(lighterNight(base({ dismissed: true }))).toBeNull();
    expect(lighterNight(base({ run: { position: 2, length: 2 } }))?.kind).toBe("OFFER");
  });

  it("each part hides when it has nothing, or its switch is off; with nothing left, no card", () => {
    expect(lighterNight(base({ lift: null }))).toMatchObject({ lines: { food: expect.any(String), home: expect.any(String) } });
    expect((lighterNight(base({ lift: null })) as { lines: object }).lines).not.toHaveProperty("lift");
    expect((lighterNight(base({ food: false })) as { lines: object }).lines).not.toHaveProperty("food");
    expect((lighterNight(base({ home: { jobs: [], toLabel: "Mon" } })) as { lines: object }).lines).not.toHaveProperty("home");
    expect((lighterNight(base({ switches: { on: true, lift: false, food: true, home: true } })) as { lines: object }).lines).not.toHaveProperty("lift");
    expect(lighterNight(base({ lift: null, food: false, home: null }))).toBeNull();
    expect(lighterNight(base({ switches: { on: false, lift: true, food: true, home: true } }))).toBeNull();
  });

  it("below the floor the why is only the place in the run; it never says he's tired", () => {
    expect(lighterNightWhy({ position: 3, length: 3 }, { mean: undefined, days: 2, basis: "SAME_LENGTH" }, 3)).toBe("Last night of 3.");
    expect(lighterNightWhy({ position: 3, length: 3 }, { mean: 2.6, days: 2, basis: "SAME_LENGTH" }, 3)).toBe("Last night of 3.");
    expect(lighterNightWhy({ position: 3, length: 3 }, null, 3)).toBe("Last night of 3.");
    expect(lighterNightWhy({ position: 4, length: undefined }, null, 3)).toBe("Last night of the run.");
    expect(lighterNightWhy({ position: 3, length: 3 }, { mean: 3.1, days: 4, basis: "ANY_LENGTH" }, 3)).toBe("Last night of 3. On past runs your energy on night 3 ran 3.1 of 5 (4 nights).");
    for (const why of [lighterNight(base())!, lighterNight(base({ energy: null }))!]) {
      expect(JSON.stringify(why)).not.toMatch(/\b(tired|exhausted|should|must|need to)\b/i);
    }
  });

  it("home: due tonight says so; up to three named, then 'and N more'", () => {
    expect(homeLine([{ title: "Filter change", dueTonight: true }], "Mon")).toBe("Home: Filter change (due tonight, still due) moves to Mon, your first day off");
    expect(homeLine([{ title: "A", dueTonight: false }, { title: "B", dueTonight: false }], "Mon")).toBe("Home: A and B move to Mon, your first day off");
    const five = ["A", "B", "C", "D", "E"].map((title) => ({ title, dueTonight: false }));
    expect(homeLine(five, "Mon")).toBe("Home: A, B, C and 2 more move to Mon, your first day off");
  });

  it("taken: one folded line, and each part listed for its own UNDO (even after the shift starts)", () => {
    const taken = { lift: "SHORT B", food: true, home: { titles: ["Home: Filter change"], toLabel: "Mon" } };
    expect(lighterNight(base({ taken, beforeShift: false }))).toEqual({
      kind: "TAKEN", folded: "Lighter night: SHORT B · your usuals · Filter change Mon.",
      parts: { lift: "Lift: SHORT B", food: "Food: your usuals first", home: "Home: Filter change on Mon" },
    });
    expect(foldedLine({ food: true, home: { titles: ["A", "B", "C"], toLabel: "Mon" } })).toBe("Lighter night: your usuals · A +2 Mon.");
    expect(lighterNight(base({ taken: { food: true }, minimumDay: true }))?.kind).toBe("TAKEN");
  });
});
