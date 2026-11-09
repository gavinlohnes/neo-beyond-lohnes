import { useEffect, useState } from "react";
import type { SavedInboxItem } from "../../../domain/saved/types";
import { deleteSavedInboxItem, getSavedInboxItems, makeSavedItemTask, saveInboxItem, updateSavedInboxItem } from "../../../application/savedInbox";
import { takeSharedInboxPayload } from "./sharedInboxPayload";
import { describeError } from "../../errorMessage";
import { createHighlight } from "../../../application/highlightCommands";
import { SortInbox } from "./SortInbox";

export function SavedInboxScreen({ active }: { active: boolean }) {
  const [items, setItems] = useState<SavedInboxItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sorting, setSorting] = useState(false);
  async function read() { setItems(await getSavedInboxItems()); }
  useEffect(() => {
    if (!active) return;
    let current = true;
    void takeSharedInboxPayload().then(async (payload) => {
      if (payload) await saveInboxItem({ ...payload, source: "SHARE" });
      if (current) await read();
    }).catch((cause) => { if (current) setError(describeError(cause, "The Saved inbox is unavailable.")); });
    return () => { current = false; };
  }, [active]);
  async function run(action: () => Promise<unknown>, success: string) {
    setError(""); setMessage("");
    try { await action(); await read(); setMessage(success); } catch (cause) { setError(describeError(cause, "That change could not be saved.")); }
  }
  return <section className="saved-inbox" aria-label="Saved inbox">
    <p className="meta">Links and text you shared with BEYOND. Nothing is fetched from a link.</p>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!items.length && !sorting && <p>Nothing saved yet. Share text or a link to BEYOND from another app.</p>}
    {sorting ? <SortInbox items={items} onChanged={read} onDone={() => { setSorting(false); void read(); }} /> : <>
    {items.length > 0 && <button type="button" className="btn-primary" onClick={() => { setMessage(""); setSorting(true); }}>SORT INBOX · {items.length}</button>}
    {items.map((item) => <SavedItem key={item.id} item={item} deleting={deleting === item.id}
      onDelete={() => setDeleting(item.id)} onCancelDelete={() => setDeleting(null)}
      onRun={run} />)}
    </>}
  </section>;
}

function SavedItem({ item, deleting, onDelete, onCancelDelete, onRun }: {
  item: SavedInboxItem; deleting: boolean; onDelete: () => void; onCancelDelete: () => void;
  onRun: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [note, setNote] = useState(item.note);
  const [tags, setTags] = useState(item.tags.join(", "));
  return <article className="operator-card">
    <p className="meta">{item.source === "SHARE" ? "SHARED" : "SAVED"} · {new Date(item.createdAt).toLocaleDateString()}</p>
    {item.title && <h3>{item.title}</h3>}
    {item.text && <p>{item.text}</p>}
    {item.url && <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>}
    <label>Tags<input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="work, read later" /></label>
    <label>Note<textarea className="input" value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <div className="button-row">
      <button type="button" className="btn-primary" onClick={() => void onRun(() => updateSavedInboxItem(item.id, { note, tags: tags.split(",") }), "Saved item updated.")}>SAVE CHANGES</button>
      <button type="button" className="btn-secondary" onClick={() => void onRun(() => makeSavedItemTask(item.id), "Task created.")}>MAKE TASK</button>
      <button type="button" className="btn-secondary" disabled={!item.text.trim()} onClick={() => void onRun(() => createHighlight({ savedItemId: item.id, text: item.text, note, tags: tags.split(",") }), "Highlight created.")}>MAKE HIGHLIGHT</button>
      {!deleting ? <button type="button" className="btn-secondary" onClick={onDelete}>DELETE</button> : <>
        <button type="button" className="btn-danger" onClick={() => void onRun(() => deleteSavedInboxItem(item.id), "Saved item deleted.")}>CONFIRM DELETE</button>
        <button type="button" className="btn-secondary" onClick={onCancelDelete}>KEEP IT</button>
      </>}
    </div>
  </article>;
}
