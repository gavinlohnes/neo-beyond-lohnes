import { expect, it, vi } from "vitest";
import { getCoachCards } from "../../src/application/coachCards";
import { getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { getExperiments } from "../../src/application/tryExperiment";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { getDeltaKnowledge } from "../../src/application/delta";
import { respondToLearning } from "../../src/application/learningCommands";
import { db } from "../../src/persistence/db";
vi.mock("../../src/application/trainingProgrammeQueries", () => ({ getProgrammeView: vi.fn() }));
vi.mock("../../src/application/trainQueries", async (original) => ({ ...await original<typeof import("../../src/application/trainQueries")>(), getProgressionSuggestion: vi.fn() }));
vi.mock("../../src/application/tryExperiment", () => ({ getExperiments: vi.fn(), activeExperiments: () => [] }));
vi.mock("../../src/application/weeklyQueries", () => ({ getWeeklySummary: vi.fn() }));
vi.mock("../../src/application/delta", () => ({ getDeltaKnowledge: vi.fn() }));
it("composes approved order without writing and keys dismissals by the evidence", async () => {
  vi.mocked(getProgrammeView).mockResolvedValue({ planned: { templateId: "A" } } as Awaited<ReturnType<typeof getProgrammeView>>);
  vi.mocked(getProgressionSuggestion).mockResolvedValue({ recommendation: "DELOAD", reason: "4 sessions at 100lb", lastWeight: 100, suggestedNextWeight: 90 });
  vi.mocked(getExperiments).mockResolvedValue([{ what: "Earlier coffee", days: 14, from: new Date(2025, 11, 18), to: new Date(2026, 0, 1), entry: { id: "test", status: "OPEN", title: "Try: Earlier coffee" } }] as Awaited<ReturnType<typeof getExperiments>>);
  vi.mocked(getWeeklySummary).mockResolvedValue({ calorieProposal: { kind: "PROPOSAL", kcal: 2100, maintenance: { lowKcal: 2200, highKcal: 2400 }, goalWeightLbs: 180 } } as Awaited<ReturnType<typeof getWeeklySummary>>);
  vi.mocked(getDeltaKnowledge).mockResolvedValue({ learnings: [], suggestion: { tag: "late", what: "Try earlier", days: 14, minutesLess: 40, withDays: 4, withoutDays: 5, taggedDays: 4 } } as unknown as Awaited<ReturnType<typeof getDeltaKnowledge>>);
  const before = await db.events.count();
  const cards = await getCoachCards(new Date(2026, 10, 15));
  const groups = cards.map((c) => c.destination);
  expect(groups.indexOf("TRAIN")).toBe(0);
  expect(groups.indexOf("JOURNAL")).toBeGreaterThan(groups.lastIndexOf("TRAIN"));
  expect(groups.indexOf("WEEKLY")).toBeGreaterThan(groups.indexOf("JOURNAL"));
  expect(groups.indexOf("DELTA")).toBeGreaterThan(groups.indexOf("WEEKLY"));
  expect((await getCoachCards(new Date(2026, 10, 15), "RESET")).some((c) => c.destination === "TRAIN")).toBe(false);
  expect(await db.events.count()).toBe(before);
  // Node deliberately has no browser dismissal store; query itself never needs one.
  expect(cards[0]!.key).toBe((await getCoachCards(new Date(2026, 10, 15)))[0]!.key);
});

// GRAYSON C6.1: a tag he dropped (or said isn't true) is never offered as an experiment again.
it("never offers a test on a tag he dropped", async () => {
  vi.mocked(getDeltaKnowledge).mockResolvedValue({ learnings: [], suggestion: { tag: "late", what: "Try earlier", days: 14, minutesLess: 40, withDays: 4, withoutDays: 5, taggedDays: 4 } } as unknown as Awaited<ReturnType<typeof getDeltaKnowledge>>);
  vi.mocked(getExperiments).mockResolvedValue([]);
  vi.mocked(getWeeklySummary).mockResolvedValue({ calorieProposal: { kind: "NONE" } } as unknown as Awaited<ReturnType<typeof getWeeklySummary>>);
  vi.mocked(getProgrammeView).mockResolvedValue({ planned: { templateId: null } } as unknown as Awaited<ReturnType<typeof getProgrammeView>>);
  expect((await getCoachCards(new Date(2026, 10, 15))).some((c) => c.destination === "DELTA")).toBe(true);
  await respondToLearning({ learningId: "tag-late", action: "DROP", statement: "Learned what #late lines up with.", evidence: { kind: "TAG", days: 4 }, expectedHeadId: null });
  expect((await getCoachCards(new Date(2026, 10, 15))).some((c) => c.destination === "DELTA")).toBe(false);
});
