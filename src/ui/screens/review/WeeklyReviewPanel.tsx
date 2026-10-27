import { captureFeedback } from "../../feel/feedback";
import { useEffect, useRef, useState } from "react";
import { latestReviewWeek } from "../../../engine/weeklyReview";
import type { WeeklyFocus } from "../../../domain/review/types";
import { getWeeklyReviewState, type WeeklyReviewState } from "../../../application/weeklyReviewQueries";
import { saveWeeklyReview } from "../../../application/weeklyReviewCommands";
import { useSessionDraft } from "../../sessionDrafts";
import { describeError } from "../../errorMessage";

const label = (at: string) => new Date(at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const focusValue = (focus: WeeklyFocus | null) => !focus ? "NONE" : focus.kind === "CUSTOM" ? "CUSTOM" : JSON.stringify(focus);
const days = (n: number, adjective: string) => `${n} ${adjective} ${n === 1 ? "day" : "days"}`;
const number = (n: number | undefined, suffix: string) => n === undefined ? "Not recorded" : `${n.toFixed(1)} ${suffix}`;
/**
 * `showFacts` and `openRequest` let the Weekly Review dashboard embed this form
 * as Carry forward: the dashboard already shows the week's numbers, and its
 * COMPLETE REVIEW button opens the form (each new request opens and focuses it).
 */
export function WeeklyReviewPanel({ active = true, showFacts = true, openRequest = 0 }: { active?: boolean; showFacts?: boolean; openRequest?: number }) {
  const [now, setNow] = useState(() => new Date());
  const weekKey = latestReviewWeek(now).start;
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(new Date());
    tick(); const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [active]);
  const [open, setOpen] = useState(false);
  const summaryRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (openRequest <= 0) return;
    setOpen(true);
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ block: "start" });
      summaryRef.current?.focus({ preventScroll: true });
    });
  }, [openRequest]);
  const readVersion = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [data, setData] = useState<WeeklyReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState("NONE");
  const [writtenFocus, setWrittenFocus] = useState("");
  const [draftWeek, setDraftWeek] = useState<{ start: string; end: string } | null>(null);
  const baseline = useRef({ id: null as string | null, note: "", choice: "NONE", written: "" });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const dirty = note !== baseline.current.note || choice !== baseline.current.choice || writtenFocus !== baseline.current.written;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useSessionDraft("weekly-review", dirty);
  function loadForm(next: WeeklyReviewState) {
    const record = next.saved;
    const values = { id: record?.id ?? null, note: record?.note ?? "", choice: focusValue(record?.focus ?? null), written: record?.focus?.kind === "CUSTOM" ? record.focus.text : "" };
    baseline.current = values;
    setDraftWeek(next.week); setNote(values.note); setChoice(values.choice); setWrittenFocus(values.written);
  }
  useEffect(() => {
    if (!active) return;
    let alive = true; const request = ++readVersion.current;
    setError(null);
    void getWeeklyReviewState().then((next) => {
      if (!alive || request !== readVersion.current) return;
      setData(next);
      // Never overwrite a note or choice on re-entry, including week rollover.
      if (!draftWeek || (!inFlight.current && !dirtyRef.current && draftWeek.start !== next.week.start)) { loadForm(next); setOpen(!next.saved && next.summary.recordedDays > 0); }
    }).catch((cause: unknown) => { if (alive && request === readVersion.current) setError(describeError(cause, "Could not read your weekly review.")); });
    return () => { alive = false; readVersion.current++; };
  }, [active, retry, weekKey]);
  async function save() {
    const acknowledge = captureFeedback();
    if (inFlight.current || !draftWeek) return;
    inFlight.current = true; setBusy(true); setError(null); setReceipt(null);
    try {
      const focus: WeeklyFocus | null = choice === "NONE" ? null : choice === "CUSTOM" ? { kind: "CUSTOM", text: writtenFocus.trim() } : JSON.parse(choice) as WeeklyFocus;
      const receipt = { changed: false };
      const id = await saveWeeklyReview({ weekStart: draftWeek.start, weekEnd: draftWeek.end, note, focus, expectedPreviousId: baseline.current.id }, receipt);
      if (receipt.changed) acknowledge("LIGHT");
      baseline.current = { id, note: note.trim(), choice, written: writtenFocus };
      setNote(note.trim()); setReceipt("Weekly review saved on this device. Your focus is your choice, not a recommendation.");
      window.dispatchEvent(new Event("beyond:weekly-review-saved"));
      if (activeRef.current) {
        const request = ++readVersion.current;
        const next = await getWeeklyReviewState();
        if (request === readVersion.current && activeRef.current) {
          setData(next);
          if (next.week.start !== draftWeek.start) { loadForm(next); setOpen(!next.saved && next.summary.recordedDays > 0); }
          else { setOpen(false); requestAnimationFrame(() => summaryRef.current?.focus({ preventScroll: true })); }
        }
      }
    } catch (cause) { setError(describeError(cause, "Could not save your review. Your draft is still here.")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (!data && !error) return <p role="status">Reading the latest completed week…</p>;
  const differentWeek = data && draftWeek?.start !== data.week.start;
  const options = new Map((data?.options ?? []).map((focus) => [focusValue(focus), focus.text]));
  if (choice !== "NONE" && choice !== "CUSTOM" && !options.has(choice)) options.set(choice, (JSON.parse(choice) as WeeklyFocus).text);
  const summary = data?.summary;
  return <section className="weekly-review" aria-label={showFacts ? "Weekly review" : "Carry forward"}>
    {showFacts && <h2 className="tool-label">WEEKLY REVIEW</h2>}
    {error && <div><p role="alert">{error} {!data ? "Saved evidence is unavailable, not empty." : "Your draft is still here."}</p><button className="btn-secondary" onClick={() => setRetry((n) => n + 1)} disabled={busy}>RETRY WEEKLY REVIEW</button></div>}
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary ref={summaryRef}>{baseline.current.id ? "Saved review" : "Review week"}{data ? ` · starting ${label(data.week.start)}` : ""}</summary>
    {data && <>
      {showFacts && <><p className="card-body">Lived days starting {label(data.week.start)} – {label(new Date(Date.parse(data.week.end) - 86_400_000).toISOString())}. This week closed at {new Date(data.week.end).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.</p>
      <p className="meta">Monday–Sunday, with the Sunday lived day ending Monday at 16:30. Current and unfinished days are excluded. Weekly Check-in keeps its separate rolling window.</p>
      <dl className="weekly-review-facts">
        <div><dt>Weight</dt><dd>{number(summary!.weightMean, "lb")} average · {days(summary!.weightDays, "weighed")}</dd></div>
        <div><dt>Recorded protein</dt><dd>{number(summary!.proteinMean, "g")} average · {days(summary!.proteinDays, "logged")}</dd></div>
        <div><dt>Recorded meals</dt><dd>{number(summary!.calorieMean, "kcal")} average · {days(summary!.mealDays, "logged")}</dd></div>
        <div><dt>Main sleep</dt><dd>{number(summary!.sleepMean, "h")} average · {days(summary!.sleepDays, "unambiguous logged")}</dd></div>
        <div><dt>Training</dt><dd>{summary!.sessions} completed or partial strength sessions</dd></div>
      </dl>
      <p className="meta">{summary!.recordedDays} of 7 days have completed records. Food figures describe logged amounts, not verified total intake. Missing stays missing. Use the question hub below for source-day records.</p></>}
      {data.previousFocus && <div className="equipment-row"><h3>Your previous focus</h3><p className="card-body">{data.previousFocus.text}</p>
        <p className="card-body">{data.previousFocusCount === undefined ? "Written focus: reflect using the recorded evidence; no automatic verdict." : `${data.previousFocusCount} recorded in this week; your chosen count was ${"target" in data.previousFocus ? data.previousFocus.target : "not set"}.`}</p>
        <p className="meta">Counts cover the entire named week, including days before a late review.</p>
      </div>}
      {differentWeek && <div role="status"><p>Your draft belongs to the week starting {draftWeek ? label(draftWeek.start) : "earlier"}. It has been kept. Copy any notes you want before opening the current week.</p>
        <button className="btn-secondary" onClick={() => { if (!dirty || window.confirm("Discard this unfinished review draft and open the current week?")) { loadForm(data); setReceipt(null); setError(null); } }} disabled={busy}>OPEN CURRENT WEEK</button>
      </div>}
      {!differentWeek && data.saved && data.saved.id !== baseline.current.id && <div role="status"><p>A different saved version exists. Your draft has been kept.</p><button className="btn-secondary" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard your unsaved changes and load the saved review?")) { loadForm(data); setError(null); setReceipt(null); } }}>LOAD SAVED VERSION</button></div>}
      {draftWeek && <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label htmlFor="weekly-review-note">What stood out? (optional)</label>
        <textarea id="weekly-review-note" className="input" value={note} maxLength={4000} onChange={(event) => { setNote(event.target.value); setReceipt(null); }} disabled={busy} />
        <label htmlFor="weekly-review-focus">Your focus for the week starting {label(draftWeek.end)}</label>
        <p className="meta">Your choice, not a recommendation. Suggested choices repeat this week’s counts.</p>
        <select id="weekly-review-focus" className="input" value={choice} onChange={(event) => { setChoice(event.target.value); setReceipt(null); }} disabled={busy}>
          <option value="NONE">No focus chosen</option>
          {[...options].map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          <option value="CUSTOM">Write my own focus</option>
        </select>
        {choice === "CUSTOM" && <><label htmlFor="weekly-review-written">Written focus</label><textarea id="weekly-review-written" className="input" value={writtenFocus} maxLength={1000} onChange={(event) => { setWrittenFocus(event.target.value); setReceipt(null); }} disabled={busy} /></>}
        <button type="submit" className="btn-primary" disabled={busy || Boolean(differentWeek) || Boolean(baseline.current.id && !dirty) || (choice === "CUSTOM" && !writtenFocus.trim())}>{busy ? "SAVING…" : baseline.current.id ? "SAVE REVIEW CHANGES" : "SAVE WEEKLY REVIEW"}</button>
        <p className="meta">Changes append a new version; prior notes and choices remain in History and normal backups. Unsaved drafts stay in this session and clear on reload.</p>
      </form>}
      <details><summary>Saved weekly reviews ({data.history.length})</summary>
        {data.history.length ? data.history.map((record) => <article key={record.id} className="equipment-row"><h3>Week starting {label(record.weekStart)}</h3><p className="card-body">{record.note || "No note recorded."}</p><p className="card-body">Focus: {record.focus?.text ?? "None chosen"}</p><p className="meta">Saved {new Date(record.recordedAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}. Original versions remain in History.</p></article>) : <p>No saved weekly reviews yet.</p>}
      </details>
    </>}
    </details>
    {receipt && <p role="status">{receipt}</p>}
  </section>;
}
