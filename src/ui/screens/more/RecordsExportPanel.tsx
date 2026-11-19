import { useEffect, useState } from "react";
import { EXPORT_AREAS, exportFileName, getRecordsExport, toCsv, type ExportArea, type RecordsExport } from "../../../application/recordsExport";
import { deliverCalendar } from "../weekly/CalendarExportPanel";
import "./recordsExport.css";

/**
 * EXPORT-001: your records as readable CSV files, one area at a time. You see the row count and date range before
 * anything leaves; the file goes to the share sheet, or downloads where sharing isn't available. Not a backup.
 */
const rowsOf = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "row" : "rows"}`;

export function RecordsExportPanel() {
  const [area, setArea] = useState<ExportArea>("days");
  const [data, setData] = useState<RecordsExport | null | "ERROR">(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setData(null); setReceipt(null);
    void getRecordsExport(area).then((d) => { if (live) setData(d); }, () => { if (live) setData("ERROR"); });
    return () => { live = false; };
  }, [area]);

  async function exportNow(d: RecordsExport) {
    setBusy(true);
    try {
      const file = new File([toCsv(d.header, d.rows)], exportFileName(d.area), { type: "text/csv" });
      const result = await deliverCalendar(file);
      setReceipt(result === "Cancelled" ? "Export cancelled." : `${result} ${rowsOf(d.rows.length)}${d.from ? ` · ${d.from} to ${d.to}` : ""}.`);
    } catch { setReceipt("The file couldn't be made. Nothing was exported."); }
    finally { setBusy(false); }
  }

  return <section className="records-export" aria-labelledby="records-export-title">
    <h3 id="records-export-title" className="tool-label">EXPORT RECORDS (CSV)</h3>
    <p className="card-body">A readable copy of one area, for a spreadsheet. Corrected values; a missing value is an empty cell. Not a backup.</p>
    <div className="records-export__areas" role="group" aria-label="Area to export">
      {EXPORT_AREAS.map(([id, label]) => <button key={id} type="button" className={`chip${area === id ? " chip--selected" : ""}`} aria-pressed={area === id} disabled={busy} onClick={() => setArea(id)}>{label}</button>)}
    </div>
    {data === null ? <p className="meta" role="status">Reading…</p>
      : data === "ERROR" ? <p className="meta" role="alert">Your records couldn't be read. Nothing was exported.</p>
      : data.rows.length === 0 ? <p className="meta" data-export-preview>Nothing to export yet.</p>
      : <>
        <p className="meta" data-export-preview>{rowsOf(data.rows.length)} · {data.from} to {data.to}</p>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void exportNow(data)}>EXPORT {EXPORT_AREAS.find(([id]) => id === area)![1].toUpperCase()}</button>
      </>}
    {receipt && <p className="meta" role="status" data-export-receipt>{receipt}</p>}
  </section>;
}
