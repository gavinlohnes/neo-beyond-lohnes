import { useEffect, useState } from "react";
import { markShiftHandoffRead, noteShiftHandoff } from "../../application/commands";
import { getShiftHandoffState, skipShiftHandoff, type ShiftHandoffState } from "../../application/shiftHandoffQueries";
import { SHIFT_HANDOFF_MAX_LENGTH } from "../../domain/common/types";
import { describeError } from "../errorMessage";

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04): the shift handoff, above
 * TODAY. Right after MARK WORK ENDED it asks "Note for next shift?" (SAVE or
 * SKIP; SKIP writes nothing). On the next work day it shows "From last
 * shift: …" until GOT IT. Renders nothing otherwise. `refreshKey` changes
 * when TODAY ends a work period, so the prompt appears straight away.
 */
export function ShiftHandoff({ refreshKey }: { refreshKey: number }) {
  const [state, setState] = useState<ShiftHandoffState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let current = true;
    void getShiftHandoffState().then((next) => {
      if (current) setState(next);
    });
    return () => {
      current = false;
    };
  }, [refreshKey, loadKey]);

  if (!state || !state.activeDayId) return null;
  const dayId = state.activeDayId;

  async function run(write: () => Promise<unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await write();
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
          disabled={busy || !draft.trim()}
          onClick={() =>
            void run(
              () => noteShiftHandoff(dayId, draft),
              () => {
                setDraft("");
                setSaved(true);
              },
            )
          }
        >
          SAVE
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(async () => skipShiftHandoff(dayId))}>
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
          Saved for your next shift.
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
