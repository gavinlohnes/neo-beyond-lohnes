import { useEffect, useState } from "react";
import { getShiftSleepPlan, saveShiftPlanCard, type PlanCard, type PlanCardKind, type ShiftSleepPlan } from "../../../application/shiftSleepPlan";
import { CaffeineCutoff } from "./CaffeineCutoff";
import { FlipSettings } from "./FlipSettings";
import { takeFlipFocus } from "./flipFocus";
import { getFlipPlan, type FlipPlan } from "../../../application/flipPlan";
import { getFlipSettingsView } from "../../../application/sleepPlanSettings";

/**
 * CIRCADIAN-SPIKE-001: the next shift transition's cards, in ROUTE. Shift-work guidance, not a decision. SAVE shows
 * a preview first and then adds one plan item (planned, never due); SKIP hides that card for that shift on this
 * device. Nothing else is written, and the Engine never sees the cards. C4.2a: the CAFFEINE card also shows where its
 * number comes from, lets him CHANGE it explicitly; a change redraws the cards.
 */
import { readSkip, skipKey, writeSkip } from "./planSkips";
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function ShiftSleepPlanCards({ now }: { now?: Date | undefined }) {
  const [plan, setPlan] = useState<ShiftSleepPlan | null | undefined>(undefined);
  const [preview, setPreview] = useState<PlanCardKind | null>(null);
  const [saved, setSaved] = useState<Partial<Record<PlanCardKind, true>>>({});
  const [skipped, setSkipped] = useState<Partial<Record<PlanCardKind, true>>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  // GRAYSON-FLIP-PLAN-001: the flip card is read beside the plan, and stays after the shift ends (the plan doesn't).
  const [flip, setFlip] = useState<FlipPlan | null>(null);
  // With flip plans off there's no card, so their switch stays reachable here.
  const [flipOff, setFlipOff] = useState(false);
  useEffect(() => {
    let current = true;
    void getShiftSleepPlan(now).then((next) => { if (current) setPlan(next); }).catch(() => { if (current) setPlan(null); });
    void getFlipPlan(now).then((next) => { if (current) setFlip(next); }).catch(() => { if (current) setFlip(null); });
    void getFlipSettingsView().then((v) => { if (current) setFlipOff(!v.settings.show); }).catch(() => { if (current) setFlipOff(false); });
    return () => { current = false; };
  }, [now, reload]);
  useEffect(() => {
    if (flip && takeFlipFocus()) { const card = document.getElementById("flip-plan-card"); card?.scrollIntoView({ block: "start" }); card?.focus(); }
  }, [flip]);
  const flipCard = flip && !skipped[flip.kind] && !readSkip(skipKey(flip.date, flip.kind)) ? flip.card : null;
  if (!plan && !flipCard && !flipOff) return null;
  const visible = plan ? plan.cards.filter((c) => !skipped[c.kind] && !readSkip(skipKey(plan.shift.date, c.kind))) : [];
  const shown = flipCard ? [...visible, flipCard] : visible;

  const confirm = async (card: PlanCard) => {
    setBusy(true); setFailed(false);
    try { await saveShiftPlanCard(card); setSaved((s) => ({ ...s, [card.kind]: true })); setPreview(null); }
    catch { setFailed(true); } finally { setBusy(false); }
  };

  return (
    <section data-shift-sleep-plan aria-labelledby="shift-sleep-plan-heading" style={{ marginTop: 14 }}>
      <p id="shift-sleep-plan-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>
        {plan ? <>NEXT SHIFT · {new Date(plan.shift.start).toLocaleDateString("en-US", { weekday: "short" })} {clock(plan.shift.start)}–{clock(plan.shift.end)}</> : "THE ROTATION FLIP"}
      </p>
      <p className="meta" style={{ margin: "2px 0 6px" }}>Shift-work guidance, not a decision. Not medical advice, and BEYOND's recommendation doesn't use it.</p>
      {plan && shown.length === 0 && <p className="meta">All skipped for this shift.</p>}
      {shown.map((card) => (
        <div key={card.kind} data-plan-card={card.kind} id={card === flipCard ? "flip-plan-card" : undefined} tabIndex={card === flipCard ? -1 : undefined} className="equipment-row" style={{ marginBottom: 6, padding: "10px 12px" }}>
          <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{card.title}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.detail}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>{card.basis}</p>
          {card.source && <p className="meta" style={{ margin: "2px 0 0" }}>Source: <a href={card.source.url} target="_blank" rel="noreferrer">{card.source.label}</a>{card.source.checked ? ` · ${card.source.checked}` : ""}</p>}
          {card.kind === "CAFFEINE" && <CaffeineCutoff onChanged={() => setReload((r) => r + 1)} />}
          {card === flipCard && <FlipSettings onChanged={() => setReload((r) => r + 1)} />}
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
                  <button type="button" className="btn-secondary" disabled={busy} aria-label={`Skip ${card.title}`} onClick={() => { writeSkip(skipKey(card === flipCard ? flip!.date : plan!.shift.date, card.kind)); setSkipped((s) => ({ ...s, [card.kind]: true })); }}>SKIP</button>
                </div>}
        </div>
      ))}
      {flipOff && <div data-flip-off className="equipment-row" style={{ marginBottom: 6, padding: "10px 12px" }}>
        <p className="meta" style={{ margin: 0 }}>Flip plans are off.</p>
        <FlipSettings onChanged={() => setReload((r) => r + 1)} />
      </div>}
      {failed && <p role="alert" className="meta">That plan item couldn't be saved. Nothing changed.</p>}
    </section>
  );
}
