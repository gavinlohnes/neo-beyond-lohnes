import { ChevronRight, LayoutGrid, Moon, Scale } from "lucide-react";
import "../../foundation/foundation.css";
import "../more/systemsHome.css";
import "./dataHome.css";

/**
 * DATA-HOME-001 (Gavin, 2026-11-09: "Next is data. Make it fall in line with our new screens"): DATA opens
 * like YOUR LIFE and MORE — the date, YOUR NUMBERS., two actions, then one-tap shortcuts to the views DATA
 * already has. Everything below (today's numbers, progress, history, the cave tabs) is unchanged.
 *
 * GRAYSON C9.2 (Quiet Command finish): under the dashboard the shortcuts sit under a VIEWS rule in the grammar of
 * the panels above (red bracket, mono label, --bf-line rows), unboxed so SHORTCUT-GRID-001's two readable columns
 * hold at 320 px. Same buttons, same order, same handlers.
 */
export interface DataHomeShortcut { label: string; onOpen: () => void }

export function DataHome({ onLogWeight, onSleep, shortcuts, busy, compact = false }: {
  /** BODY-DASH-001: the dashboard above carries the title and the weight and sleep actions; only the shortcuts stay. */
  compact?: boolean;
  onLogWeight?: (() => void) | undefined;
  onSleep: () => void;
  shortcuts: readonly DataHomeShortcut[];
  busy: boolean;
}) {
  const nav = (
    <nav className="sys-area-nav" aria-label="DATA shortcuts">
      {shortcuts.map((s) => (
        <button type="button" key={s.label} onClick={s.onOpen}><span>{s.label}</span><ChevronRight size={18} aria-hidden="true" /></button>
      ))}
    </nav>
  );
  return (
    <div className="sys-home data-home">
      {!compact && <section className="sys-hero" aria-labelledby="data-home-title">
        <p className="sys-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h2 id="data-home-title">YOUR NUMBERS.</h2>
        <p className="sys-intro">What your body and days recorded, in one place.</p>
        <div className="sys-hero-actions">
          {onLogWeight && <button type="button" className="sys-primary" disabled={busy} onClick={onLogWeight}><Scale size={20} aria-hidden="true" />Log weight</button>}
          <button type="button" onClick={onSleep}><Moon size={20} aria-hidden="true" />Sleep</button>
        </div>
      </section>}
      {compact
        ? <section className="bf data-home__views" aria-labelledby="data-home-views">
            <header className="bf-panel__head"><span className="bf-panel__icon" aria-hidden="true"><LayoutGrid size={16} /></span><h2 id="data-home-views" className="bf-panel__label">VIEWS</h2></header>
            {nav}
          </section>
        : nav}
    </div>
  );
}
