import { useEffect, useState } from "react";
import { getMeasuredActivityByDay, type MeasuredDay } from "../../../application/externalActivityCommands";

const steps = (n: number) => n.toLocaleString("en-US");
function dayLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** GARMIN-002: measured Garmin steps and heart rate per lived day. Separate from manual logs and guidance. */
export function ImportedActivityEvidence({ active = true, refreshKey = 0 }: { active?: boolean; refreshKey?: number }) {
  const [rows, setRows] = useState<MeasuredDay[]>([]), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void getMeasuredActivityByDay().then((next) => { if (!cancelled) { setRows(next); setError(false); } }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [active, refreshKey, attempt]);
  if (!error && !rows.length) return null;
  return <section aria-label="Measured steps and heart rate" className="health-import">
    <h2>MEASURED · GARMIN</h2>
    <p>Steps and heart rate your watch recorded, by lived day. Separate from your own logs and TODAY guidance.</p>
    {error ? <><p role="alert">Measured steps and heart rate could not be loaded.</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></> :
      rows.map(({ day, measured, restingHeartRateBpm }) => <article key={day.id} aria-label={`Measured ${dayLabel(day.startedAt)}`}>
        <h3>Day started {dayLabel(day.startedAt)}</h3>
        <p>{measured.steps === null ? "Steps not measured" : `${steps(measured.steps)} steps`}</p>
        <p>{measured.heartRateAvgBpm === null ? "Heart rate not measured" : `Heart rate ${measured.heartRateMinBpm ?? "?"}–${measured.heartRateMaxBpm ?? "?"} bpm · average ${measured.heartRateAvgBpm}`}</p>
        {restingHeartRateBpm !== null && <p>Resting heart rate {restingHeartRateBpm} bpm</p>}
        <p>{measured.hours} measured {measured.hours === 1 ? "hour" : "hours"}{day.status === "ACTIVE" ? " so far" : ""}</p>
      </article>)}
  </section>;
}
