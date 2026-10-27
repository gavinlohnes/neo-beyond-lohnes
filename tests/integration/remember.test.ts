import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { answerFollowUp, reflectOnDecline } from "../../src/application/reflect";
import { closeExperiment, startExperiment } from "../../src/application/tryExperiment";
import { describeRememberedLesson, experimentLessons, getRecommendationMemory, getRememberedLesson } from "../../src/application/remember";
import { getDecisionJournalEntries } from "../../src/application/journalQueries";

beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const RED = { energy: 1, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 } as const;
const GREEN = { energy: 4, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 } as const;

describe("LOOP step 4 — REMEMBER", () => {
  it("a reviewed reason returns on the next recommendation of the same kind, and only then", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, RED);
    const reason = await reflectOnDecline({ id: first.id, title: "Stabilize", why: "Capacity is low." }, "Wrong for me", "Felt fine");
    const { recommendation: second } = await submitCheckIn(day.id, RED);
    expect(second.kind).toBe(first.kind);
    expect(await getRememberedLesson(second)).toBeUndefined(); // not reviewed yet: nothing concluded
    await answerFollowUp(reason.id, "Should have done it", "Low energy is real even when I feel fine");
    const lesson = await getRememberedLesson(second);
    expect(lesson).toMatchObject({ said: "Wrong for me", outcome: "Should have done it", lesson: "Low energy is real even when I feel fine" });
    expect(describeRememberedLesson(lesson!)).toMatch(/^Last time \(\w{3} \d+\) you said “Wrong for me”\. Looking back: should have done it\. Your lesson: Low energy is real even when I feel fine\.$/);
    expect(await getRememberedLesson(first)).toBeUndefined(); // never about itself
    const { recommendation: other } = await submitCheckIn(day.id, GREEN);
    expect(other.kind).not.toBe(first.kind);
    expect(await getRememberedLesson(other)).toBeUndefined(); // a different kind of advice
  });

  it("LOOP-002: an unanswered reason is asked about on the next recommendation of the same kind", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, RED);
    const reason = await reflectOnDecline({ id: first.id, title: "Stabilize", why: "x" }, "Not today");
    expect(await getRecommendationMemory(first)).toEqual({}); // never about itself
    const { recommendation: second } = await submitCheckIn(day.id, RED);
    expect((await getRecommendationMemory(second)).pending?.id).toBe(reason.id);
    const { recommendation: other } = await submitCheckIn(day.id, GREEN);
    expect(await getRecommendationMemory(other)).toEqual({});
    await answerFollowUp(reason.id, "Glad I didn't");
    const after = await getRecommendationMemory(second);
    expect(after.pending).toBeUndefined();
    expect(after.lesson).toMatchObject({ said: "Not today", outcome: "Glad I didn't" });
  });

  it("closed experiments with a lesson come back when starting another, newest first", async () => {
    const a = await startExperiment({ what: "Nap first", days: 7, scope: "WORK" });
    const b = await startExperiment({ what: "No caffeine late", days: 7, scope: "ALL" });
    await startExperiment({ what: "Still running", days: 7, scope: "ALL" });
    await closeExperiment(a.entry.id, "It helped", "Naps work on night 1");
    await closeExperiment(b.entry.id, "No clear difference"); // no lesson: nothing to remember
    expect(experimentLessons(await getDecisionJournalEntries())).toEqual([{ what: "Nap first", outcome: "It helped", lesson: "Naps work on night 1" }]);
  });
});
