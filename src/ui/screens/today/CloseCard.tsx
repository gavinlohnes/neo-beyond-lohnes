import { useEffect, useState } from "react";
import { CARRY_CHANGED, completeCarriedTask, getUnfinishedPlans, setCarriedPlannedDay, type UnfinishedPlans } from "../../../application/dayClose";
import type { Obligation } from "../../../domain/intent/types";
import { CLOSE_GAP_WEIGH_MAX, CLOSE_GAP_WEIGH_MIN, CLOSE_PROMPTS, MAX_CLOSE_PROMPTS, closeNoteText, getCloseGaps, getDayClose, saveCloseNote, type CloseGaps, type ClosePromptId } from "../../../application/dayClose";
import { askAlfred } from "../../components/AlfredSheet";
import { closeDone, markCloseDone, readCloseCarryOn, readCloseGapSettings, readClosePrompts, writeCloseCarryOn, writeCloseGapSettings, writeClosePrompts } from "./closeStore";
import { readLogNudgeSettings } from "./logNudgeStore";

/**
 * GRAYSON C1.3 + C1.4 (Gavin, 2026-11-20): after SHIFT DOWN, a quiet, optional close. What's next when it differs,
 * up to two short prompts he picked once, SAVE TO NOTE or SKIP. Nothing is written unless he saves; the answers land
 * in that day's Daily Note as a #close block. No red: it never competes with the day's real next step.
 */
export function CloseCard({ dayId, busy, onClosed }: { dayId: string; busy: boolean; onClosed: () => void }) {
  const [view, setView] = useState<{ label: string; next: string | null } | null>(null);
  const [prompts, setPrompts] = useState<ClosePromptId[]>(() => readClosePrompts());
  const [answers, setAnswers] = useState<Partial<Record<ClosePromptId, string>>>({});
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // GRAYSON-CLOSE-GAPS-001: what didn't get logged, read when the close opens and whenever his gap settings change.
  const [gapSettings, setGapSettings] = useState(() => readCloseGapSettings());
  const [gaps, setGaps] = useState<CloseGaps | null>(null);
  const [carryOn, setCarryOn] = useState(() => readCloseCarryOn());

  useEffect(() => {
    let cancelled = false;
    void getDayClose().then((c) => { if (!cancelled && c && c.dayId === dayId) setView({ label: c.label, next: c.next }); }, () => { if (!cancelled) setView({ label: "", next: null }); });
    return () => { cancelled = true; };
  }, [dayId]);
  useEffect(() => {
    let cancelled = false;
    void getCloseGaps(dayId, gapSettings, readLogNudgeSettings()).then((g) => { if (!cancelled) setGaps(g); }, () => { if (!cancelled) setGaps(null); });
    return () => { cancelled = true; };
  }, [dayId, gapSettings.enabled, gapSettings.weighGapDays]);

  if (closeDone(dayId)) return null;
  const finish = () => { markCloseDone(dayId); onClosed(); };
  const save = async () => {
    if (saving) return;
    const block = closeNoteText(view?.label ?? "", prompts.map((id) => ({ prompt: CLOSE_PROMPTS[id], answer: answers[id] ?? "" })));
    if (!block) { finish(); return; }
    setSaving(true); setError(null);
    try { await saveCloseNote(dayId, block); finish(); }
    catch { setError("The note didn't save. Your answers are still here; try again."); }
    finally { setSaving(false); }
  };
  const toggle = (id: ClosePromptId) => {
    const next = prompts.includes(id) ? prompts.filter((p) => p !== id) : [...prompts, id].slice(-MAX_CLOSE_PROMPTS);
    if (next.length === 0) return;
    setPrompts(next); writeClosePrompts(next);
  };
  const changeGaps = (next: typeof gapSettings) => { setGapSettings(next); writeCloseGapSettings(next); };
  const gapText = gaps?.gaps.map((g) => g.text).join(" ");

  return (
    <section className="today-close" aria-label="Close the day">
      <div className="today-close__head">
        <h2 className="today-close__label">CLOSE THE DAY</h2>
        <span className="today-close__hint">Under a minute. Skip anytime.</span>
      </div>
      {/* GRAYSON-CLOSE-GAPS-001: one muted line, no red, no counts; the tap opens Delta with the words ready, nothing sent. */}
      {gapSettings.enabled && gaps && gapText && <button type="button" className="today-close__gaps" aria-label={`${gapText} Tell Delta`}
        onClick={() => askAlfred(gaps.ask)}>{gapText} <span aria-hidden="true">TELL DELTA</span></button>}
      {view?.next && <p className="today-close__next">{view.next}</p>}
      {carryOn && !choosing && <CarryBlock dayId={dayId} busy={busy || saving} />}
      {choosing ? (
        <fieldset className="today-close__choose">
          <legend>Pick up to two questions. They stay until you change them.</legend>
          {(Object.keys(CLOSE_PROMPTS) as ClosePromptId[]).map((id) => (
            <label key={id}><input type="checkbox" checked={prompts.includes(id)} onChange={() => toggle(id)} /> {CLOSE_PROMPTS[id]}</label>
          ))}
          <label><input type="checkbox" checked={gapSettings.enabled} onChange={() => changeGaps({ ...gapSettings, enabled: !gapSettings.enabled })} /> Tell me what's missing</label>
          <label><input type="checkbox" checked={carryOn} onChange={() => { setCarryOn(!carryOn); writeCloseCarryOn(!carryOn); }} /> Show "Didn't get to"</label>
          {gapSettings.enabled && <label className="today-close__gapdays">Weigh-in gap, days ({CLOSE_GAP_WEIGH_MIN}–{CLOSE_GAP_WEIGH_MAX})
            <input type="number" inputMode="numeric" min={CLOSE_GAP_WEIGH_MIN} max={CLOSE_GAP_WEIGH_MAX} value={gapSettings.weighGapDays}
              onChange={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= CLOSE_GAP_WEIGH_MIN && v <= CLOSE_GAP_WEIGH_MAX) changeGaps({ ...gapSettings, weighGapDays: v }); }} /></label>}
          <button type="button" className="btn-secondary" onClick={() => setChoosing(false)}>DONE</button>
        </fieldset>
      ) : prompts.map((id) => (
        <label key={id} className="today-close__field">
          <span>{CLOSE_PROMPTS[id]}</span>
          <textarea id={`close-${id}`} rows={2} maxLength={1000} value={answers[id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [id]: e.target.value }))} />
        </label>
      ))}
      {error && <p role="alert" className="meta">{error}</p>}
      {!choosing && <div className="today-close__acts">
        <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void save()}>SAVE TO NOTE</button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={finish}>SKIP</button>
        <button type="button" className="today-close__change" onClick={() => setChoosing(true)}>CHANGE QUESTIONS</button>
      </div>}
    </section>
  );
}

