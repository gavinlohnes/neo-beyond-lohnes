import { useEffect, useState } from "react";
import { getShiftSleepPlan, saveShiftPlanCard, type PlanCard, type PlanCardKind, type ShiftSleepPlan } from "../../../application/shiftSleepPlan";

/**
 * CIRCADIAN-SPIKE-001: the next shift transition's cards, in ROUTE. Shift-work guidance, not a decision. SAVE shows
 * a preview first and then adds one plan item (planned, never due); SKIP hides that card for that shift on this
 * device. Nothing else is written, and the Engine never sees the cards.
 */
const skipKey = (date: string, kind: PlanCardKind) => `beyond.shiftSleepPlan.skip.${date}.${kind}`;
const readSkip = (key: string) => { try { return localStorage.getItem(key) === "1"; } catch { return false; } };
const writeSkip = (key: string) => { try { localStorage.setItem(key, "1"); } catch { /* the card simply comes back next time */ } };
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function ShiftSleepPlanCards({ now }: { now?: Date | undefined }) {
  const [plan, setPlan] = useState<ShiftSleepPlan | null | undefined>(undefined);
  const [preview, setPreview] = useState<PlanCardKind | null>(null);
  const [saved, setSaved] = useState<Partial<Record<PlanCardKind, true>>>({});
  const [skipped, setSkipped] = useState<Partial<Record<PlanCardKind, true>>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    void getShiftSleepPlan(now).then((next) => { if (current) setPlan(next); }).catch(() => { if (current) setPlan(null); });
    return () => { current = false; };
  }, [now]);
  if (!plan) return null;
  const visible = plan.cards.filter((c) => !skipped[c.kind] && !readSkip(skipKey(plan.shift.date, c.kind)));

  const confirm = async (card: PlanCard) => {
    setBusy(true); setFailed(false);
    try { await saveShiftPlanCard(card); setSaved((s) => ({ ...s, [card.kind]: true })); setPreview(null); }
    catch { setFailed(true); } finally { setBusy(false); }
  };

  return (
    <section data-shift-sleep-plan aria-labelledby="shift-sleep-plan-heading" style={{ marginTop: 14 }}>
      <p id="shift-sleep-plan-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>
        NEXT SHIFT · {new Date(plan.shift.start).toLocaleDateString("en-US", { weekday: "short" })} {clock(plan.shift.start)}–{clock(plan.shift.end)}
      </p>
      <p className="meta" style={{ margin: "2px 0 6px" }}>Shift-work guidance, not a decision. Not medical advice, and BEYOND's recommendation doesn't use it.</p>
      {visible.length === 0 && <p className="meta">All skipped for this shift.</p>}
      {visible.map((card) => (
        <div key={card.kind} data-plan-card={card.kind} className="equipment-row" style={{ marginBottom: 6, padding: "10px 12px" }}>
          <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{card.title}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.detail}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.basis}</p>
          {card.source && <p className="meta" style={{ margin: "2px 0 0" }}>Source: <a href={card.source.url} target="_blank" rel="noreferrer">{card.source.label}</a></p>}
          {saved[card.kind]
            ? <p className="meta" role="status" style={{ margin: "6px 0 0" }}>Saved as a plan item: {card.plan.title}.</p>
            : preview === card.kind
              ? <div role="group" aria-label={`Preview: ${card.title}`} style={{ marginTop: 6 }}>
                  <p className="meta" style={{ margin: 0 }}>Adds a plan item for {day(card.plan.plannedAt)}: “{card.plan.title}”. It's planned, never due, so it doesn't change BEYOND's recommendation.</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button type="button" className="btn-primary" disabled={busy} onClick={() => void confirm(card)}>CONFIRM</button>
                    <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPreview(null)}>CANCEL</button>
                  </div>
                </div>
              : <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button type="button" className="btn-secondary" disabled={busy} aria-label={`Save ${card.title}`} onClick={() => setPreview(card.kind)}>SAVE</button>
                  <button type="button" className="btn-secondary" disabled={busy} aria-label={`Skip ${card.title}`} onClick={() => { writeSkip(skipKey(plan.shift.date, card.kind)); setSkipped((s) => ({ ...s, [card.kind]: true })); }}>SKIP</button>
                </div>}
        </div>
      ))}
      {failed && <p role="alert" className="meta">That plan item couldn't be saved. Nothing changed.</p>}
    </section>
  );
}
