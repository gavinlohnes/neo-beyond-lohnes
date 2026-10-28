import { useEffect, useRef, useState, type ReactNode } from "react";
import { CAVE_VITALS, describeCaveVital, formatCaveValue, getCaveVital, type CaveVital, type CaveVitalId } from "../../../application/caveVitals";
import { describeError } from "../../errorMessage";
import { BatMark } from "../../components/BatMark";
import { CaveTonightView } from "./CaveTonight";
import { CaveRouteView } from "./CaveRoute";
import { CaveBriefView } from "./CaveBrief";
import { CaveFileView } from "./CaveFile";
import { CaveLogView } from "./CaveLog";
import { SleepPeriods } from "../today/SleepMetricSheet";
import { InsightsExplorer } from "../body/InsightsExplorer";
import { getBodyInsights, type BodyInsights, type InsightMetric } from "../../../application/bodyInsightsQueries";
import "./systems.css";

/**
 * SUIT-ALIVE S2 — the cave, Vitals. One reading in depth, read-only: value, last 14 finished lived days
 * against your usual range, where you usually are in the run, the records behind it, what it feeds and
 * where it came from. Opened from the SYSTEMS readout; full history stays one tap away.
 * SUIT-ALIVE S3 adds the TONIGHT view beside it, opened from TODAY's comms line.
 */
const HISTORY: Partial<Record<CaveVitalId, InsightMetric>> = { sleep: "sleep", protein: "protein", water: "water" };

export type CaveTab = "tonight" | "route" | "brief" | "vitals" | "file" | "log";
export type CaveOpen = { tab: CaveTab; vital?: CaveVitalId };
/** CAVE-DATA D1: an external entry (TODAY's bands, SYSTEMS rows) opening a view; each key opens it once. */
export type CaveRequest = { key: number; tab: CaveTab | "lead"; vital?: CaveVitalId | undefined };

/**
 * SUIT-ALIVE S3–S8: the cave's views — TONIGHT (the call and what's furthest from your normal), ROUTE,
 * BRIEF, VITALS, FILE and LOG. CAVE-DATA D1 (Gavin, 2026-10-28, option A): the cave lives in DATA, with
 * DATA's own page as its first view (`lead`, kept mounted so nothing on it is lost when you switch).
 */
export function Cave({ initial, lead, request, onBack, onOpenMetric, onOpenUnderstanding }: {
  initial: CaveOpen | { tab: "lead" };
  /** A first view supplied by the host (DATA's NUMBERS). */
  lead?: { label: string; content: ReactNode } | undefined;
  request?: CaveRequest | undefined;
  /** Absent where the cave is the screen itself (DATA). */
  onBack?: (() => void) | undefined;
  onOpenMetric?: ((metric: InsightMetric) => void) | undefined;
  /** S7: FILE's depth lives in REVIEW's Personal Understanding. */
  onOpenUnderstanding?: (() => void) | undefined;
}) {
  const [tab, setTab] = useState<CaveTab | "lead">(initial.tab);
  const [vital, setVital] = useState<CaveVitalId>("vital" in initial && initial.vital ? initial.vital : "sleep");
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!request?.key) return;
    setTab(request.tab === "lead" && !lead ? "tonight" : request.tab);
    if (request.vital) setVital(request.vital);
  }, [request?.key]);
  const tabs: (CaveTab | "lead")[] = [...(lead ? ["lead" as const] : []), "tonight", "route", "brief", "vitals", "file", "log"];
  const name = (t: CaveTab | "lead") => t === "lead" ? lead!.label : TAB_NAME[t];
  return (
    <section className="cave" aria-labelledby="cave-title">
      <div className="cave__head">
        <h2 id="cave-title" className="cave__title"><BatMark width={24} className="cave__bat" />THE CAVE <span>// {name(tab)}</span></h2>
        {onBack && <button ref={backRef} type="button" className="cave__back" onClick={onBack}>BACK TO SYSTEMS</button>}
      </div>
      <div className={`cave__tabs${lead ? " cave__tabs--seven" : ""}`} role="group" aria-label="Cave view">
        {tabs.map((t) => <button key={t} type="button" className="cave__tab" data-cave-tab={t} aria-pressed={t === tab} onClick={() => setTab(t)}>{name(t)}</button>)}
      </div>
      {lead && <div className="cave__lead-view" hidden={tab !== "lead"}>{lead.content}</div>}
      {tab === "lead" ? null
        : tab === "tonight" ? <CaveTonightView onOpenVital={(id) => { setVital(id); setTab("vitals"); }} />
        : tab === "route" ? <CaveRouteView />
        : tab === "brief" ? <CaveBriefView />
        : tab === "file" ? <CaveFileView onOpenUnderstanding={onOpenUnderstanding} />
        : tab === "log" ? <CaveLogView />
        : <CaveVitals id={vital} onPick={setVital} onOpenMetric={onOpenMetric} />}
    </section>
  );
}

