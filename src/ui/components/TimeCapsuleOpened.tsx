import { useEffect, useState } from "react";
import { markTimeCapsuleOpened } from "../../application/timeCapsuleCommands";
import { getTimeCapsules, type OpenedCapsule } from "../../application/timeCapsuleQueries";
import { describeError } from "../errorMessage";

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): a time capsule whose day has
 * come shows above TODAY ("A note from Jul 4 opened today") until GOT IT. One
 * at a time, oldest first. Renders nothing when none are due.
 */
export function TimeCapsuleOpened() {
  const [due, setDue] = useState<OpenedCapsule[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void getTimeCapsules().then((state) => {
      if (current) setDue(state.due);
    });
    return () => {
      current = false;
    };
  }, []);

  const capsule = due?.[0];
  if (!capsule) return null;

  async function gotIt(c: OpenedCapsule) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await markTimeCapsuleOpened(c.eventId);
      setDue((prev) => (prev ? prev.slice(1) : prev));
    } catch (e) {
      setError(describeError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="shift-handoff" aria-label="Time capsule">
      <div className="shift-handoff__card shift-handoff__card--unread" role="status">
        <p className="tool-label" style={{ marginBottom: 4 }}>
          TIME CAPSULE · A NOTE FROM {formatSealed(capsule.sealedAt)}
        </p>
        <p className="card-body shift-handoff__note">{capsule.note}</p>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void gotIt(capsule)}>
          GOT IT
        </button>
        {error && (
          <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function formatSealed(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}
