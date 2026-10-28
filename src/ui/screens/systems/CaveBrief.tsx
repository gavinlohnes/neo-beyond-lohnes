import { useEffect, useRef, useState } from "react";
import { describeBrief, getCaveBrief, type CaveBrief, type CheckItem } from "../../../application/caveBrief";
import { markShiftHandoffRead } from "../../../application/commands";
import { recordPreparation } from "../../../application/preparation";
import { MEMORY_LABELS, type MemoryKind } from "../../../domain/memory";
import type { PreparationItem, PreparationValue } from "../../../domain/preparation";
import { describeError } from "../../errorMessage";

/**
 * SUIT-ALIVE S6 — the cave, Brief. Before the shift, PREFLIGHT: a T-minus clock and a GO / HOLD / LATE /
 * ADVISORY poll of every system, each stamped in turn (instantly under reduced motion), with what's open
 * named in the verdict line. Packing and last shift's note can be closed here through their existing
 * commands. After the shift, AFTER-ACTION: planned beside actual, row by row. No score anywhere.
 */
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const tMinus = (to: string, now: Date) => {
  const m = Math.round((Date.parse(to) - now.getTime()) / 60000), a = Math.abs(m);
  return `T${m >= 0 ? "–" : "+"}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
};
const PACK: Partial<Record<CheckItem["key"], PreparationItem>> = { PACK_FOOD: "FOOD", PACK_BOTTLE: "BOTTLE" };

export function CaveBriefView({ now = new Date() }: { now?: Date }) {
  const [brief, setBrief] = useState<CaveBrief | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"PREFLIGHT" | "AFTER" | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const sequence = useRef(0);
  async function load() {
    const request = ++sequence.current;
    setError(null);
    try {
      const b = await getCaveBrief();
      if (request === sequence.current) setBrief(b);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read the brief."));
    }
  }
  useEffect(() => { void load(); }, []);

  async function act(run: () => Promise<unknown>, done: string) {
    if (saving) return;
    setSaving(true); setNotice(null);
    try { await run(); setNotice(done); await load(); }
    catch (e) { setNotice(describeError(e, "Nothing was saved.")); }
    finally { setSaving(false); }
  }
  const pack = (item: PreparationItem, value: PreparationValue) => brief?.prep && act(
    () => recordPreparation({ dayId: brief.dayId, item, value, expectedPreviousId: brief.prep![item].id }),
    `${item === "FOOD" ? "Food" : "Bottle"} recorded. Change it on TODAY any time.`);

  if (error) return <div role="alert"><p className="meta meta--error">{error} The brief is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY</button></div>;
  if (brief === undefined) return <p className="meta" role="status">Reading…</p>;
  if (brief === null) return <p className="cave__sum">No day started, so there's nothing to brief.</p>;
  const shown = view ?? (brief.phase === "AFTER" ? "AFTER" : "PREFLIGHT");
  const allGo = brief.phase !== "AFTER" && brief.phase !== "NO_SHIFT" && brief.open.length === 0;

  return <>
    {brief.shift && <div className="cave__seg" role="group" aria-label="Brief view">
      <button type="button" className="chip" aria-pressed={shown === "PREFLIGHT"} onClick={() => setView("PREFLIGHT")}>PREFLIGHT</button>
      <button type="button" className="chip" aria-pressed={shown === "AFTER"} onClick={() => setView("AFTER")}>AFTER-ACTION</button>
    </div>}

    {shown === "PREFLIGHT" ? <>
      <div className={`brief__lead${allGo ? " brief__lead--go" : ""}`}>
        {brief.shift && brief.phase === "BEFORE" && <p className="brief__t" aria-label={`Shift at ${clock(brief.shift.start)}`}><span>{tMinus(brief.shift.start, now)}</span><small>SHIFT {clock(brief.shift.start)}</small></p>}
        {brief.shift && brief.phase !== "BEFORE" && <p className="brief__t"><span>{clock(brief.shift.start)}–{clock(brief.shift.end)}</span><small>{brief.phase === "ON" ? "ON SHIFT" : "SHIFT DONE"}</small></p>}
        <p className="brief__verdict" role="status">{describeBrief(brief)}</p>
      </div>
      <ol className="brief__poll" aria-label="Systems">
        {brief.items.map((item, i) => (
          <li key={item.key} className={`brief__item brief__item--${item.state.toLowerCase()}`} style={{ animationDelay: `${i * 90}ms` }}>
            <span className="brief__sys">{item.system}</span>
            <span className="brief__state">{item.state}</span>
            <span className="brief__detail">{item.detail}</span>
            {PACK[item.key] && item.state !== "GO" && brief.prep && <span className="brief__acts">
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => void pack(PACK[item.key]!, "READY")}>READY</button>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => void pack(PACK[item.key]!, "NOT_NEEDED")}>NOT NEEDED</button>
            </span>}
            {item.key === "HANDOFF" && brief.handoff && <span className="brief__acts">
              {showNote ? <>
                <q className="brief__note">{brief.handoff.note}</q>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => void act(() => markShiftHandoffRead(brief.dayId, brief.handoff!.eventId), "Note marked read.")}>GOT IT</button>
              </> : <button type="button" className="btn-secondary" onClick={() => setShowNote(true)}>READ IT</button>}
            </span>}
          </li>
        ))}
      </ol>
      {notice && <p className="meta" role="status">{notice}</p>}
      {(brief.lastDebrief || brief.memory.length > 0) && <section className="cave__block" aria-labelledby="brief-intel">
        <h3 id="brief-intel" className="cave__cap">Intel</h3>
        <ul className="cave__facts">
          {brief.lastDebrief && <li>Last shift felt {brief.lastDebrief.felt.toLowerCase()}{brief.lastDebrief.next ? `. You said: "${brief.lastDebrief.next}"` : ""}.</li>}
          {brief.memory.map((m) => <li key={m.statement}>{MEMORY_LABELS[m.kind as MemoryKind] ?? m.kind}: {m.statement}</li>)}
        </ul>
      </section>}
      <p className="meta">GO and HOLD come from what you logged. HOLD turns LATE when the shift starts. ADVISORY means a reading sits outside your own normal; it never blocks anything. Your call.</p>
    </> : brief.aar ? <>
      <p className="brief__verdict">{describeBrief(brief)}</p>
      <div className="brief__aar" role="table" aria-label="After-action: planned and actual">
        <div role="row" className="brief__aar-head"><span role="columnheader"> </span><span role="columnheader">PLANNED</span><span role="columnheader">ACTUAL</span></div>
        {brief.aar.map((r) => (
          <div role="row" key={r.key} className={`brief__aar-row${r.verdict === "OFF_PLAN" ? " brief__aar-row--off" : ""}`}>
            <span role="rowheader">{r.label}</span><span role="cell">{r.planned}</span>
            <span role="cell">{r.actual}{r.verdict === "OFF_PLAN" ? " · off plan" : r.verdict === "ON_PLAN" ? " · on plan" : ""}</span>
          </div>
        ))}
      </div>
      <p className="meta">Planned is your schedule, your usual pace and your usual sleep, not orders. Close the shift on TODAY to carry a note forward.</p>
    </> : <p className="cave__sum">The after-action report opens when the shift ends{brief.shift ? `, at ${clock(brief.shift.end)}` : ""}.</p>}
  </>;
}
