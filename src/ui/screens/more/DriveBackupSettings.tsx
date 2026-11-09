import { useState } from "react";
import {
  backUpToDrive,
  connectDriveBackup,
  disconnectDriveBackup,
  getDriveBackupState,
  type DriveBackupState,
} from "../../../application/driveBackup/driveBackupService";
import { loadGoogleIdentity } from "../../../application/driveBackup/googleAuth";
import { describeError } from "../../errorMessage";

/**
 * DRIVE-BACKUP-001: MORE → Data safety → Automatic backups, the GOOGLE DRIVE row. Off until set up.
 * Setup asks for a passphrase, then shows the recovery code ONCE with the "lose both" warning. The share
 * sheet above stays as it is.
 */
export function DriveBackupSettings({ onChanged }: { onChanged?: () => void }) {
  const [state, setState] = useState<DriveBackupState>(() => getDriveBackupState());
  const [mode, setMode] = useState<"IDLE" | "SETUP" | "DISCONNECT">("IDLE");
  const [passphrase, setPassphrase] = useState("");
  const [again, setAgain] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    setState(getDriveBackupState());
    onChanged?.();
  }

  function openSetup() {
    setMode("SETUP");
    setMessage(null);
    void loadGoogleIdentity().catch(() => {}); // warm up so CONNECT's sign-in opens straight from the tap
  }

  async function connect() {
    if (busy) return;
    if (passphrase.length < 8) { setMessage("Use at least 8 characters."); return; }
    if (passphrase !== again) { setMessage("The two passphrases don't match."); return; }
    setBusy(true);
    setMessage(null);
    try {
      const { recoveryCode: code, firstBackup } = await connectDriveBackup(passphrase);
      setRecoveryCode(code);
      setPassphrase(""); setAgain(""); setMode("IDLE");
      setMessage(firstBackup.kind === "OK" ? "Connected. First backup saved to Drive." : `Connected. ${"message" in firstBackup ? firstBackup.message : ""}`.trim());
      refresh();
    } catch (e) {
      setMessage(describeError(e, "Couldn't connect to Google Drive."));
    } finally {
      setBusy(false);
    }
  }

  async function backUp() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await backUpToDrive({ interactive: true });
      setMessage(result.kind === "OK" ? "Backed up to Drive." : "message" in result ? result.message : null);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectDriveBackup();
      setMode("IDLE");
      setMessage("Disconnected. Backups already in Drive stay there.");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drive-backup" style={{ marginTop: 16 }}>
      <p className="tool-label" style={{ marginBottom: 4 }}>GOOGLE DRIVE</p>
      <p className="card-body" style={{ marginBottom: 8 }}>{describeDriveState(state)}</p>

      {recoveryCode && (
        <div className="drive-backup__code" role="group" aria-label="Recovery code">
          <p className="meta" style={{ marginBottom: 4 }}>Your recovery code. Write it down — it's shown only this once.</p>
          <p className="card-title" style={{ fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em", wordBreak: "break-word" }}>{recoveryCode}</p>
          <p className="meta" style={{ marginTop: 8, marginBottom: 8 }}>
            Your passphrase or this code opens your backups. If you lose both, nobody — including you — can open them.
          </p>
          <button className="btn-secondary" style={{ width: "auto" }} onClick={() => setRecoveryCode(null)}>I'VE WRITTEN IT DOWN</button>
        </div>
      )}

      {!state.on && mode !== "SETUP" && !recoveryCode && (
        <>
          <p className="meta" style={{ marginBottom: 8 }}>
            A locked copy in your Google Drive once a day. Only your passphrase or recovery code opens it.
          </p>
          <button className="btn-secondary" style={{ width: "auto" }} onClick={openSetup}>SET UP</button>
        </>
      )}

      {mode === "SETUP" && (
        <form onSubmit={(e) => { e.preventDefault(); void connect(); }} style={{ display: "grid", gap: 8 }}>
          <label className="meta">
            Passphrase (8+ characters)
            <input type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </label>
          <label className="meta">
            Passphrase again
            <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </label>
          <p className="meta" style={{ margin: 0 }}>
            Next you'll get a recovery code. If you lose both, nobody — including you — can open these backups.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-secondary" style={{ width: "auto" }} disabled={busy}>{busy ? "CONNECTING…" : "CONNECT GOOGLE DRIVE"}</button>
            <button type="button" className="backup-due__later" disabled={busy} onClick={() => { setMode("IDLE"); setPassphrase(""); setAgain(""); setMessage(null); }}>CANCEL</button>
          </div>
        </form>
      )}

      {state.on && mode === "IDLE" && !recoveryCode && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" style={{ width: "auto" }} disabled={busy} onClick={() => void backUp()}>
            {busy ? "BACKING UP…" : state.failure === "PAUSED" ? "RECONNECT" : "BACK UP NOW"}
          </button>
          <button className="backup-due__later" disabled={busy} onClick={() => setMode("DISCONNECT")}>DISCONNECT</button>
        </div>
      )}

      {mode === "DISCONNECT" && (
        <div>
          <p className="meta" style={{ marginBottom: 8 }}>
            Stops Drive backups and forgets this phone's key. Your data here and backups already in Drive stay.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ width: "auto" }} disabled={busy} onClick={() => void disconnect()}>DISCONNECT</button>
            <button className="backup-due__later" disabled={busy} onClick={() => setMode("IDLE")}>CANCEL</button>
          </div>
        </div>
      )}

      {message && <p className="meta" role="status" style={{ marginTop: 8, marginBottom: 0 }}>{message}</p>}
    </div>
  );
}

/** Never reads as success without a recorded success. */
export function describeDriveState(state: DriveBackupState): string {
  if (!state.on) return "Not set up.";
  if (state.failure === "PAUSED") return "Paused — tap RECONNECT.";
  const last = state.lastSuccessAt
    ? `Last backup ${new Date(state.lastSuccessAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.`
    : "No backup yet.";
  return state.failure === "FAILED" ? `Connected. Last attempt didn't finish. ${last}` : `Connected, once a day. ${last}`;
}
