import { useEffect, useRef, useState } from "react";
import { db } from "../../../persistence/db";
import { exportBackup, shareBackup } from "../../../persistence/backup";
import { previewAnyRestore, applyAnyRestore, type RestorePreview } from "../../../persistence/restore";
import { getActiveDay, getDayCount, getEventCount, getRecommendationCount } from "../../../application/queries";
import { getAdvisoryNotes } from "../../../application/advisoryQueries";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { ENGINE_VERSION } from "../../../engine/evaluate";
import { APP_RELEASE, BUILD_COMMIT, BUILD_TIME } from "../../../app/buildInfo";
import { HistoryScreen } from "../history/HistoryScreen";
import { WorkScheduleScreen } from "./WorkScheduleScreen";
import { IntentScreen } from "./IntentScreen";
import { CollapsibleRow } from "../../components/CollapsibleRow";

// FIELD ALPHA Phase 0 truth-hygiene fix: this was hardcoded at 4 (stale
// since the Drop 02a/schedulePatterns migration) while the live Dexie
// version below in Diagnostics had already moved on to 6 (captureItems,
// then missions/obligations) — the same screen was showing two different
// answers to "what schema is this?" Now reads the live value directly so
// it can't drift again.
const DATA_SCHEMA = db.verno;

export function MoreScreen() {
  const [view, setView] = useState<"MENU" | "HISTORY" | "WORK_SCHEDULE" | "INTENT">("MENU");
  const [days, setDays] = useState(0);
  const [events, setEvents] = useState(0);
  const [recommendations, setRecommendations] = useState(0);
  const [activeDayYes, setActiveDayYes] = useState(false);
  // Intelligence Spine — I2: informational only, DIAGNOSTIC-tier (same
  // TECHNICAL DETAIL treatment as days/events/recommendations below) —
  // never a claim, never actionable here. See advisoryQueries.ts and
  // .claude/rules/engine.md's advisory.ts entry for the one-way boundary
  // this stays behind.
  const [advisoryNotes, setAdvisoryNotes] = useState<AdvisoryNote[]>([]);
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
    setAdvisoryNotes(await getAdvisoryNotes());
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
      <div className="screen fade-in">
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

  if (view === "WORK_SCHEDULE") {
    return (
      <div className="screen fade-in">
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }}
          onClick={() => setView("MENU")}
        >
          ← BACK TO MORE
        </button>
        <h1 className="eyebrow">MORE // WORK SCHEDULE</h1>
        <WorkScheduleScreen />
      </div>
    );
  }

  if (view === "INTENT") {
    return (
      <div className="screen fade-in">
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }}
          onClick={() => setView("MENU")}
        >
          ← BACK TO MORE
        </button>
        <h1 className="eyebrow">MORE // MISSIONS &amp; OBLIGATIONS</h1>
        <IntentScreen />
      </div>
    );
  }

  return (
    <div className="screen fade-in">
      {/* FIELD ALPHA Phase 4: identity zone quieted, same principle
          applied to TODAY/TRAIN/BODY — MORE is the SYSTEM surface, not a
          fifth destination competing for its own display title. */}
      <h1 className="eyebrow">MORE // SYSTEM</h1>

      {/* FIELD ALPHA Phase 4B: reorganized by functional meaning
          (OPERATIONS / RECORDS / SYSTEM) rather than historical screen
          order. OPERATIONS entries the operator navigates into
          (Missions & Obligations, Work Schedule, History) reuse
          CollapsibleRow — already established across TODAY/TRAIN as
          "a whole row is the disclosure control" — its onOpen callback
          doesn't care whether "opening" means an inline expand or a
          view-swap, so this is genuine reuse, not a forced fit. Backup/
          Archive/Restore are immediate actions, not navigation, so they
          use .equipment-row instead. */}
      <p className="section-label">Operations</p>

      <CollapsibleRow
        name="MISSIONS & OBLIGATIONS"
        summary="Durable direction and commitments requiring deliberate resolution."
        onOpen={() => setView("INTENT")}
      />
      <CollapsibleRow
        name="WORK SCHEDULE"
        summary="The rotation BEYOND predicts a work day and shift phase from."
        onOpen={() => setView("WORK_SCHEDULE")}
      />

      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>BACKUP</p>
        <p className="card-body" style={{ marginBottom: 8 }}>
          A file with everything on this device. Nothing leaves unless you share it.
        </p>
        <button className="btn-primary" disabled={busy} onClick={() => void handleExportBackup()}>
          EXPORT BACKUP
        </button>
      </div>

      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>ARCHIVE</p>
        <p className="card-body" style={{ marginBottom: 8 }}>
          Quarterly archival via the device's native share sheet — you pick the destination (e.g. Drive).
          Data stays on-device; this never deletes anything.
        </p>
        <button className="btn-secondary" disabled={busy} onClick={() => void handleArchive()}>
          SHARE / ARCHIVE
        </button>
        {archiveStatus && <p className="meta" style={{ marginTop: 8 }}>{archiveStatus}</p>}
      </div>

      {/* Restore is the one genuinely dangerous, rare action on this
          screen — replaces everything on the device. Kept functionally
          identical (same auto-backup-first, preview-before-write
          contract) but visually flagged so it doesn't read as routine —
          a danger-colored left accent (not .eyebrow, which is reserved
          for screen identity/red-authority) instead of a red-bordered
          card, matching the "danger stays distinct from identity red"
          rule at a lower, less card-stack-like weight. */}
      <div className="equipment-row" style={{ borderLeft: "2px solid var(--danger)", paddingLeft: "var(--space-3)" }}>
        <p className="tool-label" style={{ color: "var(--danger)", marginBottom: 4 }}>RESTORE — REPLACES ALL DATA</p>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Replace-only restoration. Your current data is automatically backed up right before anything is
          replaced, so a mistaken restore is always recoverable. BEYOND validates the file and shows a preview
          before any data can be replaced. Accepts either this app's own backup export or a real historical
          BEYOND_BACKUP export (app 0.1.0/0.2.0).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Choose a backup file to restore"
          // Drop 01 acceptance correction (real-device retest, 2026-08-22):
          // no `accept` filter at all, deliberately. A prior attempt
          // listed several MIME variants plus ".json" and still failed on
          // a real Android device — Android's Storage Access Framework
          // filters candidates by whatever MIME type its DocumentsProvider
          // already recorded for that file at download time, which BEYOND
          // cannot reliably control or predict (it can vary by Chrome
          // version/OEM and has been observed not to match ANY specific
          // MIME string, including application/json, for a locally
          // generated blob download) — so no accept list is provably safe
          // against being filtered out on some device. The OS picker's
          // job is only to let the operator choose a candidate file;
          // previewAnyRestore/applyAnyRestore below still fully validate
          // its actual content and reject anything that isn't a
          // recognized BEYOND backup (INVALID_BACKUP_FILE), so accepting
          // every file at the picker level costs nothing in safety.
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
              <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleConfirmRestore()}>
                CONFIRM REPLACE
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
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

      {/* FIELD ALPHA Phase 4B/4H: RECORDS — historical/review-oriented,
          distinct from OPERATIONS above. History stays a clean single
          entry point per Phase 4H — no charts/trends/summaries added,
          none existed to preserve. */}
      <p className="section-label">Records</p>
      <CollapsibleRow
        name="HISTORY"
        summary="Every day and every event, exactly as it happened. Read-only."
        onOpen={() => setView("HISTORY")}
      />

      {/* FIELD ALPHA Phase 4C: SYSTEM — BEYOND's own state, the first
          real proof of the SYSTEM STATE grammar outside TODAY/TRAIN's
          .status-strip. Reuses BODY's .instrument-cluster verbatim (a
          grid of independent glance-depth readings is exactly what this
          is) for the NORMAL-tier facts an operator would want at a
          glance; the raw counts and exact build timestamp are TECHNICAL
          DETAIL, not GLANCE content, so they move behind a <details> the
          same way TODAY's WHY panel already tucks away its own machinery
          — one tap from "what's the current state" to "what's actually
          in the database/build," never dumped as a permanent wall of
          numbers. No AVAILABLE ACTION or DEGRADED state is rendered here
          because none currently exists in the app (no update-check
          mechanism, no schema-incompatibility detector) — inventing one
          would be fabricated telemetry, which this checkpoint is
          explicitly forbidden from doing. The former "Data schema"/
          "Dexie" rows both showed the identical db.verno value on the
          same screen; collapsed into one SCHEMA reading.

          Factory Drop 02: APP/BUILD now come from src/app/buildInfo.ts,
          itself derived at build time from package.json's version and
          the actual git commit/timestamp (vite.config.ts's `define`) —
          not a second hand-typed literal. APP stays the deliberate,
          human-bumped release identity (see README's "Versions &
          lineage" for why its value is what it is); BUILD is the thing
          that actually answers "is this the current deployment," since a
          release number nobody remembers to bump can't. ENGINE is
          untouched — Engine architecture, out of scope this Drop, and
          already single-sourced from evaluate.ts's own exported
          constant. */}
      <p className="section-label">System</p>
      <div className="instrument-cluster">
        <div>
          <p className="meta" style={{ margin: 0 }}>APP</p>
          <p className="status-value">{APP_RELEASE}</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>BUILD</p>
          <p className="status-value">{BUILD_COMMIT}</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>ENGINE</p>
          <p className="status-value">{ENGINE_VERSION}</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>SCHEMA</p>
          <p className="status-value">{String(DATA_SCHEMA)}</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>ACTIVE DAY</p>
          <p className="status-value">{activeDayYes ? "YES" : "NO"}</p>
        </div>
      </div>
      <details className="why">
        <summary>Diagnostic detail</summary>
        <div style={{ marginTop: 8 }}>
          <DiagRow label="Built" value={BUILD_TIME} />
          <DiagRow label="Days" value={String(days)} />
          <DiagRow label="Events" value={String(events)} />
          <DiagRow label="Recommendations" value={String(recommendations)} />
          {/* Intelligence Spine — I2 (controlled consumption proof,
              approved 2026-08-22): same TECHNICAL DETAIL tier as the raw
              counts above — a real, already-computed derived count, never
              fabricated telemetry (see this section's own doc comment
              above on that doctrine). Purely informational: no button, no
              accept/decline, nothing resembling a Recommendation. Safe
              when zero — indistinguishable in weight from every other
              reading here. */}
          <DiagRow label="Advisory notes" value={String(advisoryNotes.length)} />
          {advisoryNotes.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {advisoryNotes.map((note) => (
                <p key={note.id} className="meta" style={{ margin: "2px 0" }}>{note.message}</p>
              ))}
            </div>
          )}
        </div>
      </details>
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
