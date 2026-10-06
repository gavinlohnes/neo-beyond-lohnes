import { useEffect, useState } from "react";
import { getTrainingGrid, HEAT_GRID_WEEKS, type TrainingDay } from "../../../application/viewQueries";
import { formatShortDate } from "../../../application/bodyTrendQueries";

/**
 * VIEWS-001 (owner brief 2026-10-05): Weekly's 12-week training grid, behind
 * SHOW 12 WEEKS under LAST 28 DAYS (a view opens from a tap; it never adds a
 * row). Seven days per column, oldest top-left; the last column ends
 * today, so rows are not fixed weekdays. Each cell carries a text label (accessibility); a count
 * line says the same in words. Facts only, no streaks.
 */
const LABELS: Record<TrainingDay["kind"], string> = { STRENGTH: "strength", RECOVERY: "recovery", NONE: "no training" };

export function describeTrainingGrid(days: readonly TrainingDay[]): string {
  const strength = days.filter((d) => d.kind === "STRENGTH").length;
  const recovery = days.filter((d) => d.kind === "RECOVERY").length;
  return `${strength} strength · ${recovery} recovery days in ${HEAT_GRID_WEEKS} weeks`;
}

export function HeatGrid({ now }: { now?: Date | undefined }) {
  const [days, setDays] = useState<TrainingDay[] | null>(null);
  useEffect(() => {
    let current = true;
    void getTrainingGrid(now).then((next) => {
      if (current) setDays(next);
    });
    return () => {
      current = false;
    };
  }, [now]);
  if (!days) return <p className="meta">Loading…</p>;
  return (
    <div data-heat-grid>
      <div className="heat-grid" role="list" aria-label={`Training, last ${HEAT_GRID_WEEKS} weeks`}>
        {days.map((d) => (
          <span
            key={d.date}
            role="listitem"
            className={`heat-grid__cell heat-grid__cell--${d.kind}`}
            aria-label={`${formatShortDate(`${d.date}T12:00:00`)}: ${LABELS[d.kind]}`}
            title={`${formatShortDate(`${d.date}T12:00:00`)}: ${LABELS[d.kind]}`}
          />
        ))}
      </div>
      <p className="meta" style={{ margin: "0 0 4px" }}>{describeTrainingGrid(days)}</p>
      <p className="meta heat-grid__legend" style={{ margin: 0 }}>
        <span><span className="heat-grid__key heat-grid__cell--STRENGTH" />strength</span>
        <span><span className="heat-grid__key heat-grid__cell heat-grid__cell--RECOVERY" />recovery</span>
        <span><span className="heat-grid__key heat-grid__cell" />none</span>
      </p>
    </div>
  );
}
