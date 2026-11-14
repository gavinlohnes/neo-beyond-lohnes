import { ChevronRight, Moon, Scale } from "lucide-react";
import "../more/systemsHome.css";

/**
 * DATA-HOME-001 (Gavin, 2026-11-09: "Next is data. Make it fall in line with our new screens"): DATA opens
 * like YOUR LIFE and MORE — the date, YOUR NUMBERS., two actions, then one-tap shortcuts to the views DATA
 * already has. Everything below (today's numbers, progress, history, the cave tabs) is unchanged.
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
      <nav className="sys-area-nav" aria-label="DATA shortcuts">
        {shortcuts.map((s) => (
          <button type="button" key={s.label} onClick={s.onOpen}><span>{s.label}</span><ChevronRight size={18} aria-hidden="true" /></button>
        ))}
      </nav>
    </div>
  );
}
