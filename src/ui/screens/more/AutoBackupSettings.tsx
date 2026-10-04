import { useRef, useState } from "react";
import {
  AUTO_BACKUP_INTERVALS,
  checkBackupFile,
  getAutoBackupPreference,
  setAutoBackupPreferenceAndReset,
  type AutoBackupPreference,
} from "../../../application/autoBackupQueries";
import { describeError } from "../../errorMessage";
import { describeRestoreCheck } from "../../components/restoreCheckCopy";

/**
 * BACKUP-AUTO-001 (owner brief 2026-10-04, decision 2A): MORE → Data safety's
 * AUTOMATIC BACKUP row. Off by default. On: when a backup is due, TODAY
 * shows one line and BACK UP NOW opens the phone's share menu, where the
 * destination (Drive, Files, a file share) is picked. CHECK A BACKUP runs
 * the restore check on demand; TODAY also asks for it once a month.
 */
export function AutoBackupSettings() {
  const [preference, setPreference] = useState<AutoBackupPreference>(() => getAutoBackupPreference());
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save(next: AutoBackupPreference) {
    setAutoBackupPreferenceAndReset(next);
    setPreference(next);
  }

  async function handleCheck(file: File | undefined) {
    if (busy || !file) return;
    setBusy(true);
    try {
      setCheckMessage(describeRestoreCheck(await checkBackupFile(file), file));
    } catch (e) {
      setCheckMessage(describeError(e, "Could not read that file."));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>AUTOMATIC BACKUP</p>
      <p className="card-body" style={{ marginBottom: 8 }}>
        {preference.enabled ? `On, every ${describeInterval(preference.everyDays)}.` : "Off."}
      </p>
      <p className="meta" style={{ marginBottom: 8 }}>
        When one is due, TODAY asks when you open BEYOND. You pick where it goes in your phone's share menu: Drive,
        Files or a file share.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn-secondary" style={{ width: "auto" }} onClick={() => save({ ...preference, enabled: !preference.enabled })}>
          {preference.enabled ? "TURN OFF" : "TURN ON"}
        </button>
        {preference.enabled && (
          <select
            aria-label="Back up every"
            value={preference.everyDays}
            onChange={(e) => save({ ...preference, everyDays: Number(e.target.value) })}
          >
            {AUTO_BACKUP_INTERVALS.map((days) => (
              <option key={days} value={days}>
                Every {describeInterval(days)}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="meta" style={{ marginTop: 12, marginBottom: 8 }}>
        Check a backup file reads back correctly. Nothing on this device changes.
      </p>
      <button className="btn-secondary" style={{ width: "auto" }} disabled={busy} onClick={() => fileInputRef.current?.click()}>
        CHECK A BACKUP
      </button>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        aria-label="Choose a backup file to check"
        onChange={(e) => void handleCheck(e.target.files?.[0])}
      />
      {checkMessage && (
        <p className="meta" role="status" style={{ marginTop: 8, marginBottom: 0 }}>
          {checkMessage}
        </p>
      )}
    </div>
  );
}

function describeInterval(days: number): string {
  return days === 1 ? "day" : `${days} days`;
}
