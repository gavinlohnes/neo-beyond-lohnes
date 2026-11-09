import { useState } from "react";
import { listDriveBackups, openDriveBackup, type DriveFile } from "../../../application/driveBackup/driveBackupService";
import { describeError } from "../../errorMessage";

/**
 * DRIVE-BACKUP-001: restore from Google Drive. Lists BEYOND's backups (works on a new phone), unlocks the
 * chosen one with the passphrase or recovery code, then hands the ordinary backup file to the existing
 * preview-and-confirm restore. Nothing is replaced here.
 */
export function DriveRestorePicker({ onFile, disabled }: { onFile: (file: File) => void; disabled: boolean }) {
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [chosen, setChosen] = useState<DriveFile | null>(null);
  const [kind, setKind] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setMessage(null);
    try {
      const list = await listDriveBackups();
      setFiles(list);
      if (list.length === 0) setMessage("No BEYOND backups in your Drive yet.");
    } catch (e) {
      setMessage(describeError(e, "Couldn't open Google Drive."));
    } finally { setBusy(false); }
  }

  async function unlock() {
    if (!chosen || !secret) return;
    setBusy(true); setMessage(null);
    try {
      const file = await openDriveBackup(chosen, secret, kind);
      setSecret(""); setChosen(null); setFiles(null);
      onFile(file);
    } catch (e) {
      setMessage(describeError(e, "Couldn't unlock this backup."));
    } finally { setBusy(false); }
  }

  const off = busy || disabled;
  return (
    <div className="drive-restore" style={{ marginTop: 12 }}>
      {!files && (
        <button className="btn-secondary" style={{ width: "auto" }} disabled={off} onClick={() => void load()}>
          {busy ? "OPENING DRIVE…" : "CHOOSE FROM GOOGLE DRIVE"}
        </button>
      )}
      {files && !chosen && files.length > 0 && (
        <ul aria-label="Drive backups" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {files.map((f) => (
            <li key={f.id}>
              <button className="disclosure-row" style={{ width: "100%", textAlign: "left" }} disabled={off} onClick={() => setChosen(f)}>
                {new Date(f.createdTime).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
              </button>
            </li>
          ))}
        </ul>
      )}
      {chosen && (
        <form onSubmit={(e) => { e.preventDefault(); void unlock(); }} style={{ display: "grid", gap: 8 }}>
          <label className="meta">
            {kind === "passphrase" ? "Passphrase" : "Recovery code"}
            <input type={kind === "passphrase" ? "password" : "text"} autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </label>
          <button type="button" className="backup-due__later" style={{ justifySelf: "start" }} onClick={() => { setKind(kind === "passphrase" ? "recovery" : "passphrase"); setSecret(""); }}>
            {kind === "passphrase" ? "USE RECOVERY CODE INSTEAD" : "USE PASSPHRASE INSTEAD"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-secondary" style={{ width: "auto" }} disabled={off || !secret}>{busy ? "UNLOCKING…" : "UNLOCK"}</button>
            <button type="button" className="backup-due__later" disabled={busy} onClick={() => { setChosen(null); setSecret(""); setMessage(null); }}>BACK</button>
          </div>
        </form>
      )}
      {message && <p className="meta" role="status" style={{ marginTop: 8, marginBottom: 0 }}>{message}</p>}
    </div>
  );
}
