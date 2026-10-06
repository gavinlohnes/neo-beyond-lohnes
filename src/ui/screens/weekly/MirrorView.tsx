import { useEffect, useState } from "react";
import { getMirror, type Mirror } from "../../../application/mirrorQueries";

/**
 * MIRROR-001 (owner brief 2026-10-05): you now against 30 and 90 days ago, in
 * Weekly behind SHOW MIRROR. Facts only, side by side, no judgment words; a
 * value with nothing behind it says "not enough data yet". See
 * application/mirrorQueries.ts for exactly how each value is read.
 */
export const NOT_ENOUGH = "not enough data yet";

export function formatSleepMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const COLUMN_LABELS: Record<number, string> = { 0: "NOW", 30: "30 DAYS AGO", 90: "90 DAYS AGO" };

export function MirrorView({ now }: { now?: Date | undefined }) {
  const [mirror, setMirror] = useState<Mirror | null>(null);
  useEffect(() => {
    let current = true;
    void getMirror(now).then((next) => {
      if (current) setMirror(next);
    });
    return () => {
      current = false;
    };
  }, [now]);
  if (!mirror) return <p className="meta">Loading…</p>;

  const rows: { label: string; values: (string | null)[] }[] = [
    { label: "Weight (7-day avg)", values: mirror.columns.map((c) => (c.weightLbs === null ? null : `${c.weightLbs} lb`)) },
    ...mirror.lifts.map((lift, i) => ({
      label: lift.name,
      values: mirror.columns.map((c) => (c.liftLbs[i] === null ? null : `${c.liftLbs[i]} lb`)),
    })),
    { label: "Sleep (7-day avg)", values: mirror.columns.map((c) => (c.avgSleepMinutes === null ? null : formatSleepMinutes(c.avgSleepMinutes))) },
    { label: "Clean days (30 days)", values: mirror.columns.map((c) => (c.cleanDays === null ? null : `${c.cleanDays}`)) },
  ];
  return (
    <table className="mirror" data-mirror>
      <thead>
        <tr>
          <th scope="col" className="visually-hidden">Measure</th>
          {mirror.columns.map((c) => (
            <th key={c.daysAgo} scope="col" className="mirror__head">{COLUMN_LABELS[c.daysAgo]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="mirror__label">{row.label}</th>
            {row.values.map((value, i) => (
              <td key={i} className={value === null ? "mirror__value mirror__value--none" : "mirror__value"}>
                {value ?? NOT_ENOUGH}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
