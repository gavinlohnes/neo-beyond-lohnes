import { useEffect, useRef, useState } from "react";
import { db } from "../../../persistence/db";
import { exportBackup, previewRestore, applyRestore, type RestorePreview } from "../../../persistence/backup";
import { getActiveDay, getDayCount, getEventCount, getRecommendationCount } from "../../../application/queries";

const APP_VERSION = "0.1.0"; // chat-built checkpoint — NOT the same lineage as the surviving 0.2.0 app
const ENGINE_VERSION = "0.1.0";
const DATA_SCHEMA = 2; // this checkpoint's own schema (v2 adds outcomes/workoutSessions/performedSets) — not yet reconciled with the real app's schema 3

export function MoreScreen() {
  const [days, setDays] = useState(0);
  const [events, setEvents] = useState(0);
  const [recommendations, setRecommendations] = useState(0);
  const [activeDayYes, setActiveDayYes] = useState(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setDays(await getDayCount());
    setEvents(await getEventCount());
    setRecommendations(await getRecommendationCount());
    setActiveDayYes((await getActiveDay()) !== undefined);
  }

  async function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    try {
      const p = await previewRestore(file);
      setPreview(p);
      setPendingFile(file);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not read file.");
      setPreview(null);
      setPendingFile(null);
    }
  }

  async function handleConfirmRestore() {
    if (!pendingFile) return;
    await applyRestore(pendingFile);
    setPreview(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus("Restore complete.");
    await refresh();
  }

  return (
    <div className="screen">
      <p className="eyebrow">MORE</p>
      <h1 className="title">Foundation</h1>

      <div className="card">
        <h2 className="card-title">Backup</h2>
        <button className="btn-primary" onClick={() => void exportBackup()}>
          EXPORT BACKUP
        </button>
        <p className="meta" style={{ marginTop: 8 }}>Application-owned JSON. Local history only.</p>
      </div>

      <div className="card">
        <h2 className="card-title">Restore</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Replace-only restoration. BEYOND validates the file and shows a preview before any data can be replaced.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => void handleFileChosen(e.target.files?.[0])}
        />
        {preview && (
          <div style={{ marginTop: 12, border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: 12 }}>
            <p className="card-title" style={{ fontSize: 14 }}>This will replace all current data with:</p>
            {preview.tables.map((t) => (
              <p key={t.name} className="meta">{t.name}: {t.rowCount} rows</p>
            ))}
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => void handleConfirmRestore()}>
              CONFIRM REPLACE
            </button>
          </div>
        )}
        {status && <p className="meta" style={{ marginTop: 8 }}>{status}</p>}
      </div>

      <div className="card">
        <h2 className="card-title">Diagnostics</h2>
        <DiagRow label="App" value={APP_VERSION} />
        <DiagRow label="Engine" value={ENGINE_VERSION} />
        <DiagRow label="Data schema" value={String(DATA_SCHEMA)} />
        <DiagRow label="Dexie" value={String(db.verno)} />
        <DiagRow label="Active day" value={activeDayYes ? "YES" : "NO"} />
        <DiagRow label="Days" value={String(days)} />
        <DiagRow label="Events" value={String(events)} />
        <DiagRow label="Recommendations" value={String(recommendations)} />
      </div>
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span className="card-body" style={{ margin: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
