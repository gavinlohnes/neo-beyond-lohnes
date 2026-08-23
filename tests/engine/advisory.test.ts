import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composeAdvisoryNoteFromProgression, composeAdvisoryNotesFromObligations } from "../../src/engine/advisory";
import type { Obligation } from "../../src/domain/intent/types";
import type { ExercisePrescription } from "../../src/domain/workout/types";
import type { ProgressionSuggestion } from "../../src/engine/progression";

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

const PRESCRIPTION: ExercisePrescription = {
  exerciseId: "machine-chest-press",
  name: "Machine Chest Press",
  sets: 3,
  repRangeLow: 8,
  repRangeHigh: 12,
  incrementLbs: 5,
};

function suggestion(overrides: Partial<ProgressionSuggestion> = {}): ProgressionSuggestion {
  return { recommendation: "HOLD", reason: "test", ...overrides };
}

describe("composeAdvisoryNoteFromProgression", () => {
  it("INCREASE and REDUCE each produce a note", () => {
    for (const recommendation of ["INCREASE", "REDUCE"] as const) {
      const note = composeAdvisoryNoteFromProgression(PRESCRIPTION, suggestion({ recommendation, lastWeight: 100 }));
      expect(note).not.toBeNull();
      expect(note!.message).toBe(`Machine Chest Press — ${recommendation}`);
    }
  });

  it("HOLD and NO_HISTORY produce no note — nothing new to say", () => {
    expect(composeAdvisoryNoteFromProgression(PRESCRIPTION, suggestion({ recommendation: "HOLD" }))).toBeNull();
    expect(composeAdvisoryNoteFromProgression(PRESCRIPTION, suggestion({ recommendation: "NO_HISTORY" }))).toBeNull();
  });

  it("is attributed to the 'progression' source module, distinct from 'obligationRelevance'", () => {
    const note = composeAdvisoryNoteFromProgression(PRESCRIPTION, suggestion({ recommendation: "INCREASE" }));
    expect(note!.sourceModule).toBe("progression");
  });

  it("carries traceable basis (exerciseId, recommendation, reason) and no Recommendation-shaped field", () => {
    const note = composeAdvisoryNoteFromProgression(
      PRESCRIPTION,
      suggestion({ recommendation: "INCREASE", reason: "All sets at top of range.", lastWeight: 100, suggestedNextWeight: 105 }),
    );
    expect(note!.basis).toEqual(
      expect.arrayContaining([
        { key: "exerciseId", value: "machine-chest-press" },
        { key: "recommendation", value: "INCREASE" },
        { key: "reason", value: "All sets at top of range." },
      ]),
    );
    expect(note).not.toHaveProperty("priority");
    expect(note).not.toHaveProperty("suggestedCommand");
    expect(note).not.toHaveProperty("kind");
  });

  it("deterministic: same input -> same output (excluding the per-note id)", () => {
    const input = suggestion({ recommendation: "REDUCE", lastWeight: 80 });
    const stripId = (n: ReturnType<typeof composeAdvisoryNoteFromProgression>) => {
      if (!n) return n;
      const { id: _id, ...rest } = n;
      return rest;
    };
    expect(stripId(composeAdvisoryNoteFromProgression(PRESCRIPTION, input))).toEqual(
      stripId(composeAdvisoryNoteFromProgression(PRESCRIPTION, input)),
    );
  });
});

describe("I3: both producers coexist without cross-domain knowledge", () => {
  it("AdvisoryNote from either producer has an identical, non-priority shape (proves the shared contract, not a per-domain special case)", () => {
    const obligationNote = composeAdvisoryNotesFromObligations(
      [{ id: "ob-1", title: "Renew passport", status: "OPEN", source: "USER", createdAt: "x", updatedAt: "x", dueAt: "2026-08-19" }],
      "2026-08-20",
    )[0]!;
    const progressionNote = composeAdvisoryNoteFromProgression(PRESCRIPTION, suggestion({ recommendation: "INCREASE" }))!;

    expect(Object.keys(obligationNote).sort()).toEqual(Object.keys(progressionNote).sort());
    for (const note of [obligationNote, progressionNote]) {
      expect(note).not.toHaveProperty("priority");
      expect(note).not.toHaveProperty("rank");
      expect(note).not.toHaveProperty("urgency");
      expect(note).not.toHaveProperty("suggestedCommand");
    }
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

  it("progression.ts never imports advisory.ts", () => {
    const source = readFileSync(new URL("../../src/engine/progression.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/["']\.\/advisory["']/);
  });
});
