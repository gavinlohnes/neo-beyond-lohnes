import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { archiveMission, createMission, createObligation, markObligationWaiting } from "../../src/application/intentCommands";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";

/**
 * Intelligence Spine — I2 (controlled consumption proof, approved
 * 2026-08-22). Proves the application-layer seam (getAdvisoryNotes) wires
 * real Obligation data through I1's unchanged composer correctly, without
 * reimplementing any classification itself. Same real-Dexie/fake-indexeddb
 * pattern as tests/integration/obligationLifecycle.test.ts.
 */

const TODAY = new Date("2026-08-20T12:00:00.000Z");

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getAdvisoryNotes", () => {
  it("no-note state: no unresolved obligations -> empty array", async () => {
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("no-note state: only non-attention-worthy obligations -> empty array", async () => {
    await createObligation({ title: "Someday", dueAt: "2026-09-30" }); // far beyond DUE_SOON window -> QUIET
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("an OVERDUE obligation produces exactly one AdvisoryNote, attributed and traceable", async () => {
    const obligation = await createObligation({ title: "Renew passport", dueAt: "2026-08-01" });
    const notes = await getAdvisoryNotes(TODAY);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.sourceModule).toBe("obligationRelevance");
    expect(notes[0]!.message).toBe("Renew passport — OVERDUE");
    expect(notes[0]!.basis).toEqual(
      expect.arrayContaining([
        { key: "obligationId", value: obligation.id },
        { key: "tier", value: "OVERDUE" },
      ]),
    );
  });

  it("multiple qualifying obligations each produce a note; a WAITING one does not", async () => {
    await createObligation({ title: "Overdue thing", dueAt: "2026-08-10" });
    await createObligation({ title: "Due today thing", dueAt: "2026-08-20" });
    const waiting = await createObligation({ title: "Waiting thing", dueAt: "2026-08-01" });
    await markObligationWaiting(waiting.id);

    const notes = await getAdvisoryNotes(TODAY);
    expect(notes.map((n) => n.message).sort()).toEqual(["Due today thing — DUE_TODAY", "Overdue thing — OVERDUE"].sort());
  });

  /**
   * Intent Lifecycle Integrity — owner-approved correction (2026-08-23,
   * see docs/UX_DECISIONS.md). This is the exact FIELD-reported defect:
   * an OVERDUE obligation whose parent Mission has been archived must not
   * produce an AdvisoryNote, even though it is still status OPEN.
   */
  it("an OVERDUE obligation linked to an ARCHIVED Mission produces no AdvisoryNote", async () => {
    const mission = await createMission({ title: "Old direction" });
    await createObligation({ title: "Do it", missionId: mission.id, dueAt: "2026-08-01" });
    await archiveMission(mission.id);

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("an OVERDUE obligation linked to a still-ACTIVE Mission is unaffected", async () => {
    const mission = await createMission({ title: "Live direction" });
    await createObligation({ title: "Do it", missionId: mission.id, dueAt: "2026-08-01" });

    const notes = await getAdvisoryNotes(TODAY);
    expect(notes.map((n) => n.message)).toEqual(["Do it — OVERDUE"]);
  });
});

/**
 * Intelligence Spine — I3 (second-producer generalization proof, approved
 * 2026-08-23). Real command/query layer, same pattern as
 * tests/integration/trainProgression.test.ts — proves the TRAIN producer
 * reaches getAdvisoryNotes end to end, that it coexists with the
 * Obligation producer without either domain leaking into the other, and
 * that an in-progress (ACTIVE) session's evidence is correctly excluded
 * by reusing getProgressionSuggestion's own current-state rule rather
 * than a special case in advisory.ts.
 */
describe("getAdvisoryNotes — second producer (TRAIN progression)", () => {
  it("no-note state: no workout history anywhere -> empty array (both producers agree)", async () => {
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("a completed session with all sets at the top of range produces an INCREASE note", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 3, 135, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const notes = await getAdvisoryNotes(TODAY);
    const progressionNotes = notes.filter((n) => n.sourceModule === "progression");
    expect(progressionNotes).toHaveLength(1);
    expect(progressionNotes[0]!.message).toBe("Machine Chest Press — INCREASE");
  });

  it("an in-progress (ACTIVE, never completed) session produces no note — reuses getProgressionSuggestion's own current-state exclusion, not a special case here", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    // Sets that WOULD qualify for REDUCE if this session counted as evidence.
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 3);
    await logSet(day.id, session.id, "machine-chest-press", 2, 100, 3);
    await logSet(day.id, session.id, "machine-chest-press", 3, 100, 3);
    // Deliberately never completeWorkout() — session stays ACTIVE.

    const notes = await getAdvisoryNotes(TODAY);
    expect(notes.filter((n) => n.sourceModule === "progression")).toEqual([]);
  });

  it("a HOLD-only history produces no note", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await logSet(day.id, session.id, "machine-chest-press", 2, 100, 10);
    await logSet(day.id, session.id, "machine-chest-press", 3, 100, 10);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("Obligation and TRAIN producers coexist through one call, neither aware of the other, each independently attributed", async () => {
    await createObligation({ title: "Renew passport", dueAt: "2026-08-01" });

    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 3, 135, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const notes = await getAdvisoryNotes(TODAY);
    const bySource = Object.fromEntries(notes.map((n) => [n.sourceModule, n.message]));
    expect(bySource["obligationRelevance"]).toBe("Renew passport — OVERDUE");
    expect(bySource["progression"]).toBe("Machine Chest Press — INCREASE");
    expect(notes).toHaveLength(2);
  });
});

/**
 * JOURNAL-001 (third producer, direct owner sign-off, 2026-09-15). Real
 * command/query layer, same pattern as the TRAIN producer proof above —
 * proves the Decision Journal producer reaches getAdvisoryNotes end to
 * end, matching on real Obligation-title query terms, coexisting with
 * the other two producers without any of the three aware of another.
 */
describe("getAdvisoryNotes — third producer (Decision Journal)", () => {
  it("no-note state: no reviewed journal entries -> empty array", async () => {
    await createObligation({ title: "Renew car registration" });
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("an OPEN (not yet reviewed) journal entry produces no note, even with matching text", async () => {
    await createObligation({ title: "Renew car registration" });
    await createDecisionJournalEntry({ title: "Renew car registration early", decision: "Renew two weeks ahead" });

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("a REVIEWED entry with no lesson produces no note", async () => {
    await createObligation({ title: "Renew car registration" });
    const entry = await createDecisionJournalEntry({
      title: "Renew car registration early",
      decision: "Renew two weeks ahead",
    });
    await reviewDecisionJournalEntry(entry.id, { outcome: "Went fine." });

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("a reviewed entry with a lesson, whose text overlaps a current Obligation title, produces one AdvisoryNote", async () => {
    await createObligation({ title: "Renew car registration" });
    const entry = await createDecisionJournalEntry({
      title: "Renew car registration early",
      decision: "Renewed two weeks ahead of expiry",
    });
    await reviewDecisionJournalEntry(entry.id, {
      outcome: "Went fine.",
      lesson: "Renew registration well before the deadline next time.",
    });

    const notes = await getAdvisoryNotes(TODAY);
    const journalNotes = notes.filter((n) => n.sourceModule === "decisionJournal");
    expect(journalNotes).toHaveLength(1);
    expect(journalNotes[0]!.message).toBe(
      "Renew car registration early — Renew registration well before the deadline next time.",
    );
    expect(journalNotes[0]!.basis).toEqual(
      expect.arrayContaining([{ key: "decisionJournalEntryId", value: entry.id }]),
    );
  });

  it("a reviewed entry whose text does not overlap any current Obligation title produces no note", async () => {
    await createObligation({ title: "Renew car registration" });
    const entry = await createDecisionJournalEntry({ title: "Pick a new gym", decision: "Joined the closer one" });
    await reviewDecisionJournalEntry(entry.id, { outcome: "Happy with it.", lesson: "Proximity matters most." });

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  /**
   * JOURNAL-002 (2026-09-15): widens the query-term pool beyond just
   * Obligation titles to also include active Missions' titles — this is
   * the direct proof that the widening actually surfaces a Lesson that
   * the original, Obligation-title-only pool could not have matched.
   */
  it("a reviewed entry whose text overlaps an active Mission's title (not any Obligation) produces one AdvisoryNote", async () => {
    await createMission({ title: "Get back into climbing" });
    const entry = await createDecisionJournalEntry({
      title: "Which gym to join for climbing",
      decision: "Joined the one with better routes",
    });
    await reviewDecisionJournalEntry(entry.id, {
      outcome: "Great fit.",
      lesson: "Route variety mattered more than price for climbing.",
    });

    const notes = await getAdvisoryNotes(TODAY);
    const journalNotes = notes.filter((n) => n.sourceModule === "decisionJournal");
    expect(journalNotes).toHaveLength(1);
    expect(journalNotes[0]!.message).toBe(
      "Which gym to join for climbing — Route variety mattered more than price for climbing.",
    );
  });

  it("a reviewed entry whose text overlaps only an ARCHIVED Mission's title produces no note — archived is not a current situation", async () => {
    const mission = await createMission({ title: "Learn woodworking" });
    await archiveMission(mission.id);
    const entry = await createDecisionJournalEntry({ title: "Woodworking class signup", decision: "Skipped it" });
    await reviewDecisionJournalEntry(entry.id, { outcome: "No regrets.", lesson: "Woodworking wasn't the right fit." });

    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("all three producers coexist through one call, neither aware of the others, each independently attributed", async () => {
    await createObligation({ title: "Renew passport", dueAt: "2026-08-01" });

    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 3, 135, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const entry = await createDecisionJournalEntry({ title: "Renew passport early", decision: "Renewed early" });
    await reviewDecisionJournalEntry(entry.id, { outcome: "Smooth.", lesson: "Always renew passports early." });

    const notes = await getAdvisoryNotes(TODAY);
    const bySource = Object.fromEntries(notes.map((n) => [n.sourceModule, n.message]));
    expect(bySource["obligationRelevance"]).toBe("Renew passport — OVERDUE");
    expect(bySource["progression"]).toBe("Machine Chest Press — INCREASE");
    expect(bySource["decisionJournal"]).toBe("Renew passport early — Always renew passports early.");
    expect(notes).toHaveLength(3);
  });
});
