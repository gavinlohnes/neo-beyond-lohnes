import { describe, expect, it } from "vitest";
import { filterCurrentlyEligibleObligations, isObligationCurrentlyEligible } from "../../src/engine/obligationEligibility";
import type { Mission, Obligation } from "../../src/domain/intent/types";

/**
 * Intent Lifecycle Integrity — owner-approved correction (2026-08-23, see
 * docs/UX_DECISIONS.md). Pure unit tests for the deterministic
 * current-attention-eligibility projection — no Dexie, no fake-indexeddb,
 * matching every other engine/* test file's zero-I/O contract.
 */

let idCounter = 0;
function obligation(overrides: Partial<Obligation> = {}): Obligation {
  idCounter += 1;
  return {
    id: `ob-${idCounter}`,
    title: `Obligation ${idCounter}`,
    status: "OPEN",
    source: "USER",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function mission(overrides: Partial<Mission> = {}): Mission {
  idCounter += 1;
  return {
    id: `mi-${idCounter}`,
    title: `Mission ${idCounter}`,
    status: "ACTIVE",
    source: "USER",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isObligationCurrentlyEligible", () => {
  it("standalone (no missionId) is always eligible — never affected by Mission lifecycle", () => {
    expect(isObligationCurrentlyEligible(obligation(), undefined)).toBe(true);
  });

  it("linked to an ACTIVE Mission is eligible", () => {
    const m = mission({ status: "ACTIVE" });
    expect(isObligationCurrentlyEligible(obligation({ missionId: m.id }), m)).toBe(true);
  });

  it("linked to an ARCHIVED Mission is NOT eligible", () => {
    const m = mission({ status: "ARCHIVED" });
    expect(isObligationCurrentlyEligible(obligation({ missionId: m.id }), m)).toBe(false);
  });

  it("linked but the Mission could not be resolved (unresolved/invalid reference) is conservatively NOT eligible", () => {
    // Must not become a confident current-attention signal merely because
    // the Obligation's own status is OPEN — see the module's doc comment.
    expect(isObligationCurrentlyEligible(obligation({ missionId: "does-not-exist" }), undefined)).toBe(false);
  });
});

describe("filterCurrentlyEligibleObligations", () => {
  it("keeps standalone and ACTIVE-mission obligations, excludes ARCHIVED-mission and unresolved-reference ones", () => {
    const active = mission({ status: "ACTIVE" });
    const archived = mission({ status: "ARCHIVED" });
    const standalone = obligation({ title: "Standalone" });
    const underActive = obligation({ title: "Under active", missionId: active.id });
    const underArchived = obligation({ title: "Under archived", missionId: archived.id });
    const underUnknown = obligation({ title: "Under unknown", missionId: "ghost" });

    const missionsById = new Map([
      [active.id, active],
      [archived.id, archived],
    ]);

    const result = filterCurrentlyEligibleObligations(
      [standalone, underActive, underArchived, underUnknown],
      missionsById,
    );
    expect(result.map((o) => o.title)).toEqual(["Standalone", "Under active"]);
  });

  it("empty input -> empty output", () => {
    expect(filterCurrentlyEligibleObligations([], new Map())).toEqual([]);
  });
});