type CarryRow = { task: Obligation; plannedLabel: string; state?: { kind: "NEXT" | "NONE"; saved: Obligation; previous: string } | { kind: "DONE" } | undefined; confirming?: boolean; error?: string | undefined };
const CARRY_MAX_ROWS = 5;
const dayName = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y!, m! - 1, d!, 12).toLocaleDateString("en-US", { weekday: "short" }); };

/**
 * GRAYSON-CARRY-001: "Didn't get to". What he planned and didn't finish, up to 5 rows, oldest planned first, each one
 * tap: NEXT DAY, NO DAY or DONE. NEXT DAY and NO DAY can be undone until the close is finished; DONE asks once first,
 * because completing a task can't be undone in BEYOND. Ignoring the block changes nothing. Muted, no red, no count of
 * misses beyond the heading.
 */
function CarryBlock({ dayId, busy }: { dayId: string; busy: boolean }) {
  const [plans, setPlans] = useState<{ nextDate: string; rows: CarryRow[]; more: number } | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getUnfinishedPlans().then((p: UnfinishedPlans | null) => {
      if (cancelled || !p || !p.rows.length) { if (!cancelled) setPlans(null); return; }
      setPlans({ nextDate: p.nextDate, rows: p.rows.slice(0, CARRY_MAX_ROWS), more: Math.max(0, p.rows.length - CARRY_MAX_ROWS) });
    }, () => { if (!cancelled) setPlans(null); });
    return () => { cancelled = true; };
  }, [dayId]);
  if (!plans) return null;
  const update = (id: string, change: Partial<CarryRow>) => setPlans((p) => p && { ...p, rows: p.rows.map((r) => r.task.id === id ? { ...r, ...change } : r) });
  const run = async (row: CarryRow, action: () => Promise<Partial<CarryRow>>) => {
    if (working) return;
    setWorking(true);
    try { update(row.task.id, { ...(await action()), error: undefined, confirming: false }); }
    catch (cause) { update(row.task.id, { error: cause instanceof Error && cause.message === CARRY_CHANGED ? CARRY_CHANGED : "That didn't save. Nothing changed.", confirming: false }); }
    finally { setWorking(false); }
  };
  const expected = (t: Obligation) => ({ updatedAt: t.updatedAt, plannedAt: t.plannedAt });
  const move = (row: CarryRow, to: string | null) => run(row, async () => {
    const saved = await setCarriedPlannedDay(row.task.id, to, expected(row.task));
    return { state: { kind: to ? "NEXT" : "NONE", saved, previous: row.task.plannedAt! } };
  });
  const undo = (row: CarryRow) => { const s = row.state; if (!s || s.kind === "DONE") return; void run(row, async () => {
    const task = await setCarriedPlannedDay(row.task.id, s.previous, expected(s.saved));
    return { task, state: undefined };
  }); };
  const off = busy || working;
  const heading = `Didn't get to (${plans.rows.length + plans.more})`;
  return <div className="today-close__carry" role="group" aria-label={heading}>
    <p className="today-close__carry-head">{heading}</p>
    <ul>
      {plans.rows.map((row) => <li key={row.task.id} className="today-close__carry-row">
        <span className="today-close__carry-title">{row.task.title} <span className="today-close__carry-day">planned {row.plannedLabel}</span></span>
        {row.state ? <span className="today-close__carry-acts">
          <span role="status">{row.state.kind === "NEXT" ? `Planned for ${dayName(plans.nextDate)}.` : row.state.kind === "NONE" ? "No day now. It's under No date in PLANS." : "Done."}</span>
          {row.state.kind !== "DONE" && <button type="button" className="btn-secondary" disabled={off} aria-label={`Undo: ${row.task.title}`} onClick={() => undo(row)}>UNDO</button>}
        </span> : row.confirming ? <span className="today-close__carry-acts" role="group" aria-label={`Mark done: ${row.task.title}`}>
          <span>Mark it done? This can't be undone.</span>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => void run(row, async () => { await completeCarriedTask(row.task.id, expected(row.task)); return { state: { kind: "DONE" } }; })}>YES, DONE</button>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => update(row.task.id, { confirming: false })}>NOT YET</button>
        </span> : <span className="today-close__carry-acts" role="group" aria-label={`What to do with: ${row.task.title}`}>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => void move(row, plans.nextDate)}>NEXT DAY</button>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => void move(row, null)}>NO DAY</button>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => update(row.task.id, { confirming: true })}>DONE</button>
        </span>}
        {row.error && <span role="alert" className="today-close__carry-day">{row.error}</span>}
      </li>)}
    </ul>
    {plans.more > 0 && <p className="today-close__carry-day">and {plans.more} more in PLANS</p>}
  </div>;
}
