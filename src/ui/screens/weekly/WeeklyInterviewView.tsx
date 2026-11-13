import { useEffect, useState } from "react";
import {
  getTimelineEntries, getWeeklyInterview, learnedThisWeek, interviewNoteDay, interviewNoteText, saveCarryForward, saveInterviewNote,
  TIMELINE_TAG, type InterviewQuestion, type TimelineDay, type WeeklyInterview,
} from "../../../application/weeklyInterview";
import { describeLearning, useDeltaKnowledge } from "../../components/DeltaViews";

/**
 * BIG-IDEAS-001 item 5: the week as recorded, then a short interview. Nothing is written until CONFIRM: the answers
 * go into a daily note tagged #timeline, and the carry-forward answer becomes a plan item only on its own CONFIRM.
 */
type Answers = Partial<Record<InterviewQuestion["id"], string>>;
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function dayFacts(d: TimelineDay): string {
  if (!d.dayId) return "Not recorded";
  const parts = [d.context === "WORK" ? "Shift" : d.context === "OFF" ? "Day off" : "Work or off not recorded"];
  if (d.sleepHours !== undefined) parts.push(`sleep ${d.sleepHours.toFixed(1)} h`);
  if (d.napMinutes) parts.push(`nap ${d.napMinutes} min`);
  if (d.energy !== undefined) parts.push(`energy ${d.energy} of 5`);
  if (d.workouts) parts.push(`${d.workouts} workout${d.workouts === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/** WEEKLY-CLOSE-001: onOpenPlanItem opens the saved carry-forward in your plans, to give it a day; left out without it. */
export function WeeklyInterviewView({ now, onOpenDelta, onOpenPatterns, onOpenPlanItem }: { now?: Date | undefined; onOpenDelta?: () => void; onOpenPatterns?: () => void; onOpenPlanItem?: (obligationId: string) => void }) {
  const [interview, setInterview] = useState<WeeklyInterview | null | undefined>(undefined);
  const [entries, setEntries] = useState<{ dayId: string; text: string; updatedAt: string }[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [preview, setPreview] = useState<{ kind: "NOTE"; text: string; dayId: string; date: string } | { kind: "PLAN"; text: string } | null>(null);
  const [done, setDone] = useState<{ note?: string; plan?: string; planId?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knowledge = useDeltaKnowledge(true);

  const loadEntries = () => void getTimelineEntries().then(setEntries).catch(() => {});
  useEffect(() => {
    let current = true;
    void getWeeklyInterview(now).then((next) => { if (current) setInterview(next); }).catch(() => { if (current) setInterview(null); });
    loadEntries();
    return () => { current = false; };
  }, [now]);

  if (interview === undefined) return <p className="meta" role="status">Loading…</p>;
  if (interview === null) return <p className="meta">No finished days yet, so there's no week to look back on. Come back after your first day ends.</p>;

  const noteText = interviewNoteText(interview, answers);
  const carry = answers.CARRY?.trim();
  const confirm = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      if (preview.kind === "NOTE") { await saveInterviewNote(preview.dayId, preview.text); setDone((d) => ({ ...d, note: day(preview.date) })); loadEntries(); }
      else { const item = await saveCarryForward(preview.text); setDone((d) => ({ ...d, plan: preview.text, planId: item.id })); }
      setPreview(null);
    } catch { setError("That couldn't be saved. Nothing changed."); } finally { setBusy(false); }
  };

  return (
    <div data-weekly-interview>
      <section aria-labelledby="week-timeline-heading">
        <p id="week-timeline-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>THE WEEK AS RECORDED · {day(interview.from)} – {day(interview.to)}</p>
        {interview.days.every((d) => !d.dayId) && <p className="meta" style={{ margin: "2px 0 0" }}>Nothing on record this week yet. Start a day on TODAY and log as you go; this fills in.</p>}
        <ol style={{ listStyle: "none", padding: 0, margin: "6px 0 12px" }}>
          {interview.days.map((d) => (
            <li key={d.date} data-timeline-day={d.date} className="equipment-row" style={{ marginBottom: 6, padding: "8px 12px" }}>
              <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{day(d.date)}</p>
              <p className="meta" style={{ margin: "2px 0 0" }}>{dayFacts(d)}</p>
              {d.note && <p className="meta" style={{ margin: "2px 0 0" }}>Note: {d.note}</p>}
              {d.tags.length > 0 && <p className="meta" style={{ margin: "2px 0 0" }}>{d.tags.map((t) => `#${t}`).join(" ")}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* REFLECT-001: what the week's notes and records already taught DELTA, read only, before the questions. */}
      <section aria-labelledby="week-noticed-heading" style={{ marginBottom: 12 }}>
        <p id="week-noticed-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>WHAT THIS WEEK SHOWED</p>
        {(() => {
          const tags = new Map<string, number>();
          for (const d of interview.days) for (const t of d.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
          const noted = interview.days.filter((d) => d.note).length;
          const learned = knowledge && knowledge !== "ERROR" ? learnedThisWeek(knowledge.learnings, interview) : [];
          return <>
            <p className="meta" style={{ margin: "2px 0 0" }}>{noted} of {interview.days.length} days have a note{tags.size ? ` · tags: ${[...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => `#${t} ${n} ${n === 1 ? "day" : "days"}`).join(", ")}` : ""}.</p>
            {learned.map((l) => <p key={l.id} className="meta" style={{ margin: "2px 0 0" }}>DELTA learned: {describeLearning(l)}</p>)}
            {knowledge && knowledge !== "ERROR" && !learned.length && <p className="meta" style={{ margin: "2px 0 0" }}>DELTA learned nothing new this week.</p>}
            {(onOpenDelta || onOpenPatterns) && <div className="button-row" style={{ marginTop: 6 }}>
              {onOpenDelta && <button type="button" className="btn-secondary" onClick={onOpenDelta}>SEE ALL OF DELTA</button>}
              {onOpenPatterns && <button type="button" className="btn-secondary" onClick={onOpenPatterns}>SEE PATTERNS</button>}
            </div>}
          </>;
        })()}
      </section>

      <section aria-labelledby="week-interview-heading">
        <p id="week-interview-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>WEEKLY INTERVIEW</p>
        <p className="meta" style={{ margin: "2px 0 8px" }}>Four short questions from this week's records. Answer any you like; nothing is saved until you confirm.</p>
        {interview.questions.map((q) => (
          <div key={q.id} style={{ marginBottom: 10 }}>
            <label className="meta-strong" htmlFor={`interview-${q.id}`} style={{ display: "block", color: "var(--text-1)" }}>{q.text}</label>
            <p className="meta" style={{ margin: "2px 0 4px" }}>{q.why}</p>
            <textarea id={`interview-${q.id}`} rows={2} style={{ width: "100%", boxSizing: "border-box" }} value={answers[q.id] ?? ""}
              onChange={(e) => { const v = e.target.value; setAnswers((a) => ({ ...a, [q.id]: v })); setPreview(null); setDone(({ note: _saved, ...rest }) => rest); }} />
          </div>
        ))}

        {preview ? (
          <div role="group" aria-label="Preview" className="equipment-row" style={{ padding: "10px 12px" }}>
            <p className="meta" style={{ margin: 0 }}>{preview.kind === "NOTE" ? `Adds this to the note for ${day(preview.date)}. The note's existing text stays.` : "Adds this plan item, with no date:"}</p>
            <pre className="meta" style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{preview.text}</pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void confirm()}>CONFIRM</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPreview(null)}>CANCEL</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Review of #479: once saved, SAVE TO NOTE waits for a changed answer, so a block isn't added twice by accident. */}
            <button type="button" className="btn-secondary" disabled={!noteText || busy || !!done.note}
              onClick={() => void interviewNoteDay(interview).then((target) => { if (target && noteText) setPreview({ kind: "NOTE", text: noteText, ...target }); else setError("There's no lived day to add the note to."); })}>
              SAVE TO NOTE
            </button>
            <button type="button" className="btn-secondary" disabled={!carry || busy} onClick={() => carry && setPreview({ kind: "PLAN", text: carry })}>ADD CARRY-FORWARD AS A PLAN ITEM</button>
          </div>
        )}
        {/* GUIDED-001: one quiet line naming the next step, so a disabled button never leaves you guessing. */}
        {!preview && (() => {
          const next = !noteText ? "Answer any question to save it to your note."
            : !done.note ? `Next: SAVE TO NOTE shows exactly what will be added before anything saves.${carry ? "" : " To carry something into next week as a plan, answer the last question too."}`
            : carry && !done.plan ? "Saved. Your carry-forward can also become a plan item, if you want one."
            : null;
          return next ? <p className="meta" data-interview-next style={{ margin: "6px 0 0" }}>{next}</p> : null;
        })()}
        {done.note && <p className="meta" role="status">Saved to the note for {done.note}, tagged #{TIMELINE_TAG}.</p>}
        {done.plan && <p className="meta" role="status">Added plan item: {done.plan}. It has no day yet; give it one in your plans, or leave it.</p>}
        {done.planId && onOpenPlanItem && <button type="button" className="btn-secondary" onClick={() => onOpenPlanItem(done.planId!)}>OPEN THE PLAN ITEM</button>}
        {/* WEEKLY-CLOSE-001: once what you chose is saved, say the week is closed and where it went. */}
        {done.note && (done.plan || !carry) && <p className="meta-strong" data-week-closed style={{ margin: "8px 0 0", color: "var(--text-1)" }}>
          Week closed. Your answers are in the note for {done.note}{done.plan ? `, and “${done.plan}” is in your plans` : ""}.
        </p>}
        {error && <p className="meta" role="alert">{error}</p>}
      </section>

      <section aria-labelledby="timeline-entries-heading" style={{ marginTop: 12 }}>
        <p id="timeline-entries-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>PAST INTERVIEWS</p>
        {entries.length === 0
          ? <p className="meta">None yet. Saved interviews appear here, newest first, and search finds them.</p>
          : entries.map((e) => (
              <pre key={e.dayId} data-timeline-entry className="meta" style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{e.text.slice(Math.max(0, e.text.search(new RegExp(`#${TIMELINE_TAG}\\b`, "i"))))}</pre>
            ))}
      </section>
    </div>
  );
}
