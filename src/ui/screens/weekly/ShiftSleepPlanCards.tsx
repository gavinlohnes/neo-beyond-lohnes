import { useEffect, useState } from "react";
import { getShiftSleepPlan, type PlanCard, type ShiftSleepPlan } from "../../../application/shiftSleepPlan";
import { createObligation } from "../../../application/intentCommands";

/**
 * BIG-IDEAS-001 item 3: the next shift's sleep plan as cards. SAVE adds an ordinary reminder through the
 * existing command; SKIP hides the card for that shift on this device. Nothing else is written, and the
 * Engine never sees the plan.
 */
const skipKey = (date: string, kind: PlanCard["kind"]) => `beyond.shiftSleepPlan.skip.${date}.${kind}`;
const readSkip = (key: string) => { try { return localStorage.getItem(key) === "1"; } catch { return false; } };
const writeSkip = (key: string) => { try { localStorage.setItem(key, "1"); } catch { /* the card simply returns next time */ } };
const shiftLabel = (plan: ShiftSleepPlan) => {
  const at = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${new Date(plan.shift.start).toLocaleDateString("en-US", { weekday: "short" })} ${at(plan.shift.start)}–${at(plan.shift.end)}`;
};

export function ShiftSleepPlanCards({ now, onSaved }: { now?: Date | undefined; onSaved?: () => void }) {
  const [plan, setPlan] = useState<ShiftSleepPlan | null | undefined>(undefined);
  const [saved, setSaved] = useState<Partial<Record<PlanCard["kind"], true>>>({});
  const [skipped, setSkipped] = useState<Partial<Record<PlanCard["kind"], true>>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    void getShiftSleepPlan(now).then((next) => { if (current) setPlan(next); }).catch(() => { if (current) setPlan(null); });
    return () => { current = false; };
  }, [now]);
  if (!plan) return null;
  const visible = plan.cards.filter((c) => !skipped[c.kind] && !readSkip(skipKey(plan.shift.date, c.kind)));

  const save = async (card: PlanCard) => {
    setBusy(true); setFailed(false);
    try {
      await createObligation({ title: card.reminder.title, plannedAt: card.reminder.plannedAt, description: `${card.detail} Source: ${card.source.label}.` });
      setSaved((s) => ({ ...s, [card.kind]: true })); onSaved?.();
    } catch { setFailed(true); } finally { setBusy(false); }
  };

  return (
    <section data-shift-sleep-plan aria-labelledby="shift-sleep-plan-heading" style={{ margin: "0 0 10px" }}>
      <p id="shift-sleep-plan-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>NEXT SHIFT SLEEP PLAN · {shiftLabel(plan)}</p>
      <p className="meta" style={{ margin: "2px 0 6px" }}>General shift-work guidance, timed to your schedule and sleep. Not medical advice, and it doesn't change BEYOND's recommendations.</p>
      {visible.length === 0 && <p className="meta">All skipped for this shift.</p>}
      {visible.map((card) => (
        <div key={card.kind} data-plan-card={card.kind} className="equipment-row" style={{ marginBottom: 6, padding: "10px 12px" }}>
          <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{card.title}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.detail}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.basis}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>Source: <a href={card.source.url} target="_blank" rel="noreferrer">{card.source.label}</a></p>
          {saved[card.kind]
            ? <p className="meta" role="status" style={{ margin: "6px 0 0" }}>Saved as a reminder: {card.reminder.title}.</p>
            : <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="button" className="btn-secondary" disabled={busy} aria-label={`Save ${card.title} as a reminder`} onClick={() => void save(card)}>SAVE</button>
                <button type="button" className="btn-secondary" disabled={busy} aria-label={`Skip ${card.title}`} onClick={() => { writeSkip(skipKey(plan.shift.date, card.kind)); setSkipped((s) => ({ ...s, [card.kind]: true })); }}>SKIP</button>
              </div>}
        </div>
      ))}
      {failed && <p role="alert" className="meta">That reminder couldn't be saved. Nothing changed.</p>}
    </section>
  );
}
