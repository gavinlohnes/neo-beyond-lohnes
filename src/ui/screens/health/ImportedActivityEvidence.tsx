import { useEffect, useState } from "react";
import { getMeasuredActivityByDay, type MeasuredDay } from "../../../application/externalActivityCommands";
import { heartRateLine } from "./healthFormat";

const dayLabel = (at: string | number) => new Date(at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** GARMIN-002: measured Garmin steps and heart rate per lived day. Separate from manual logs and guidance. */
export function ImportedActivityEvidence({ active = true, refreshKey = 0 }: { active?: boolean; refreshKey?: number }) {
  const [rows, setRows] = useState<MeasuredDay[]>([]), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  // UX-COHESION-001: every measured day stays reachable, ten at a time, so the list never grows on its own.
  const [limit, setLimit] = useState(10);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void getMeasuredActivityByDay(Number.POSITIVE_INFINITY).then((next) => { if (!cancelled) { setRows(next); setError(false); } }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [active, refreshKey, attempt]);
  if (!error && !rows.length) return null;
  return <section aria-label="Measured steps and heart rate" className="health-import">
    <h2>MEASURED · GARMIN</h2>
    <p>Watch measurements, newest first. Select a day for source detail.</p>
    {error ? <><p role="alert">Measured steps and heart rate could not be loaded.</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></> :
      rows.slice(0, limit).map(({ day, from, measured, restingHeartRateBpm }) => {
        const title = dayLabel(day?.startedAt ?? from);
        return <article key={from} aria-label={title}>
          <h3>{title}</h3>
          <p>{measured.steps === null ? "Steps —" : `${measured.steps.toLocaleString("en-US")} steps`}{restingHeartRateBpm !== null ? ` · resting HR ${restingHeartRateBpm}` : ""} · {measured.hours}h coverage{day?.status === "ACTIVE" ? " so far" : ""}</p>
          <details><summary>Day details</summary><p>{heartRateLine(measured.heartRateMinBpm, measured.heartRateAvgBpm, measured.heartRateMaxBpm)}</p><p>{day ? "Matched to your BEYOND day." : "Garmin measurement without a matching BEYOND day."}</p></details>
        </article>;
      })}
    {!error && rows.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 10)}>SHOW MORE MEASURED DAYS</button>}
  </section>;
}
