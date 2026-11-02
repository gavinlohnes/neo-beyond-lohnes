import { useEffect, useState } from "react";
import { getCalendarExport } from "../../../application/calendarExportQueries";
import type { CalendarExport } from "../../../application/calendarExport";

export async function deliverCalendar(file: File): Promise<"Shared" | "Downloaded" | "Cancelled"> {
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file] }); return "Shared"; }
    catch (error) { if (error instanceof Error && error.name === "AbortError") return "Cancelled"; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a"); link.href = url; link.download = file.name;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "Downloaded";
}

export function CalendarExportPanel({ now }: { now?: Date | undefined }) {
  const [weeks, setWeeks] = useState<4 | 8>(4);
  const [includePlans, setIncludePlans] = useState(false);
  const [preview, setPreview] = useState<CalendarExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setPreview(null); setReceipt(null); setError(null);
    void getCalendarExport({ weeks, includePlans }, now).then((value) => { if (current) setPreview(value); })
      .catch(() => { if (current) setError("Calendar records couldn't be read. Nothing was exported."); });
    return () => { current = false; };
  }, [weeks, includePlans, now]);
  async function exportFile() {
    if (!preview || busy) return;
    setBusy(true); setError(null);
    try {
      const outcome = await deliverCalendar(new File([preview.contents], `beyond-calendar-${preview.from}.ics`, { type: "text/calendar;charset=utf-8" }));
      setReceipt(outcome === "Cancelled" ? "Export cancelled." : `${outcome} ${preview.count} events · ${preview.from} to ${preview.through}.`);
    } catch { setError("The calendar file couldn't be delivered. Try again."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Calendar export">
    <h2 className="eyebrow">EXPORT TO CALENDAR</h2>
    <label className="meta">Include<select aria-label="Calendar contents" value={includePlans ? "plans" : "shifts"} disabled={busy} onChange={(e) => setIncludePlans(e.target.value === "plans")}>
      <option value="shifts">Shifts only</option><option value="plans">Shifts + my plans</option>
    </select></label>
    <label className="meta">How far ahead<select aria-label="Calendar range" value={weeks} disabled={busy} onChange={(e) => setWeeks(Number(e.target.value) as 4 | 8)}>
      <option value={4}>4 weeks</option><option value={8}>8 weeks</option>
    </select></label>
    <p className="meta">Scheduled shifts, not worked records. Shift times use the importing calendar's local time zone. Plans include titles and planned/due dates only. No notes are included.</p>
    {preview?.message && <p className="meta">{preview.message}</p>}
    {preview && <p className="meta">{preview.count} events · {preview.from} to {preview.through}</p>}
    <button type="button" className="btn-secondary" disabled={!preview?.count || busy} onClick={() => void exportFile()}>{busy ? "EXPORTING…" : "EXPORT TO CALENDAR"}</button>
    {error && <p role="alert">{error}</p>}
    {receipt && <p role="status" className="meta">{receipt}</p>}
  </section>;
}
