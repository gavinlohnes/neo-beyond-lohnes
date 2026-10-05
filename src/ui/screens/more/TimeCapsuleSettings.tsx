import { useEffect, useState } from "react";
import { sealTimeCapsule, type CapsuleMonths } from "../../../application/timeCapsuleCommands";
import { getTimeCapsules, type SealedCapsule } from "../../../application/timeCapsuleQueries";
import { TIME_CAPSULE_MAX_LENGTH, TIME_CAPSULE_MONTHS } from "../../../domain/common/types";
import { describeError } from "../../errorMessage";

const MONTH_LABEL: Record<CapsuleMonths, string> = { 1: "1 month", 3: "3 months", 6: "6 months", 12: "1 year" };

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): MORE → TIME CAPSULE. Write a
 * note to future you, pick when it opens, SEAL. Sealed capsules are listed by
 * opening date only; their text never shows here, only on TODAY when due.
 */
export function TimeCapsuleSettings() {
  const [waiting, setWaiting] = useState<SealedCapsule[]>([]);
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [months, setMonths] = useState<CapsuleMonths>(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let current = true;
    void getTimeCapsules().then((state) => {
      if (current) setWaiting(state.waiting);
    });
    return () => {
      current = false;
    };
  }, [loadKey]);

  async function seal() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sealTimeCapsule(note, months);
      setNote("");
      setWriting(false);
      setMessage(`Sealed. It opens in ${MONTH_LABEL[months]}.`);
      setLoadKey((k) => k + 1);
    } catch (e) {
      setError(describeError(e, "Not sealed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>TIME CAPSULE</p>
      <p className="meta" style={{ marginBottom: 8 }}>
        A note to future you. It stays sealed until the day it opens, then shows on TODAY.
      </p>
      {writing ? (
        <div>
          <textarea
            className="input"
            rows={3}
            maxLength={TIME_CAPSULE_MAX_LENGTH}
            aria-label="Note to future you"
            placeholder="e.g. Three months from now: did the 5 a.m. workouts stick?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ resize: "vertical" }}
          />
          <div className="capsule__months" role="group" aria-label="Opens in">
            {TIME_CAPSULE_MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                className={`chip${months === m ? " chip--selected" : ""}`}
                aria-pressed={months === m}
                onClick={() => setMonths(m)}
              >
                {MONTH_LABEL[m]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" disabled={busy || !note.trim()} onClick={() => void seal()}>
              SEAL
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setWriting(false)}>
              CANCEL
            </button>
          </div>
          {error && (
            <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn-secondary"
          style={{ width: "auto" }}
          onClick={() => {
            setMessage(null);
            setWriting(true);
          }}
        >
          WRITE ONE
        </button>
      )}
      {message && (
        <p className="meta" role="status" style={{ marginTop: 8 }}>
          {message}
        </p>
      )}
      {waiting.length > 0 && (
        <ul className="capsule__waiting" aria-label="Sealed capsules">
          {waiting.map((c) => (
            <li key={c.eventId} className="meta">
              Sealed {formatDay(c.sealedAt)} · opens {formatDay(c.opensOn)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDay(dateOrIso: string): string {
  // A bare "YYYY-MM-DD" is a local date; read it as local, not UTC.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso) ? new Date(`${dateOrIso}T12:00:00`) : new Date(dateOrIso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
