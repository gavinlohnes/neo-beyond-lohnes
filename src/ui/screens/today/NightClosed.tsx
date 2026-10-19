import type { TonightState } from "../../../application/tonightQueries";

/**
 * TONIGHT-001 (owner approval, 2026-10-19): after the shift, what the night
 * added up to in three lines, then the next thing: sleep. Read-only; no
 * grade, no target judgment, and missing data stays missing.
 */
export function NightClosed({
  tonight,
  proteinG,
  proteinTargetG,
  waterOz,
  trainedLabel,
}: {
  tonight: TonightState | null;
  proteinG: number;
  proteinTargetG: number | undefined;
  waterOz: number;
  /** "A · reduced, partial" for the session finished on this day, or null. */
  trainedLabel: string | null;
}) {
  if (!tonight) return null;
  const meals = tonight.mealsLogged === 1 ? "1 meal" : `${tonight.mealsLogged} meals`;
  return (
    <div className="equipment-row night-closed" role="group" aria-labelledby="night-closed-heading">
      <p id="night-closed-heading" className="tool-label" style={{ marginBottom: 4 }}>THE NIGHT</p>
      <dl className="night-closed__rows">
        <div><dt>Logged</dt><dd>{meals} · {waterOz} oz water</dd></div>
        <div><dt>Protein</dt><dd>{proteinTargetG !== undefined ? `${proteinG} of ${proteinTargetG} g` : `${proteinG} g`}</dd></div>
        <div><dt>Training</dt><dd>{trainedLabel ?? "None recorded"}</dd></div>
      </dl>
      <p className="meta" style={{ margin: "6px 0 0" }}>Next: sleep. Log it from TODAY when you wake.</p>
    </div>
  );
}
