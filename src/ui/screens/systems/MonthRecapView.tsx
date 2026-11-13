import { useEffect, useRef, useState } from "react";
import { getMonthRecap, type MonthRecap } from "../../../application/monthRecap";
import { saveCarryForward } from "../../../application/weeklyInterview";
import { describeError } from "../../errorMessage";

/**
 * BIG-IDEAS-001 item 6: "Your month in BEYOND", one card at a time. Read only: nothing is saved, scored or sent.
 * It opens on a tap, so the month view stays as it was until you ask for the recap.
 */
export function MonthRecapView({ year, month }: { year: number; month: number }) {
  const [recap, setRecap] = useState<MonthRecap | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // WEEKLY-CLOSE-001: the last card ends on a choice: carry one thing into next month as a plan item, on CONFIRM.
  const [carry, setCarry] = useState("");
  const [previewCarry, setPreviewCarry] = useState(false);
  const [carried, setCarried] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [carryError, setCarryError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // A different month closes the recap; it reads that month's records when opened again.
  useEffect(() => { setOpen(false); setRecap(null); setIndex(0); setError(null); setCarry(""); setPreviewCarry(false); setCarried(null); setCarryError(null); }, [year, month]);
  useEffect(() => { if (open && recap) cardRef.current?.focus(); }, [open, recap, index]);

  const start = () => {
    setOpen(true); setIndex(0); setError(null);
    void getMonthRecap(year, month).then(setRecap, (e: unknown) => setError(describeError(e, "Could not read this month.")));
  };
  if (!open) return <button type="button" className="btn-secondary" onClick={start}>PLAY YOUR MONTH IN BEYOND</button>;
  if (error) return <p role="alert" className="meta meta--error">{error}</p>;
  if (!recap) return <p className="meta" role="status">Reading…</p>;
  const card = recap.cards[index]!;
  const last = index === recap.cards.length - 1;
  return <section className="cave__block month__recap" aria-label={`Your month in BEYOND · ${recap.title}`}>
    <p className="meta" style={{ margin: 0 }}>Your month in BEYOND · {index + 1} of {recap.cards.length}</p>
    <div ref={cardRef} tabIndex={-1} data-recap-card={card.id} aria-live="polite">
      <h3 className="cave__cap">{card.title}</h3>
      {card.lines.map((line) => <p key={line} className="card-body" style={{ margin: "0 0 6px" }}>{line}</p>)}
    </div>
    {last && <div data-recap-carry style={{ margin: "4px 0 8px" }}>
      <label className="meta-strong" htmlFor="recap-carry" style={{ display: "block", color: "var(--text-1)" }}>What's one thing to carry into next month?</label>
      <p className="meta" style={{ margin: "2px 0 4px" }}>Optional. It becomes a plan item with no day, only when you confirm.</p>
      <textarea id="recap-carry" rows={2} style={{ width: "100%", boxSizing: "border-box" }} value={carry} disabled={saving}
        onChange={(e) => { setCarry(e.target.value); setPreviewCarry(false); setCarried(null); setCarryError(null); }} />
      {previewCarry ? <div role="group" aria-label="Preview" className="equipment-row" style={{ padding: "10px 12px" }}>
        <p className="meta" style={{ margin: 0 }}>Adds this plan item, with no date:</p>
        <p className="meta" style={{ margin: "6px 0" }}>{carry.trim()}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => {
            setSaving(true); setCarryError(null);
            void saveCarryForward(carry, "From your month recap.").then(() => { setCarried(carry.trim()); setPreviewCarry(false); },
              () => setCarryError("That couldn't be saved. Nothing changed.")).finally(() => setSaving(false));
          }}>CONFIRM</button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setPreviewCarry(false)}>CANCEL</button>
        </div>
      </div> : <button type="button" className="btn-secondary" disabled={!carry.trim() || saving || carried !== null} onClick={() => setPreviewCarry(true)}>ADD AS A PLAN ITEM</button>}
      {carried && <p className="meta" role="status">Added plan item: {carried}. It has no day yet; find it in MORE → PLAN TODAY, under No date.</p>}
      {carryError && <p className="meta" role="alert">{carryError}</p>}
    </div>}
    <div className="button-row">
      <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>BACK</button>
      {last ? <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>DONE</button>
        : <button type="button" className="btn-primary" onClick={() => setIndex((i) => i + 1)}>NEXT</button>}
    </div>
    {recap.cards.length === 1 && <p className="meta">More cards appear as you log days: check-ins, workouts, notes and Garmin-timed sleep.</p>}
    <p className="meta">From your records only. Nothing here is saved or sent.</p>
  </section>;
}
