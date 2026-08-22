import { describe, expect, it } from "vitest";
import { describeCommitmentsSummary, describeObligationRelevance } from "../../src/ui/screens/today/commitmentsCopy";
import type { Obligation } from "../../src/domain/intent/types";

function obligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: "ob-1",
    title: "Renew passport",
    status: "OPEN",
    source: "USER",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("describeObligationRelevance", () => {
  it("OVERDUE names the missed due date when known", () => {
    expect(describeObligationRelevance("OVERDUE", obligation({ dueAt: "2026-08-19" }))).toBe(
      "Overdue — was due 2026-08-19",
    );
  });

  it("DUE_TODAY never implies overdue phrasing", () => {
    expect(describeObligationRelevance("DUE_TODAY", obligation({ dueAt: "2026-08-20" }))).toBe("Due today");
  });

  it("DUE_SOON names the upcoming due date when known", () => {
    expect(describeObligationRelevance("DUE_SOON", obligation({ dueAt: "2026-08-21" }))).toBe("Due 2026-08-21");
  });

  it("PLANNED_TODAY, WAITING, and QUIET have their own distinct copy", () => {
    expect(describeObligationRelevance("PLANNED_TODAY", obligation())).toBe("Planned for today");
    expect(describeObligationRelevance("WAITING", obligation())).toBe("Waiting");
    expect(describeObligationRelevance("QUIET", obligation())).toBe("No pressing date");
  });
});

describe("describeCommitmentsSummary", () => {
  it("shows only the headline when nothing else is unresolved", () => {
    expect(describeCommitmentsSummary("DUE_TODAY", obligation(), 0)).toBe("Due today");
  });

  it("appends a plain count when other unresolved obligations exist", () => {
    expect(describeCommitmentsSummary("OVERDUE", obligation({ dueAt: "2026-08-19" }), 2)).toBe(
      "Overdue — was due 2026-08-19 · +2 more unresolved",
    );
  });
});
