import { useEffect, useState } from "react";
import { getRecoveryComparison, type RecoveryComparison as Comparison } from "../../../application/recoveryComparison";
import type { UnusualReading } from "../../../domain/health/unusual";
const number = (n: number) => Math.round(n).toLocaleString();
const date = (n: number) => new Date(n).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
function range(reading: UnusualReading | null, label: string, unit: string) {
  if (!reading) return <p className="meta">{label}: no current outside-usual-range reading. Missing or thin evidence can also leave this quiet.</p>;
  const last = reading.days.at(-1)!;
  return <p className="meta">{label}: {reading.days.length} finished days {reading.direction === "ABOVE" ? "above" : "below"} your existing usual range. Latest {number(last.value)} {unit}; range {number(last.low)}–{number(last.high)} {unit}, from {reading.samples} earlier measured days. Latest window started {date(last.from)}.</p>;
}
export function RecoveryComparison({ now }: { now?: Date | undefined }) {
  const [data, setData] = useState<Comparison | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setData(null); setError(false);
    void getRecoveryComparison(now).then((next) => { if (live) setData(next); }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, [now, retry]);
  if (error) return <div role="alert">Training and recovery information is unavailable. <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY COMPARISON</button></div>;
  if (!data) return <p role="status" className="meta">Reading training and recovery…</p>;
  if (!data.weeks) return <p className="meta">Not enough finished day windows to compare yet.</p>;
  const [previous, recent] = data.weeks;
  const measured = (value: { mean: number | null; days: number }, unit: string) => value.mean === null ? "Not recorded" : `${number(value.mean)} ${unit} · ${value.days}/7 days`;
  const volume = (value: typeof recent) => value.volume === null ? "No qualifying sets logged" : `${number(value.volume)} lb × reps · ${value.sets} sets / ${value.sessions} sessions`;
  return <section aria-label="Training and recovery comparison">
    <p className="meta">Two windows of seven finished lived periods; the current period is excluded. Previous: {date(previous.from)} to {date(previous.to)}. Recent: {date(recent.from)} to {date(recent.to)}.</p>
    <table style={{ width: "100%", tableLayout: "fixed", overflowWrap: "anywhere" }}>
      <caption>Logged training beside measured recovery</caption>
      <thead><tr><th scope="col">Reading</th><th scope="col">Previous</th><th scope="col">Recent</th></tr></thead>
      <tbody>
        <tr><th scope="row">Weighted training volume</th><td>{volume(previous)}</td><td>{volume(recent)}</td></tr>
        <tr><th scope="row">Garmin sleep duration</th><td>{measured(previous.sleep, "min")}</td><td>{measured(recent.sleep, "min")}</td></tr>
        <tr><th scope="row">Garmin resting heart rate</th><td>{measured(previous.resting, "bpm")}</td><td>{measured(recent.resting, "bpm")}</td></tr>
      </tbody>
    </table>
    <p className="meta">Training counts only logged weighted working sets from finished strength sessions, excluding warmups, skips, undone sets and substitutions. Bodyweight-only work is not included. Missing logs are not proof of rest.</p>
    <p className="meta">Garmin sleep duration uses asleep time when available, otherwise time in bed. Averages use measured days only; different sample counts limit comparison. These measurements do not replace your manual entries.</p>
    {range(data.unusual.sleep, "Garmin sleep", "min")}{range(data.unusual.resting, "Garmin resting heart rate", "bpm")}
    <p className="meta">These readings do not establish a cause or score readiness. Your training plan and Engine guidance are unchanged.</p>
  </section>;
}
