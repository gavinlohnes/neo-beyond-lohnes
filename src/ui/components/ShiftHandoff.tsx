import { captureCommitFeedback } from "../feel/feedback";
import { useEffect, useState } from "react";
import { markShiftHandoffRead, noteShiftHandoff } from "../../application/commands";
import { getShiftHandoffState, skipShiftHandoff, type ShiftHandoffState } from "../../application/shiftHandoffQueries";
import { SHIFT_HANDOFF_MAX_LENGTH } from "../../domain/common/types";
import { describeError } from "../errorMessage";
import type { DecisionJournalEntry } from "../../domain/journal/types";
import { DEBRIEF_OUTCOMES, SHIFT_FELT, answerFollowUp, closeShift, getDebriefForNote, type ShiftFelt } from "../../application/reflect";
import "../screens/today/reflect.css";

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04): the shift handoff, above
 * TODAY. Right after MARK WORK ENDED it asks "Note for next shift?" (SAVE or
 * SKIP; SKIP writes nothing). On the next work day it shows "From last
 * shift: …" until GOT IT. Renders nothing otherwise. `refreshKey` changes
 * when TODAY ends a work period, so the prompt appears straight away.
 *
 * LOOP-002 (owner approval 2026-10-27): the same prompt asks "How was it?" (optional), which saves
 * the shift debrief with the note as its plan; the next shift's "From last shift" asks whether it
 * happened, and one tap answers it and marks the note read. GOT IT alone still works.
 */
export function ShiftHandoff({ refreshKey }: { refreshKey: number }) {
  const [state, setState] = useState<ShiftHandoffState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<false | "NOTE" | "FELT">(false);
  const [loadKey, setLoadKey] = useState(0);
  const [felt, setFelt] = useState<ShiftFelt | null>(null);
  const [debrief, setDebrief] = useState<DecisionJournalEntry | null>(null);

  useEffect(() => {
    let current = true;
    void getShiftHandoffState().then(async (next) => {
      // The debrief is optional context: a failed read leaves the plain handoff in place.
      const plan = next.unread ? (await getDebriefForNote(next.unread.notedAt).catch(() => undefined)) ?? null : null;
      if (current) { setState(next); setDebrief(plan); }
    });
    return () => {
      current = false;
    };
  }, [refreshKey, loadKey]);

  if (!state || !state.activeDayId) return null;
  const dayId = state.activeDayId;

  async function run(write: () => Promise<unknown>, after?: () => void, committed = true) {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await write();
      if (committed) acknowledge("LIGHT");
      after?.();
      setLoadKey((k) => k + 1);
    } catch (e) {
      setError(describeError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const prompt = state.prompt && (
    <div className="shift-handoff__card">
      <p className="tool-label" id="shift-handoff-felt" style={{ marginBottom: 6 }}>HOW WAS IT?</p>
      <div className="reflect-chips" role="group" aria-labelledby="shift-handoff-felt" style={{ marginBottom: 10 }}>
        {SHIFT_FELT.map((f) => <button key={f} type="button" className={`chip ${felt === f ? "chip--selected" : ""}`} aria-pressed={felt === f} disabled={busy} onClick={() => setFelt(felt === f ? null : f)}>{f}</button>)}
      </div>
      <label className="tool-label" htmlFor="shift-handoff-note" style={{ display: "block", marginBottom: 6 }}>
        NOTE FOR NEXT SHIFT?
      </label>
      <input
        id="shift-handoff-note"
        className="input"
        type="text"
        maxLength={SHIFT_HANDOFF_MAX_LENGTH}
        placeholder="e.g. Truck 12 brakes still soft, check first thing"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="shift-handoff__actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || (!draft.trim() && !felt)}
          onClick={() =>
            void run(
              () => felt ? closeShift(dayId, { felt, note: draft }) : noteShiftHandoff(dayId, draft),
              () => {
                setSaved(draft.trim() ? "NOTE" : "FELT");
                setDraft("");
                setFelt(null);
              },
            )
          }
        >
          SAVE
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(async () => skipShiftHandoff(dayId), undefined, false)}>
          SKIP
        </button>
      </div>
    </div>
  );

  const unread = state.unread && (
    <div className="shift-handoff__card shift-handoff__card--unread" role="status">
      <p className="tool-label" style={{ marginBottom: 4 }}>
        FROM LAST SHIFT · {formatNoted(state.unread.notedAt)}
      </p>
      <p className="card-body shift-handoff__note">{state.unread.note}</p>
      {debrief && <div className="reflect" style={{ marginTop: 0, marginBottom: 8 }}>
        <p className="meta" id="shift-handoff-happened">{debrief.decision} last time. Did this happen?</p>
        <div className="reflect-chips" role="group" aria-labelledby="shift-handoff-happened">
          {DEBRIEF_OUTCOMES.map((o) => <button key={o} type="button" className="chip" disabled={busy}
            onClick={() => void run(async () => { await answerFollowUp(debrief.id, o); await markShiftHandoffRead(dayId, state.unread!.eventId); })}>{o}</button>)}
        </div>
      </div>}
      <button
        type="button"
        className="btn-secondary"
        disabled={busy}
        onClick={() => void run(() => markShiftHandoffRead(dayId, state.unread!.eventId))}
      >
        GOT IT
      </button>
    </div>
  );

  if (!prompt && !unread && !saved && !error) return null;

  return (
    <section className="shift-handoff" aria-label="Shift handoff">
      {unread}
      {prompt}
      {saved && !state.prompt && (
        <p className="meta" role="status" style={{ margin: 0 }}>
          {saved === "NOTE" ? "Saved for your next shift." : "Saved to your journal."}
        </p>
      )}
      {error && (
        <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </section>
  );
}

function formatNoted(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
