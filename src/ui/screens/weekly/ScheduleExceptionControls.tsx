import { useEffect, useState } from "react";
import type { ScheduleException } from "../../../domain/scheduleExceptions";
import {
  cancelScheduleException, changeScheduleException, confirmScheduleException, confirmShiftSwap, getUpcomingExceptions,
} from "../../../application/scheduleExceptions";

/**
 * SCHEDULE-EXCEPTIONS-001: confirm, review, edit and cancel future changes to the standing rotation, in Week Ahead.
 * What-If stays information only; turning one into a confirmed change is this separate, explicit step, and every write
 * waits for CONFIRM. Nothing here changes the rotation itself or any recorded day.
 */
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const plain = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Z_]+: /, "") : "That couldn't be saved. Nothing changed.");
const kindWords = (kind: "WORK" | "OFF") => (kind === "WORK" ? "a work day" : "a day off");

/** Under a What-If: make it real, for this day alone or as a swap with an opposite day this week. */
export function ConfirmChangeOffer({ date, to, swapWith, onConfirmed }: {
  date: string; to: "WORK" | "OFF";
  /** Predicted days this week of the opposite kind, to swap with. */
  swapWith: readonly string[];
  onConfirmed: () => void;
}) {
  const [pair, setPair] = useState<string>("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const what = to === "WORK" ? "overtime: a work day" : "time off: a day off";
  if (done) return <p className="meta" role="status" style={{ margin: "6px 0 0" }}>{done}</p>;
  return (
    <section aria-label="Confirm this change" className="equipment-row" style={{ marginTop: 6, padding: "10px 12px" }}>
      <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>MAKE IT A CONFIRMED CHANGE · optional</p>
      {!preview ? <>
        <label className="meta" style={{ display: "grid", gap: 4, marginTop: 4 }}>Just this day, or swap with
          <select className="input" value={pair} onChange={(e) => setPair(e.target.value)} aria-label="Swap with">
            <option value="">Just {day(date)}</option>
            {swapWith.map((d) => <option key={d} value={d}>Swap: {day(d)} becomes {kindWords(to === "WORK" ? "OFF" : "WORK")}</option>)}
          </select>
        </label>
        <label className="meta" style={{ display: "grid", gap: 4, marginTop: 4 }}>Note (optional)
          <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        </label>
        <button type="button" className="btn-secondary" style={{ marginTop: 6 }} onClick={() => { setError(null); setPreview(true); }}>REVIEW THE CHANGE</button>
      </> : <div role="group" aria-label="Preview">
        <p className="meta" style={{ margin: "4px 0" }}>
          {pair ? `Saves a confirmed swap: ${day(date)} becomes ${kindWords(to)} and ${day(pair)} becomes ${kindWords(to === "WORK" ? "OFF" : "WORK")}.`
            : `Saves a confirmed change: ${day(date)} becomes ${what}.`} Your rotation stays as it is, and nothing is marked as worked.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => {
            setSaving(true); setError(null);
            const write = pair
              ? confirmShiftSwap({ workDate: to === "WORK" ? date : pair, offDate: to === "WORK" ? pair : date, note })
              : confirmScheduleException({ date, kind: to, note });
            void write.then(() => { setDone(pair ? `Swap confirmed: ${day(date)} and ${day(pair)}.` : `Confirmed: ${day(date)} is ${kindWords(to)}.`); onConfirmed(); },
              (e: unknown) => setError(plain(e))).finally(() => setSaving(false));
          }}>CONFIRM</button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setPreview(false)}>CANCEL</button>
        </div>
      </div>}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}

/** The upcoming confirmed changes, each with EDIT NOTE and CANCEL CHANGE (both confirm-first). Hidden when none. */
export function ConfirmedChangesList({ now, refreshKey, onChanged }: { now?: Date | undefined; refreshKey: number; onChanged: () => void }) {
  const [items, setItems] = useState<ScheduleException[] | null>(null);
  const [action, setAction] = useState<{ id: string; kind: "NOTE" | "CANCEL"; note: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getUpcomingExceptions(now).then(setItems, () => setItems([])); }, [now, refreshKey]);
  if (!items || !items.length) return null;
  // A swap shows once, with both of its days.
  const groups = [...new Map(items.map((e) => [e.swapId ?? e.id, items.filter((x) => (e.swapId ? x.swapId === e.swapId : x.id === e.id))])).values()];
  const run = (write: Promise<unknown>) => {
    setSaving(true); setError(null);
    void write.then(() => { setAction(null); onChanged(); }, (e: unknown) => setError(plain(e))).finally(() => setSaving(false));
  };
  return (
    <section data-confirmed-changes aria-label="Confirmed schedule changes" style={{ margin: "0 0 10px" }}>
      <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>CONFIRMED CHANGES</p>
      {groups.map((group) => {
        const first = group[0]!, open = action?.id === first.id;
        const label = first.swapId ? `Swap: ${group.map((e) => `${day(e.date)} ${e.kind === "WORK" ? "work" : "off"}`).join(", ")}`
          : `${day(first.date)}: ${first.kind === "WORK" ? "overtime (work)" : "time off"}`;
        return <div key={first.id} className="equipment-row" style={{ marginTop: 4, padding: "8px 12px" }}>
          <p className="meta" style={{ margin: 0, color: "var(--text-1)" }}>{label}</p>
          {first.note && <p className="meta" style={{ margin: "2px 0 0" }}>{first.note}</p>}
          {!open ? <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setAction({ id: first.id, kind: "NOTE", note: first.note ?? "" })}>EDIT NOTE</button>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setAction({ id: first.id, kind: "CANCEL", note: "" })}>CANCEL CHANGE</button>
            </div>
            : <div role="group" aria-label="Preview" style={{ marginTop: 4 }}>
              {action.kind === "NOTE"
                ? <label className="meta" style={{ display: "grid", gap: 4 }}>Note
                    <input className="input" value={action.note} maxLength={200} aria-label="Note" onChange={(e) => setAction({ ...action, note: e.target.value })} /></label>
                : <p className="meta" style={{ margin: 0 }}>Cancels this change. {group.map((e) => `${day(e.date)} goes back to your rotation`).join("; ")}. The history is kept.</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="button" className="btn-primary" disabled={saving}
                  onClick={() => run(action.kind === "NOTE" ? changeScheduleException(first.id, { note: action.note }) : cancelScheduleException(first.id))}>CONFIRM</button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => setAction(null)}>BACK</button>
              </div>
            </div>}
        </div>;
      })}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}