/** One reading in depth. */
function CaveVitals({ id, onPick, onOpenMetric }: {
  id: CaveVitalId;
  onPick: (id: CaveVitalId) => void;
  onOpenMetric?: ((metric: InsightMetric) => void) | undefined;
}) {
  const [vital, setVital] = useState<CaveVital | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  async function load(next: CaveVitalId) {
    const request = ++sequence.current;
    setError(null);
    try {
      const v = await getCaveVital(next);
      if (request === sequence.current) setVital(v);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read this vital."));
    }
  }
  useEffect(() => { void load(id); }, [id]);

  const shown = vital && vital.id === id ? vital : null;
  const off = shown?.verdict === "BELOW" || shown?.verdict === "ABOVE";
  const history = HISTORY[id];

  return (
    <>
      <div className="cave__pick" role="group" aria-label="Vital">
        {CAVE_VITALS.map((v) => <button key={v} type="button" className="chip" aria-pressed={v === id} onClick={() => onPick(v)}>{TITLE[v]}</button>)}
      </div>
      {error && <div role="alert"><p className="meta meta--error">{error} The reading is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load(id)}>RETRY</button></div>}
      {!shown && !error && <p className="meta" role="status">Reading…</p>}
      {shown && <>
        <div className="cave__lead">
          <p className="cave__value">{shown.today.value === undefined ? "—" : formatCaveValue(shown.id, shown.today.value)}<small>{shown.unit}{shown.today.partial ? " so far" : ""}</small></p>
          <p className={`cave__sum${off ? " cave__sum--off" : ""}`}>{describeCaveVital(shown)}</p>
        </div>
        <section className="cave__block" aria-labelledby="cave-trend">
          <h3 id="cave-trend" className="cave__cap">Last {shown.trend.length} finished days · band is your usual · dashed is your median</h3>
          <Trend vital={shown} />
        </section>
        <section className="cave__block" aria-labelledby="cave-pos">
          <h3 id="cave-pos" className="cave__cap">Where you usually are</h3>
          <dl className="cave__kv">{shown.position.map((p) => <div key={p.label}><dt>{p.label}</dt><dd>{p.value === undefined ? `— · ${p.days} day${p.days === 1 ? "" : "s"}` : `${formatCaveValue(shown.id, p.value)} avg · ${p.days} days`}</dd></div>)}</dl>
        </section>
        <section className="cave__block" aria-labelledby="cave-facts">
          <h3 id="cave-facts" className="cave__cap">Behind the number</h3>
          <ul className="cave__facts">{shown.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
        <section className="cave__block" aria-labelledby="cave-feeds">
          <h3 id="cave-feeds" className="cave__cap">What it feeds</h3>
          <p className={`cave__feeds${shown.feeds.decides ? " cave__feeds--decides" : ""}`}>{shown.feeds.text}</p>
        </section>
        <section className="cave__block" aria-labelledby="cave-src">
          <h3 id="cave-src" className="cave__cap">Source</h3>
          <dl className="cave__kv">{shown.source.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
        </section>
        {(id === "sleep" || id === "protein" || id === "water") && <section className="cave__block" aria-labelledby="cave-history">
          <h3 id="cave-history" className="cave__cap">History</h3>
          {id === "sleep" ? <SleepPeriods active /> : <VitalHistory metric={id} />}
        </section>}
        {history && onOpenMetric && <button type="button" className="btn-secondary" onClick={() => onOpenMetric(history)}>FULL HISTORY</button>}
      </>}
    </>
  );
}

const TAB_NAME: Record<CaveTab, string> = { tonight: "TONIGHT", route: "ROUTE", brief: "BRIEF", vitals: "VITALS", file: "FILE", log: "LOG" };
const TITLE: Record<CaveVitalId, string> = { sleep: "SLEEP", energy: "ENERGY", protein: "PROTEIN", water: "WATER" };

/** Bars for each finished day, your usual band behind them and your median dashed. Drawn to one scale. */
function Trend({ vital }: { vital: CaveVital }) {
  const W = 356, H = 132, L = 36, R = 6, T = 8, B = 20;
  const known = vital.trend.flatMap((d) => d.value === undefined ? [] : [d.value]);
  const band = vital.usual.kind === "RANGE" ? vital.usual : null;
  const all = [...known, ...(band ? [band.low, band.high] : [])];
  if (!all.length) return <p className="meta">Nothing recorded in these days yet.</p>;
  const hi = Math.max(...all) * 1.08 || 1, lo = 0;
  const n = vital.trend.length, step = (W - L - R) / n, bw = Math.max(3, step - 4);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const label = (v: number) => formatCaveValue(vital.id, v);
  const summary = `${vital.title}, last ${n} finished days: ${known.length} recorded${band ? `, usual ${label(band.low)} to ${label(band.high)}` : ""}.`;
  return (
    <svg className="cave__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      {band && <rect x={L} y={y(band.high)} width={W - L - R} height={Math.max(1, y(band.low) - y(band.high))} className="cave__band" />}
      {band && <line x1={L} x2={W - R} y1={y(band.median)} y2={y(band.median)} className="cave__median" />}
      {band && <text x={L - 5} y={y(band.high) + 3} textAnchor="end" className="cave__axis">{label(band.high)}</text>}
      {band && <text x={L - 5} y={y(band.low) + 3} textAnchor="end" className="cave__axis">{label(band.low)}</text>}
      {vital.trend.map((d, i) => {
        const x = L + i * step + (step - bw) / 2;
        if (d.value === undefined) return <rect key={d.start} x={x} y={y(lo) - 1} width={bw} height={1} className="cave__gap" />;
        const below = band && d.value < band.low;
        return <rect key={d.start} x={x} y={y(d.value)} width={bw} height={Math.max(1, y(lo) - y(d.value))} className={below ? "cave__bar cave__bar--off" : "cave__bar"} />;
      })}
      <text x={L} y={H - 5} className="cave__axis">{shortDate(vital.trend[0]!.start)}</text>
      <text x={W - R} y={H - 5} textAnchor="end" className="cave__axis">{shortDate(vital.trend[n - 1]!.start)}</text>
    </svg>
  );
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * CAVE-DATA D2: the measure's own page (7, 28 or 90 days over your records), inside VITALS, so the
 * cave holds one page per number. The same explorer as DATA's progress, locked to this measure.
 */
function VitalHistory({ metric }: { metric: "protein" | "water" }) {
  const [data, setData] = useState<BodyInsights | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    setData(null); setFailed(false);
    void getBodyInsights().then((d) => { if (current) setData(d); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [metric]);
  if (failed) return <p className="meta" role="alert">History could not be read. Your records are unchanged.</p>;
  if (!data) return <p className="meta" role="status">Reading history…</p>;
  return <InsightsExplorer data={data} weights={[]} lockedMetric={metric} />;
}
