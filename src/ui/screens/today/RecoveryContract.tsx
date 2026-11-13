import { useState } from "react";
import { getPostRunReport, type PostRunReport } from "../../../application/postRunReport";
import { RECOVERY_CONTRACT, type ContractItem } from "../../../application/recoveryContract";

/**
 * LIFE-STATE-003: on RUN OVER, the post-run report (read when opened, so TODAY never jumps) and the optional recovery
 * contract. The contract's items are chosen, previewed and written only on CONFIRM; skipping it changes nothing.
 */
export function PostRunReportDisclosure({ read = getPostRunReport }: { read?: typeof getPostRunReport }) {
  const [report, setReport] = useState<PostRunReport | null | undefined>(undefined);
  const [error, setError] = useState(false);
  return (
    <details className="today-life-state__report" onToggle={(event) => {
      if (event.currentTarget.open && report === undefined) void read().then(setReport, () => setError(true));
    }}>
      <summary>POST-RUN REPORT</summary>
      {error ? <p className="meta" role="alert">The run couldn't be read. Nothing changed.</p>
        : report === undefined ? <p className="meta" role="status">Reading the run…</p>
        : report === null ? <p className="meta">No recorded work days just before today, so there's no run to report.</p>
        : <ul>{report.lines.map((line) => <li key={line} className="meta">{line}</li>)}</ul>}
      {report && <p className="meta">From your records. Nothing is estimated or scored.</p>}
    </details>
  );
}

export function RecoveryContractOffer({ dayLabel, planned, busy, onConfirm }: {
  /** The first full day off, e.g. "Sat". */
  dayLabel: string;
  planned: boolean;
  busy: boolean;
  onConfirm: (items: ContractItem[]) => Promise<void>;
}) {
  const [chosen, setChosen] = useState<ContractItem["key"][]>(RECOVERY_CONTRACT.map((i) => i.key));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ContractItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = RECOVERY_CONTRACT.filter((i) => chosen.includes(i.key));
  if (saved) return <div className="today-life-state__contract" role="status">
    <p className="meta">Recovery contract added for {dayLabel}: {saved.map((i) => i.title).join(", ")}.</p>
    <p className="meta">Change or remove any of them in MORE → PLAN TODAY.</p>
  </div>;
  if (planned) return <p className="meta today-life-state__contract">Your recovery contract is in your plans for {dayLabel}. Change it in MORE → PLAN TODAY.</p>;
  return (
    <section className="today-life-state__contract" aria-label="Recovery contract">
      <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>RECOVERY CONTRACT · optional</p>
      <p className="meta" style={{ margin: "2px 0 4px" }}>A light plan for {dayLabel}, your first full day off. Pick any, or none.</p>
      {!preview && RECOVERY_CONTRACT.map((item) => (
        <label key={item.key} className="today-life-state__choice">
          <input type="checkbox" checked={chosen.includes(item.key)} disabled={saving}
            onChange={(e) => setChosen((c) => (e.target.checked ? [...c, item.key] : c.filter((k) => k !== item.key)))} />
          <span>{item.title}</span>
        </label>
      ))}
      {preview ? <div role="group" aria-label="Preview" className="equipment-row today-life-state__preview">
          <p className="meta" style={{ margin: 0 }}>Adds {items.length === 1 ? "this plan item" : `these ${items.length} plan items`} for {dayLabel}. Your schedule and training programme don't change.</p>
          <ul>{items.map((i) => <li key={i.key} className="meta-strong" style={{ color: "var(--text-1)" }}>{i.title}</li>)}</ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-primary" disabled={saving || busy} onClick={() => {
              setSaving(true); setError(null);
              void onConfirm(items).then(() => { setSaved(items); setPreview(false); }, () => setError("That couldn't be saved. Nothing changed."))
                .finally(() => setSaving(false));
            }}>CONFIRM</button>
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setPreview(false)}>CANCEL</button>
          </div>
        </div>
        : <button type="button" className="btn-secondary today-life-state__follow" disabled={busy || !items.length} onClick={() => setPreview(true)}>REVIEW THE CONTRACT</button>}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}
