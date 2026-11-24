import type { ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";
import "./foundation.css";

/**
 * VISUAL-FOUNDATION-001 (Gavin, 2026-11-14): BEYOND's shared visual primitives, extracted unchanged from
 * BODY-DASH-001 so other screens can adopt the same language. Presentation only: no data, no commands. The
 * screen that uses them adds `.bf` to its root for the tokens. Rules: docs/agent/VISUAL-FOUNDATION-001.md.
 */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** The SVG canvas sparklines (and chart primitives drawn beside them) share. */
export const SPARK_W = 240, SPARK_H = 44;

export interface PanelAction { label: string; onClick: () => void; disabled?: boolean | undefined }

/**
 * A framed panel: cut corners, the red bracket, a mono label, and optionally its source, a quick "+" action and a ›
 * into its history. Wide panels span their grid and keep source and action in the header; narrow ones give them
 * their own line so the title never crowds.
 */
export function Panel({ headingId, headingLevel = 3, icon, label, source, wide, primary, children, onOpen, openLabel, action, data }: {
  headingId: string; headingLevel?: 2 | 3 | undefined; icon: ReactNode; label: string; source?: ReactNode; wide?: boolean | undefined; primary?: boolean | undefined; children: ReactNode;
  onOpen?: (() => void) | undefined; openLabel?: string | undefined; action?: PanelAction | undefined;
  /** Data attributes for the screen's own hooks, e.g. { "data-dash": "water" }. */
  data?: Record<`data-${string}`, string> | undefined;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const act = action && <button type="button" className="bf-panel__act" aria-label={action.label} disabled={action.disabled} onClick={action.onClick}><Plus size={18} aria-hidden="true" /></button>;
  return (
    <article className={`bf-panel${wide ? " bf-panel--wide" : ""}${primary ? " bf-panel--primary" : ""}`} aria-labelledby={headingId} {...data}>
      <header className="bf-panel__head">
        <span className="bf-panel__icon" aria-hidden="true">{icon}</span>
        <Heading id={headingId} className="bf-panel__label">{label}</Heading>
        {wide && source}
        {wide && act}
        {onOpen && <button type="button" className="bf-panel__open" aria-label={openLabel ?? `Open ${label.toLowerCase()} history`} onClick={onOpen}><ChevronRight size={18} aria-hidden="true" /></button>}
      </header>
      {!wide && (source || action) && <div className="bf-panel__srcline">{source ?? <span />}{act}</div>}
      {children}
    </article>
  );
}

/** Where a number came from: your own log (grey) or Garmin's watch (Garmin blue). */
export const SourceTag = ({ garmin, children }: { garmin?: boolean | undefined; children: ReactNode }) =>
  <span className={`bf-src${garmin ? " bf-src--garmin" : ""}`}>{children}</span>;

/** A line over values (null breaks the line). Pure SVG, decorative: the panel's text carries the same facts. */
export function Sparkline({ values, tone, area }: { values: readonly (number | null)[]; tone: "own" | "garmin"; area?: boolean | undefined }) {
  const W = SPARK_W, H = SPARK_H;
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const lo = Math.min(...known), hi = Math.max(...known), span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? W : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 10);
  const pts = values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`));
  const runs: string[][] = [[]];
  for (const p of pts) { if (p) runs.at(-1)!.push(p); else if (runs.at(-1)!.length) runs.push([]); }
  const lastI = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1)!;
  return (
    <svg className={`bf-spark bf-spark--${tone}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {area && runs.map((r, i) => r.length > 1 && <polygon key={`a${i}`} className="bf-spark__area" points={`${r[0]!.split(",")[0]},${H} ${r.join(" ")} ${r.at(-1)!.split(",")[0]},${H}`} />)}
      {runs.map((r, i) => r.length > 1 && <polyline key={i} className="bf-spark__line" points={r.join(" ")} />)}
      <circle className="bf-spark__dot" cx={x(lastI)} cy={y(values[lastI]!)} r={3} />
    </svg>
  );
}

/** A labelled number; with a target you set (`of`), a thin track under it. No target, no track: no invented goal. */
export function Meter({ label, value, of, unit, onOpen, openLabel }: {
  label: string; value: number; of?: number | undefined; unit: string;
  /** GRAYSON-Q5-PROTEIN-TAP-001: a meter with onOpen is itself the way into its page (a full-width 44 px button). */
  onOpen?: (() => void) | undefined; openLabel?: string | undefined;
}) {
  const body = <>
    <span className="bf-meter__row"><span>{label}</span><span><b>{fmt(value)}</b>{of ? ` / ${fmt(of)}` : ""} {unit}{onOpen && <ChevronRight className="bf-meter__chev" size={16} aria-hidden="true" />}</span></span>
    {of ? <span className="bf-meter__track" aria-hidden="true"><i style={{ width: `${Math.min(100, (value / of) * 100)}%` }} /></span> : null}
  </>;
  if (onOpen) return <button type="button" className="bf-meter bf-meter--open" onClick={onOpen}>{body}<span className="visually-hidden">, {openLabel ?? `open ${label.toLowerCase()}`}</span></button>;
  return <div className="bf-meter">{body}</div>;
}

/**
 * The command bar: red slashes and a screen eyebrow ("BODY // HEALTH"), the screen's own context line under it, and
 * at most one action. The context line is the screen's: render a `p.bf-bar__day` (with `.bf-bar__date` and
 * `.bf-bar__ctx` inside) as `context`.
 */
export function CommandBar({ eyebrow, context, action }: {
  eyebrow: string; context: ReactNode;
  action?: { text: string; label: string; onClick: () => void; disabled?: boolean | undefined } | undefined;
}) {
  return (
    <header className="bf-bar">
      <div className="bf-bar__id">
        <p className="bf-bar__eyebrow"><span className="bf-slashes" aria-hidden="true">///</span>{` ${eyebrow}`}</p>
        {context}
      </div>
      {action && <button type="button" className="bf-bar__log" aria-label={action.label} disabled={action.disabled} onClick={action.onClick}>{`${action.text} `}<Plus size={18} aria-hidden="true" /></button>}
    </header>
  );
}
