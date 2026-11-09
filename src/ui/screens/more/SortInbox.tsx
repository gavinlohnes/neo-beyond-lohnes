import { useState } from "react";
import type { SavedInboxItem } from "../../../domain/saved/types";
import { deleteSavedInboxItem, makeSavedItemTask } from "../../../application/savedInbox";
import { createHighlight } from "../../../application/highlightCommands";
import { describeError } from "../../errorMessage";

/**
 * INBOX-ZERO-001 (big-list idea 5, Things / GTD): sort the Saved inbox one item at a time — make it a task,
 * save it as a highlight, keep it for later, or remove it. Every action is an existing command; removing
 * needs a second tap, and a task or highlight never deletes the item by itself.
 */
export function SortInbox({ items, onChanged, onDone }: { items: readonly SavedInboxItem[]; onChanged: () => Promise<void>; onDone: () => void }) {
  const [queue] = useState(() => items.map((i) => i.id));
  const [index, setIndex] = useState(0);
  const [after, setAfter] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const item = items.find((i) => i.id === queue[index]);
  const next = () => { setAfter(null); setConfirmRemove(false); setError(""); setIndex((n) => n + 1); };

  async function act(action: () => Promise<unknown>, then: "next" | string) {
    setBusy(true); setError("");
    try { await action(); await onChanged(); if (then === "next") next(); else setAfter(then); }
    catch (cause) { setError(describeError(cause, "That change could not be saved.")); }
    finally { setBusy(false); }
  }

  if (!item) return <section className="operator-card sort-inbox" aria-label="Sort inbox">
    <p className="card-title">All sorted.</p>
    <p className="meta">{items.length ? `${items.length} kept for later.` : "Your Saved inbox is empty."}</p>
    <button type="button" className="btn-secondary" onClick={onDone}>DONE</button>
  </section>;

  return <section className="operator-card sort-inbox" aria-label="Sort inbox">
    <p className="meta" aria-live="polite">{index + 1} of {queue.length}</p>
    {item.title && <h3>{item.title}</h3>}
    {item.text && <p>{item.text}</p>}
    {item.url && <p className="meta" style={{ overflowWrap: "anywhere" }}>{item.url}</p>}
    {error && <p role="alert">{error}</p>}
    {after ? <>
      <p role="status">{after} Remove it from the inbox?</p>
      <div className="button-row">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void act(() => deleteSavedInboxItem(item.id), "next")}>REMOVE FROM INBOX</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={next}>KEEP HERE</button>
      </div>
    </> : confirmRemove ? <div className="button-row">
      <button type="button" className="btn-danger" disabled={busy} onClick={() => void act(() => deleteSavedInboxItem(item.id), "next")}>CONFIRM REMOVE</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRemove(false)}>KEEP IT</button>
    </div> : <div className="button-row">
      <button type="button" className="btn-primary" disabled={busy} onClick={() => void act(() => makeSavedItemTask(item.id), "Task created.")}>MAKE TASK</button>
      <button type="button" className="btn-secondary" disabled={busy || !item.text.trim()} onClick={() => void act(() => createHighlight({ savedItemId: item.id, text: item.text, note: item.note, tags: item.tags }), "Highlight saved.")}>HIGHLIGHT</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={next}>KEEP FOR LATER</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRemove(true)}>REMOVE</button>
    </div>}
    <button type="button" className="backup-due__later" onClick={onDone}>STOP SORTING</button>
  </section>;
}
