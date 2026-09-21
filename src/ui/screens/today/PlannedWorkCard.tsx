/**
 * PLANNED-WORK-001 (direct owner ruling, 2026-09-20): the one explicit
 * affordance for `PLANNED_WORK_SET` — same YES/NO chip pattern
 * WorkContextCard already uses for `setWorkContext`, same "explicit,
 * confirmed fact, never inferred" discipline. `declaration` is a real
 * tri-state (`undefined` = never answered) so "never asked" never reads
 * as a silent "no" — matching NO_FAKE_PRECISION and WorkContextCard's own
 * `UNKNOWN` handling.
 */
export function PlannedWorkCard({
  declaration,
  busy,
  onSetPlannedWork,
}: {
  declaration: boolean | undefined;
  busy: boolean;
  onSetPlannedWork: (planned: boolean) => void;
}) {
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>PLANNED WORK</p>
      <h2 className="card-title">Planning to train today?</h2>
      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
        <button
          type="button"
          className={`chip ${declaration === true ? "chip--selected" : ""}`}
          aria-pressed={declaration === true}
          disabled={busy}
          onClick={() => onSetPlannedWork(true)}
        >
          TRAIN TODAY
        </button>
        <button
          type="button"
          className={`chip ${declaration === false ? "chip--selected" : ""}`}
          aria-pressed={declaration === false}
          disabled={busy}
          onClick={() => onSetPlannedWork(false)}
        >
          NOT TODAY
        </button>
      </div>
      <p className="meta">
        {declaration === undefined
          ? "Not answered yet — BEYOND won't assume either way."
          : "Only changes what BEYOND expects today — it never starts, requires, or blocks a workout."}
      </p>
    </div>
  );
}
