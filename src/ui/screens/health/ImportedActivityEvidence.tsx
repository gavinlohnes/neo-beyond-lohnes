import { useEffect, useState } from "react";
import { getMeasuredActivityByDay, type MeasuredDay } from "../../../application/externalActivityCommands";
import { heartRateLine, localDayTime } from "./healthFormat";

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
    <p>Steps and heart rate your watch recorded, by lived day (up to 24 hours each). Separate from your own logs and TODAY guidance.</p>
    {error ? <><p role="alert">Measured steps and heart rate could not be loaded.</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></> :
      rows.map(({ day, from, measured, restingHeartRateBpm }) => {
        const title = day ? `Day started ${localDayTime(day.startedAt)}` : `No BEYOND day · from ${localDayTime(from)}`;
        return <article key={from} aria-label={title}>
          <h3>{title}</h3>
          <p>{measured.steps === null ? "Steps not measured" : `${measured.steps.toLocaleString("en-US")} steps`}</p>
          <p>{heartRateLine(measured.heartRateMinBpm, measured.heartRateAvgBpm, measured.heartRateMaxBpm)}</p>
          {restingHeartRateBpm !== null && <p>Resting heart rate {restingHeartRateBpm} bpm</p>}
          <p>{measured.hours} measured {measured.hours === 1 ? "hour" : "hours"}{day?.status === "ACTIVE" ? " so far" : ""}</p>
        </article>;
      })}
  </section>;
}
