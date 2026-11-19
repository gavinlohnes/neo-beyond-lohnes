import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { getEnergyToday, type EnergyToday } from "../../../application/alertnessQueries";
import { MIN_NIGHTS, SOURCES } from "../../../application/alertness";
import { Panel, SourceTag } from "../../foundation/primitives";
import "../../foundation/foundation.css";
import "./todayEnergy.css";

/**
 * ENERGY-CURVE-001 (Gavin, 2026-11-19, HARVEST-003 part 1, approved): TONIGHT'S ENERGY on TODAY. One line across the
 * lived day showing when you'll likely feel sharper or duller, from your own Garmin sleep and the two-process model.
 * The shift, your sleep, the caffeine cut-off and "now" are marked. The lowest stretch is named, and when the drive
 * home falls in it, that gets one plain line. An estimate, labelled as one: never a score, never advice to skip work.
 * The chart is decorative; the sentences carry the same facts.
 */
const clock = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const W = 320, H = 96, PAD = 6;

export function TodayEnergy({ now, active = true, refreshKey = 0 }: { now: number; active?: boolean; refreshKey?: number }) {
  const [data, setData] = useState<EnergyToday | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getEnergyToday(new Date(now)).then((d) => { if (live) setData(d); }, () => { if (live) setData("ERROR"); });
    return () => { live = false; };
    // Re-read when the lived day or the records change, not every clock tick.
  }, [active, refreshKey, Math.floor(now / (15 * 60_000))]);
  if (data === null) return null;
  if (data === "ERROR") return <section className="bf today-energy"><p className="bf-meta" role="alert">The energy estimate couldn't be read. Your records are unchanged.</p></section>;
  const curve = data.curve;

  return <section className="bf today-energy" aria-label="Tonight's energy">
    <Panel headingLevel={2} headingId="today-energy-title" wide icon={<Activity size={18} />} label="TONIGHT'S ENERGY" source={<SourceTag>ESTIMATE</SourceTag>}>
      {!curve ? <p className="bf-meta">The energy estimate appears after {MIN_NIGHTS} main sleeps from Garmin in the last week ({data.nights} so far).</p> : <>
        {(() => {
          const x = (t: number) => PAD + ((t - curve.from) / (curve.to - curve.from)) * (W - 2 * PAD);
          const y = (v: number) => H - PAD - v * (H - 2 * PAD);
          const band = (s: { start: number; end: number }, cls: string) => {
            const a = Math.max(curve.from, s.start), b = Math.min(curve.to, s.end);
            return b > a ? <rect className={cls} x={x(a)} y={0} width={x(b) - x(a)} height={H} /> : null;
          };
          // The line breaks while you sleep: one run per stretch awake.
          const runs: (typeof curve.points)[] = [];
          for (const p of curve.points) { if (p.asleep) { if (runs.at(-1)?.length) runs.push([]); continue; } if (!runs.length) runs.push([]); runs.at(-1)!.push(p); }
          return <svg className="today-energy__chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {data.shift && band(data.shift, "today-energy__shift")}
            {curve.low && band(curve.low, "today-energy__low")}
            {curve.points.filter((p) => p.asleep).map((p) => <rect key={p.t} className="today-energy__sleep" x={x(p.t)} y={0} width={x(p.t + 15 * 60_000) - x(p.t)} height={H} />)}
            {runs.filter((r) => r.length > 1).map((r) => <polyline key={r[0]!.t} className="today-energy__line" points={r.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")} />)}
            {data.caffeineCutoff !== null && data.caffeineCutoff > curve.from && data.caffeineCutoff < curve.to && <line className="today-energy__mark" x1={x(data.caffeineCutoff)} x2={x(data.caffeineCutoff)} y1={0} y2={H} />}
            {now >= curve.from && now < curve.to && <line className="today-energy__now" x1={x(now)} x2={x(now)} y1={0} y2={H} />}
          </svg>;
        })()}
        <p className="bf-meta today-energy__legend">Higher is sharper. Shaded: your shift, then sleep. Red: now; dashed: caffeine cut-off.</p>
        <div className="today-energy__axis" aria-hidden="true"><span>{clock(curve.from)}</span><span>{clock(curve.from + 12 * 3_600_000)}</span><span>{clock(curve.to)}</span></div>
        {curve.low && <p className="today-energy__headline" data-energy-low>Lowest stretch {clock(curve.low.start)}–{clock(curve.low.end)}.</p>}
        {curve.drive && <p className="today-energy__drive" data-energy-drive>Extra care on the drive home, {clock(curve.drive.start)}–{clock(curve.drive.end)}: it falls in your lowest stretch.</p>}
        {(data.caffeineCutoff !== null || data.nap) && <p className="bf-meta" data-energy-plan>{[
          data.caffeineCutoff !== null && `Caffeine cut-off ${clock(data.caffeineCutoff)}`,
          data.nap && `nap window ${clock(data.nap.start)}–${clock(data.nap.end)}`,
        ].filter(Boolean).join(" · ")}.</p>}
        <details className="today-energy__how">
          <summary>How this is worked out</summary>
          <p className="bf-meta">An estimate from your last {curve.basis.nights} main sleeps (Garmin, usual wake {String(Math.floor(curve.basis.wakeMinutes / 60)).padStart(2, "0")}:{String(curve.basis.wakeMinutes % 60).padStart(2, "0")}) and the two-process sleep model: sleep pressure builds while you're awake and clears while you sleep, against a 24-hour rhythm whose low sits about 1.5 hours before your usual wake. Not a measurement or a score. Unrecorded sleep follows the planned or usual sleep window as an assumption, not a confirmed sleep record.</p>
          <ul className="today-energy__sources">{Object.values(SOURCES).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        </details>
      </>}
    </Panel>
  </section>;
}
