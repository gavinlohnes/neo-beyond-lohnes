import { useEffect, useState } from "react";
import { getShiftCatchUp, waterLabel, type CatchUpItem } from "../../../application/shiftCatchUp";
import { logWater } from "../../../application/commands";
import { logMeal } from "../../../application/nutritionCommands";
import { catchUpDone, markCatchUpDone } from "./closeStore";
import { useReportPresence } from "../../components/usePresence";

export type CatchUpPresence = "LOADING" | "SHOWN" | "NONE";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * GRAYSON LOG-CATCHUP-001: after SHIFT DOWN, one pass for what didn't get logged at work. It lists what he usually has
 * on shift that isn't logged tonight; nothing is ticked for him. LOG writes each ticked item at its usual point in the
 * shift through the existing commands. Shown only when there is something to ask; no red, below the day's next step.
 */
// GRAYSON-TODAY-CALM-001: it tells TODAY whether it is still reading, showing, or has nothing to ask, so the close waits
// for it (one after-shift card at a time) and never waits for a catch-up that has nothing to show.
export function ShiftCatchUpCard({ dayId, busy, onDone, onPresence }: { dayId: string; busy: boolean; onDone: () => void; onPresence?: (state: CatchUpPresence) => void }) {
  const [items, setItems] = useState<CatchUpItem[] | null>(null);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getShiftCatchUp(dayId).then((r) => { if (!cancelled) setItems(r?.items ?? []); }, () => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [dayId]);

  useReportPresence<CatchUpPresence>(catchUpDone(dayId) ? "NONE" : items === null ? "LOADING" : items.length > 0 ? "SHOWN" : "NONE", onPresence);
  if (catchUpDone(dayId) || !items || items.length === 0) return null;
  const finish = () => { markCatchUpDone(dayId); onDone(); };
  const toggle = (key: string) => setTicked((t) => { const n = new Set(t); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const log = async () => {
    if (saving) return;
    const chosen = items.filter((i) => ticked.has(i.key));
    if (chosen.length === 0) { finish(); return; }
    setSaving(true); setError(null);
    // Progress is kept per write, not per item: a water item has several times, and a retry must never write a
    // time that already saved.
    const left = new Map(chosen.map((i) => [i.key, [...i.times]]));
    let saved = 0;
    try {
      for (const item of chosen) {
        const times = left.get(item.key)!;
        while (times.length > 0) {
          if (item.kind === "MEAL") await logMeal(dayId, item.savedMealId, item.servings, times[0]!);
          else await logWater(dayId, item.amountOz, times[0]!);
          times.shift(); saved += 1;
        }
      }
      finish();
    } catch {
      // Whatever saved stays saved; only the times that didn't are offered again, still ticked.
      const rest = items.flatMap((i): CatchUpItem[] => {
        const times = left.get(i.key);
        if (!times) return [i];
        if (times.length === 0) return [];
        return [i.kind === "WATER" ? { ...i, times, label: waterLabel(times.length, i.amountOz) } : { ...i, times }];
      });
      setItems(rest);
      setTicked((t) => new Set([...t].filter((k) => rest.some((i) => i.key === k))));
      setError(saved ? `${saved} logged. The rest didn't save; try again.` : "Nothing saved. Try again.");
    } finally { setSaving(false); }
  };

  return (
    <section className="today-close today-catchup" aria-label="Shift catch-up">
      <div className="today-close__head">
        <h2 className="today-close__label">ON SHIFT, DID YOU HAVE:</h2>
        <span className="today-close__hint">Tick what you had. Logged at your usual time.</span>
      </div>
      <div className="today-catchup__list">
        {items.map((item) => (
          <label key={item.key} className="today-catchup__item">
            <input type="checkbox" checked={ticked.has(item.key)} disabled={saving} onChange={() => toggle(item.key)} />
            <span>{item.label}</span>
            <span className="today-catchup__time">{item.times.map(clock).join(", ")}</span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="meta">{error}</p>}
      <div className="today-close__acts">
        <button type="button" className="btn-secondary" disabled={busy || saving || ticked.size === 0} onClick={() => void log()}>
          {ticked.size === 0 ? "LOG" : `LOG ${ticked.size}`}
        </button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={finish}>NOTHING ELSE</button>
      </div>
    </section>
  );
}
