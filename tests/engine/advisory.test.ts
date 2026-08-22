import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composeAdvisoryNotesFromObligations } from "../../src/engine/advisory";
import type { Obligation } from "../../src/domain/intent/types";

/**
 * Intelligence Spine — I1 (2026-08-22). Pure unit tests for the
 * deterministic advisory-composition seam — no Dexie, no fake-indexeddb,
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

const TODAY = "2026-08-20";

describe("composeAdvisoryNotesFromObligations", () => {
  it("empty obligations -> empty notes", () => {
    expect(composeAdvisoryNotesFromObligations([], TODAY)).toEqual([]);
  });

  it("attention-worthy tiers (OVERDUE/DUE_TODAY/DUE_SOON/PLANNED_TODAY) each produce a note", () => {
    const obligations = [
      obligation({ dueAt: "2026-08-19" }), // OVERDUE
      obligation({ dueAt: "2026-08-20" }), // DUE_TODAY
      obligation({ dueAt: "2026-08-21" }), // DUE_SOON
      obligation({ plannedAt: "2026-08-20" }), // PLANNED_TODAY
    ];
    const notes = composeAdvisoryNotesFromObligations(obligations, TODAY);
    expect(notes).toHaveLength(4);
    expect(notes.map((n) => n.message)).toEqual([
      `${obligations[0]!.title} — OVERDUE`,
      `${obligations[1]!.title} — DUE_TODAY`,
      `${obligations[2]!.title} — DUE_SOON`,
      `${obligations[3]!.title} — PLANNED_TODAY`,
    ]);
  });

  it("WAITING and QUIET tiers never produce a note", () => {
    const obligations = [
      obligation({ status: "WAITING", dueAt: "2026-08-01" }), // WAITING wins unconditionally
      obligation({ dueAt: "2026-08-25" }), // beyond the DUE_SOON window -> QUIET
    ];
    expect(composeAdvisoryNotesFromObligations(obligations, TODAY)).toEqual([]);
  });

  it("every note is attributed, traceable, and carries no Recommendation-shaped field", () => {
    const [note] = composeAdvisoryNotesFromObligations([obligation({ dueAt: TODAY })], TODAY);
    expect(note!.sourceModule).toBe("obligationRelevance");
    expect(note!.basis).toEqual(
      expect.arrayContaining([
        { key: "obligationId", value: expect.any(String) },
        { key: "tier", value: "DUE_TODAY" },
      ]),
    );
    expect(note).not.toHaveProperty("priority");
    expect(note).not.toHaveProperty("suggestedCommand");
    expect(note).not.toHaveProperty("kind");
  });

  it("deterministic: same input (excluding the per-note id) -> same output", () => {
    const obligations = [obligation({ dueAt: TODAY }), obligation({ plannedAt: TODAY })];
    const stripIds = (notes: ReturnType<typeof composeAdvisoryNotesFromObligations>) =>
      notes.map(({ id: _id, ...rest }) => rest);
    expect(stripIds(composeAdvisoryNotesFromObligations(obligations, TODAY))).toEqual(
      stripIds(composeAdvisoryNotesFromObligations(obligations, TODAY)),
    );
  });

  it("preserves input order (no independent ranking policy introduced)", () => {
    const obligations = [
      obligation({ title: "First", plannedAt: TODAY }), // PLANNED_TODAY
      obligation({ title: "Second", dueAt: "2026-08-19" }), // OVERDUE — ranks higher in obligationRelevance's own tiering, but order here is input order, not re-ranked
    ];
    const notes = composeAdvisoryNotesFromObligations(obligations, TODAY);
    expect(notes.map((n) => n.message)).toEqual(["First — PLANNED_TODAY", "Second — OVERDUE"]);
  });
});

describe("engine boundary: advisory.ts is a one-way dependency", () => {
  it("evaluate.ts never imports advisory.ts", () => {
    const source = readFileSync(new URL("../../src/engine/evaluate.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/["']\.\/advisory["']/);
  });

  it("obligationRelevance.ts never imports advisory.ts", () => {
    const source = readFileSync(new URL("../../src/engine/obligationRelevance.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/["']\.\/advisory["']/);
  });
});
