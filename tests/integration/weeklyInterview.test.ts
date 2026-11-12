import { describe, expect, it } from "vitest";
import { deriveWeeklyInterview, interviewNoteText, saveCarryForward, saveInterviewNote, getTimelineEntries } from "../../src/application/weeklyInterview";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { startDay } from "../../src/application/commands";
import { getCurrentlyEligibleUnresolvedObligations } from "../../src/application/intentQueries";
import { hasObligationRequiringArbitration } from "../../src/engine/obligationRelevance";
import { db } from "../../src/persistence/db";
import type { PictureRow } from "../../src/application/wholePictureProjection";

/** BIG-IDEAS-001 item 5. Invented weeks only. */
const row = (date: string, p: Partial<PictureRow> & { id?: string } = {}) =>
  ({ start: new Date(`${date}T16:30:00`).toISOString(), dayIds: p.id === undefined ? [`d-${date}`] : p.id ? [p.id] : [], context: "WORK", sessions: 0, ...p }) as unknown as PictureRow;
const week = [
  row("2026-10-26", { energy: 3, sleepHours: 6.5 }),
  row("2026-10-27", { energy: 2, sleepHours: 5.1, sessions: 1 }),
  row("2026-10-28", { context: "OFF", energy: 5, sleepHours: 8.4, napMinutes: 30 }),
  row("2026-10-29", { context: "OFF", energy: 5, sleepHours: 8 }),
  row("2026-10-30", { id: "" , context: "UNKNOWN" }),
  row("2026-10-31", { energy: 3, sleepHours: 6 }),
  row("2026-11-01", { energy: 2, sleepHours: 5.5 }),
];

describe("WEEKLY INTERVIEW", () => {
  it("lays out the last 7 lived days as recorded and asks from that week's best day, hardest day and gaps", () => {
    const notes = new Map([["d-2026-10-28", "Hike with [[Sam]] #goodtalk\nsecond line"]]);
    const w = deriveWeeklyInterview([row("2026-10-25"), ...week], notes)!;
    expect([w.from, w.to, w.days.length]).toEqual(["2026-10-26", "2026-11-01", 7]);
    expect(w.days[2]).toMatchObject({ context: "OFF", sleepHours: 8.4, napMinutes: 30, energy: 5, note: "Hike with [[Sam]] #goodtalk", tags: ["goodtalk"] });
    expect(w.days[1]!.workouts).toBe(1);
    expect(w.days[4]).toMatchObject({ dayId: undefined, workouts: 0 });
    expect(w.questions.map((q) => q.id)).toEqual(["BEST", "HARD", "GAP", "CARRY"]);
    // The earliest of two equal bests wins, so the same records always ask the same thing.
    expect(w.questions[0]!.text).toBe("Wed, Oct 28 was your highest-energy day this week. What made it work?");
    expect(w.questions[0]!.why).toBe("Check-in energy 5 of 5, the highest of 6 checked-in days.");
    expect(w.questions[1]!.text).toBe("Tue, Oct 27 had your shortest sleep this week. What got in the way?");
    expect(w.questions[2]).toMatchObject({ text: "Fri, Oct 30 has little on record. What happened that day?", why: "Fri, Oct 30: no day opened." });
  });

  it("falls back to plain questions when the week is thin, and writes only answered questions", () => {
    const w = deriveWeeklyInterview([row("2026-10-26"), row("2026-10-27")], new Map())!;
    expect(w.questions.map((q) => q.text)).toEqual(["What went well this week?", "What was the hardest part of this week?", "2 days have little on record. What happened on them?", "What's one thing to carry into next week?"]);
    expect(interviewNoteText(w, {})).toBeNull();
    expect(interviewNoteText(w, { BEST: "  Slept in ", HARD: " " })).toBe("#timeline Week Mon, Oct 26 – Tue, Oct 27\nQ: What went well this week?\nA: Slept in");
    expect(deriveWeeklyInterview([], new Map())).toBeNull();
  });

  it("SAVE adds the block after the note's existing text; the carry-forward plan item is undated and never reaches arbitration", async () => {
    const day = await startDay();
    await saveDailyNote(day.id, "Morning was slow.");
    await saveInterviewNote(day.id, "#timeline Week Mon, Oct 26 – Sun, Nov 1\nQ: x\nA: y");
    expect((await db.dailyNotes.get(day.id))!.text).toBe("Morning was slow.\n\n#timeline Week Mon, Oct 26 – Sun, Nov 1\nQ: x\nA: y");
    expect((await getTimelineEntries()).map((e) => e.dayId)).toEqual([day.id]);
    const plan = await saveCarryForward("Book the dentist");
    expect(plan).toMatchObject({ title: "Book the dentist", status: "OPEN" });
    expect(plan.dueAt).toBeUndefined();
    expect(plan.plannedAt).toBeUndefined();
    expect(hasObligationRequiringArbitration(await getCurrentlyEligibleUnresolvedObligations(), "2026-11-11")).toBe(false);
  });
});

describe("Review of #479/#480: a draft never drops what was saved under it", () => {
  it("saves when unchanged, keeps an appended interview block, and refuses any other change", async () => {
    const { saveDailyNoteDraft } = await import("../../src/application/dailyNoteCommands");
    const day = await startDay();
    await saveDailyNote(day.id, "Morning.");
    expect(await saveDailyNoteDraft(day.id, "Morning. Long shift.", "Morning.")).toMatchObject({ status: "SAVED" });
    await saveInterviewNote(day.id, "#timeline Week x\nQ: q\nA: a");
    const merged = await saveDailyNoteDraft(day.id, "Morning. Long shift. Tired.", "Morning. Long shift.");
    expect(merged).toMatchObject({ status: "MERGED" });
    expect((await db.dailyNotes.get(day.id))!.text).toBe("Morning. Long shift. Tired.\n\n#timeline Week x\nQ: q\nA: a");
    await saveDailyNote(day.id, "Rewritten elsewhere.");
    expect(await saveDailyNoteDraft(day.id, "My draft", "Morning.")).toEqual({ status: "CONFLICT", stored: "Rewritten elsewhere." });
    expect((await db.dailyNotes.get(day.id))!.text).toBe("Rewritten elsewhere.");
  });
});
