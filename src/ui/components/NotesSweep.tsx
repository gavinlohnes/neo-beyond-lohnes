import { useEffect, useState } from "react";
import type { CaptureItem } from "../../domain/common/types";
import { deleteCaptureItem, resolveCaptureItem, restoreCaptureItem } from "../../application/commands";
import { convertCaptureToObligation } from "../../application/intentCommands";
import { getNotesSweepState } from "../../application/notesSweepQueries";
import { describeError } from "../errorMessage";
import { HoldButton } from "./HoldButton";

type Outcome = "DONE" | "TASK" | "KEPT" | "DELETED";

/**
 * NOTES-SWEEP-001 (owner brief 2026-10-04; choices DONE / MAKE IT A TASK /
 * KEEP plus DELETE): on a day off, one line above TODAY offers a sweep of the
 * open captured notes, one at a time. Every choice uses the existing capture
 * and obligation commands; KEEP writes nothing; DELETE needs a hold and can
 * be undone until the sweep moves on. Renders nothing on work days or with
 * no notes waiting. `onSwept` lets TODAY refresh its own capture count.
 */
export function NotesSweep({ onSwept, refreshKey = 0 }: { onSwept: () => void; refreshKey?: number }) {
  const [items, setItems] = useState<CaptureItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [deleted, setDeleted] = useState<CaptureItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let current = true;
    void getNotesSweepState().then((state) => {
      if (current) setItems(state.dayOff ? state.items : []);
    });
    return () => {
      current = false;
    };
  }, [loadKey, refreshKey]);

  if (!items || (items.length === 0 && outcomes.length === 0)) return null;

  const finished = open && index >= items.length;
  const note = items[index];

  async function act(outcome: Outcome, write: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await write();
      setOutcomes((prev) => [...prev, outcome]);
      setIndex((i) => i + 1);
    } catch (e) {
      setError(describeError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: CaptureItem) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const removed = await deleteCaptureItem(item.id);
      setDeleted(removed ?? null);
      setOutcomes((prev) => [...prev, "DELETED"]);
      setIndex((i) => i + 1);
    } catch (e) {
      setError(describeError(e, "That didn't delete. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleUndoDelete() {
    if (!deleted || busy) return;
    setBusy(true);
    try {
      await restoreCaptureItem(deleted);
      setDeleted(null);
      setOutcomes((prev) => prev.slice(0, -1));
      setIndex((i) => i - 1);
    } catch {
      // CLEANUP-002: a failed UNDO used to fail silently.
      setError("Couldn't bring it back. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setIndex(0);
    setDeleted(null);
    if (outcomes.length > 0) onSwept();
    setOutcomes([]);
    // Kept and unswept notes are still open; read them again for the "waiting" count.
    setLoadKey((k) => k + 1);
  }

  if (!open) {
    if (items.length === 0) return null;
    return (
      <section className="notes-sweep" aria-label="Notes sweep">
        <div className="notes-sweep__row">
          <p className="meta notes-sweep__text">
            Sweep your notes · {items.length} waiting
          </p>
          <button type="button" className="btn-secondary notes-sweep__start" onClick={() => setOpen(true)}>
            SWEEP
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="notes-sweep" aria-label="Notes sweep">
      <div className="card notes-sweep__card">
        {finished ? (
          <>
            <p className="card-title" role="status">
              {describeSweep(outcomes)}
            </p>
            {deleted && (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void handleUndoDelete()} style={{ marginBottom: 8 }}>
                UNDO DELETE
              </button>
            )}
            <button type="button" className="btn-primary" onClick={close}>
              CLOSE
            </button>
            {error && (
              <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
                {error}
              </p>
            )}
          </>
        ) : (
          note && (
            <>
              <p className="meta" style={{ margin: "0 0 4px" }}>
                Note {index + 1} of {items.length} · {formatCaptured(note.capturedAt)}
              </p>
              <p className="card-title notes-sweep__note">{note.text}</p>
              {deleted && (
                <p className="meta" role="status" style={{ margin: "0 0 8px" }}>
                  Deleted.{" "}
                  <button type="button" className="notes-sweep__undo" disabled={busy} onClick={() => void handleUndoDelete()}>
                    UNDO
                  </button>
                </p>
              )}
              <div className="notes-sweep__choices">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setDeleted(null);
                    void act("DONE", () => resolveCaptureItem(note.id));
                  }}
                >
                  DONE
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setDeleted(null);
                    void act("TASK", () => convertCaptureToObligation(note.id, { title: note.text }));
                  }}
                >
                  MAKE IT A TASK
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setDeleted(null);
                    void act("KEPT", async () => {});
                  }}
                >
                  KEEP
                </button>
                <HoldButton
                  className="btn-secondary"
                  disabled={busy}
                  hint="Hold to delete this note."
                  onConfirm={() => void handleDelete(note)}
                >
                  DELETE
                </HoldButton>
              </div>
              {error && (
                <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
                  {error}
                </p>
              )}
              <button type="button" className="notes-sweep__stop" onClick={close}>
                STOP FOR NOW
              </button>
            </>
          )
        )}
      </div>
    </section>
  );
}

/** "Swept 6: 3 done, 1 task, 1 kept, 1 deleted." — only the parts that happened. */
export function describeSweep(outcomes: readonly Outcome[]): string {
  const count = (o: Outcome) => outcomes.filter((x) => x === o).length;
  const parts = [
    [count("DONE"), "done"],
    [count("TASK"), count("TASK") === 1 ? "task" : "tasks"],
    [count("KEPT"), "kept"],
    [count("DELETED"), "deleted"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, word]) => `${n} ${word}`);
  return `Swept ${outcomes.length}${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}

function formatCaptured(iso: string): string {
  return `captured ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
