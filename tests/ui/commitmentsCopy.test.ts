import { describe, expect, it } from "vitest";
import { describeCommitmentMission, describeCommitmentsSummary, describeObligationRelevance } from "../../src/ui/screens/today/commitmentsCopy";
import type { Mission } from "../../src/domain/intent/types";
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
  it("leads with the obligation's own title, then its relevance, when nothing else is unresolved", () => {
    expect(describeCommitmentsSummary("DUE_TODAY", obligation(), 0)).toBe("Renew passport · Due today");
  });

  it("appends a plain count when other unresolved obligations exist", () => {
    expect(describeCommitmentsSummary("OVERDUE", obligation({ dueAt: "2026-08-19" }), 2)).toBe(
      "Renew passport · Overdue — was due 2026-08-19 · +2 more unresolved",
    );
  });

  it("uses a different obligation's own title when given one", () => {
    expect(describeCommitmentsSummary("PLANNED_TODAY", obligation({ title: "Call the vet" }), 0)).toBe(
      "Call the vet · Planned for today",
    );
  });
});

describe("describeCommitmentMission", () => {
  const mission: Mission = {
    id: "mission-1",
    title: "Build a durable career",
    status: "ACTIVE",
    source: "USER",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("states the explicit Mission title without implying inference", () => {
    expect(describeCommitmentMission(mission)).toBe("Mission: Build a durable career");
  });

  it("labels archived Mission context truthfully", () => {
    expect(describeCommitmentMission({ ...mission, status: "ARCHIVED" })).toBe(
      "Mission: Build a durable career (archived)",
    );
  });
});
