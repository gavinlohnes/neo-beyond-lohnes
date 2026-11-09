import { useEffect, useState } from "react";
import { addTagToActiveDay, getActiveDayTags, noteTags, toggleNoteTag } from "../../application/noteTags";
import { describeError } from "../errorMessage";

/**
 * DELTA-NEXT 4: one-tap tags outside the daily note (after a workout). Each tap adds the tag to today's
 * daily note through the ordinary save, so tag patterns and DELTA pick it up. Remove a tag in the note itself.
 */
/** An unsaved daily-note draft on this phone gets the tag too, so saving that draft later can't drop it. */
function keepInDraft(dayId: string, tag: string) {
  try {
    const key = `beyond.daily-note.draft.${dayId}`, draft = sessionStorage.getItem(key);
    if (draft !== null && !noteTags(draft).includes(tag)) sessionStorage.setItem(key, toggleNoteTag(draft, tag));
  } catch { /* storage blocked: the saved note already has the tag */ }
}

export function QuickTags({ label, tags }: { label: string; tags: readonly string[] }) {
  const [on, setOn] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getActiveDayTags().then(setOn).catch(() => {}); }, []);
  return <div className="quick-tags" role="group" aria-label={label}>
    <p className="meta" style={{ margin: "8px 0 4px" }}>{label}. Saved to today's note, so DELTA can compare.</p>
    <div className="button-row">
      {tags.map((tag) => {
        const added = on.includes(tag);
        return <button type="button" key={tag} className={added ? "btn-primary" : "btn-secondary"} aria-pressed={added} disabled={added}
          onClick={() => { setError(null); void addTagToActiveDay(tag).then(({ dayId, tags }) => { setOn(tags); keepInDraft(dayId, tag); }, (e) => setError(describeError(e, "The tag couldn't be saved."))); }}>{added ? "✓ " : ""}#{tag}</button>;
      })}
    </div>
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
