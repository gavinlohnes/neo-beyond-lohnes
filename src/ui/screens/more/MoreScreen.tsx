import { useEffect, useRef, useState } from "react";
import { db } from "../../../persistence/db";
import { exportBackup, shareBackup } from "../../../persistence/backup";
import { previewAnyRestore, applyAnyRestore, type RestorePreview } from "../../../persistence/restore";
import { getActiveDay, getDayCount, getEventCount, getRecommendationCount } from "../../../application/queries";
import { HistoryScreen } from "../history/HistoryScreen";

const APP_VERSION = "0.1.0"; // chat-built checkpoint — NOT the same lineage as the surviving 0.2.0 app
const ENGINE_VERSION = "0.1.0";
const DATA_SCHEMA = 3; // this checkpoint's own schema (v3 adds sessionId/exerciseId indexes to performedSets for TRAIN) — not yet reconciled with the real app's schema 3 (same number, different lineage)

export function MoreScreen() {
  const [view, setView] = useState<"MENU" | "HISTORY">("MENU");
  const [days, setDays] = useState(0);
  const [events, setEvents] = useState(0);
  const [recommendations, setRecommendations] = useState(0);
  const [activeDayYes, setActiveDayYes] = useState(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  async function handleExportBackup() {
    if (busy) return;
    setBusy(true);
    try {
      await exportBackup();
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(file: File | undefined) {
    if (busy || !file) return;
    setBusy(true);
    setStatus(null);
    try {
      const p = await previewAnyRestore(file);
      setPreview(p);
      setPendingFile(file);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not read file.");
      setPreview(null);
      setPendingFile(null);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Restore safety (P0): before replacing anything, automatically export
   * the CURRENT data first — a real rollback file, not just a warning —
   * then apply the restore, then force a full page reload rather than
   * re-fetching each screen's own state individually. A replace-only
   * restore touches every table at once; a full reload is the only way
   * to guarantee every screen (not just whichever ones happen to be
   * mounted right now) reflects it, and matches how drastic the action
   * actually is. Errors are now caught and surfaced instead of leaving
   * an unhandled rejection with no feedback.
   */
  async function handleConfirmRestore() {
    if (busy || !pendingFile) return;
    setBusy(true);
    setStatus("Backing up current data before restoring...");
    try {
      await exportBackup();
      setStatus("Restoring...");
      await applyAnyRestore(pendingFile);
      window.location.reload();
    } catch (e) {
      setStatus(e instanceof Error ? `Restore failed: ${e.message}` : "Restore failed.");
      setBusy(false);
    }
  }

  function handleCancelRestore() {
    setPreview(null);
    setPendingFile(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleArchive() {
    if (busy) return;
    setBusy(true);
    setArchiveStatus(null);
    try {
      const result = await shareBackup();
      setArchiveStatus(
        result.shared
          ? "Sent to share sheet — pick a destination there."
          : "Share sheet unavailable on this device; downloaded a backup file instead.",
      );
    } catch (e) {
      setArchiveStatus(e instanceof Error ? e.message : "Could not start archive.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "HISTORY") {
    return (
      <div className="screen">
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }}
          onClick={() => setView("MENU")}
        >
          ← BACK TO MORE
        </button>
        <HistoryScreen />
      </div>
    );
  }

  return (
    <div className="screen">
      <p className="eyebrow">MORE</p>
      <h1 className="title">Foundation</h1>

      <div className="card">
        <h2 className="card-title">History</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Every day and every event, exactly as it happened. Read-only.
        </p>
        <button className="btn-primary" onClick={() => setView("HISTORY")}>
          VIEW HISTORY
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Backup</h2>
        <button className="btn-primary" disabled={busy} onClick={() => void handleExportBackup()}>
          EXPORT BACKUP
        </button>
        <p className="meta" style={{ marginTop: 8 }}>Application-owned JSON. Local history only.</p>
      </div>

      <div className="card">
        <h2 className="card-title">Archive</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Quarterly archival via the device's native share sheet — you pick the destination (e.g. Drive).
          Data stays on-device; this never deletes anything.
        </p>
        <button className="btn-secondary" disabled={busy} onClick={() => void handleArchive()}>
          SHARE / ARCHIVE
        </button>
        {archiveStatus && <p className="meta" style={{ marginTop: 8 }}>{archiveStatus}</p>}
      </div>

      <div className="card">
        <h2 className="card-title">Restore</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Replace-only restoration. Your current data is automatically backed up right before anything is
          replaced, so a mistaken restore is always recoverable. BEYOND validates the file and shows a preview
          before any data can be replaced. Accepts either this app's own backup export or a real historical
          BEYOND_BACKUP export (app 0.1.0/0.2.0).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          disabled={busy}
          onChange={(e) => void handleFileChosen(e.target.files?.[0])}
        />
        {preview && (
          <div style={{ marginTop: 12, border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: 12 }}>
            <p className="card-title" style={{ fontSize: 16 }}>
              This will permanently replace everything currently on this device.
            </p>
            <p className="meta" style={{ marginTop: 8, marginBottom: 8 }}>
              {preview.format === "LEGACY"
                ? `From a historical backup — app ${preview.appVersion}, data schema ${preview.dataSchemaVersion}, exported ${new Date(preview.exportedAt).toLocaleString()}.`
                : `From this app's own backup — database "${preview.databaseName}" version ${preview.databaseVersion}.`}
            </p>
            <p className="meta" style={{ marginBottom: 4 }}>
              Right now on this device: {days} {days === 1 ? "day" : "days"}, {events} events, {recommendations} recommendations.
            </p>
            <p className="meta" style={{ marginBottom: 8 }}>
              In the backup you're about to restore:
            </p>
            {preview.tables.map((t) => (
              <p key={t.name} className="meta" style={{ paddingLeft: 8 }}>{t.name}: {t.rowCount} rows</p>
            ))}
            <p className="meta" style={{ marginTop: 8, marginBottom: 8 }}>
              A backup of what's currently here will be downloaded automatically before this replaces it.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" disabled={busy} onClick={() => void handleConfirmRestore()}>
                CONFIRM REPLACE
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={handleCancelRestore}
              >
                CANCEL
              </button>
            </div>
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
