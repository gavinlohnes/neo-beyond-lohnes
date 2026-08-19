import { useEffect, useState } from "react";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import {
  logWater,
  correctWater,
  logSleep,
  logBodyweight,
  logProtein,
  ensureActiveDay,
} from "../../../application/commands";
import {
  getActiveDay,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getLatestSleepMinutes,
  getLatestBodyweight,
  getTotalProteinGrams,
} from "../../../application/queries";

export function BodyScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState("");
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState<number | undefined>(undefined);
  const [sleepInput, setSleepInput] = useState("");
  const [bodyweight, setBodyweight] = useState<number | undefined>(undefined);
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [proteinTotal, setProteinTotal] = useState(0);
  const [proteinInput, setProteinInput] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    if (activeDay) {
      setEntries(await getHydrationEntries(activeDay.id));
      setTotal(await getEffectiveHydrationTotal(activeDay.id));
      setSleepMinutes(await getLatestSleepMinutes(activeDay.id));
      setBodyweight(await getLatestBodyweight(activeDay.id));
      setProteinTotal(await getTotalProteinGrams(activeDay.id));
    }
  }

  async function handleLogSleep() {
    if (busy) return;
    const minutes = Number(sleepInput);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError("Enter a positive number of minutes.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      await logSleep(activeDay.id, minutes);
      setSleepInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogBodyweight() {
    if (busy) return;
    const weight = Number(bodyweightInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a positive weight in lbs.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      await logBodyweight(activeDay.id, weight);
      setBodyweightInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogProtein() {
    if (busy) return;
    const grams = Number(proteinInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a positive number of grams.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      await logProtein(activeDay.id, grams);
      setProteinInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLog() {
    if (busy) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive number of ounces.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      await logWater(activeDay.id, amount);
      setInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCorrect(entry: HydrationEntry) {
    if (busy || !day) return;
    const amount = Number(correctionInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive number of ounces.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctWater(day.id, entry.headEventId, amount);
      setCorrectingId(null);
      setCorrectionInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <p className="eyebrow">BODY // ESSENTIALS</p>
      <h1 className="title">Readiness inputs</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        Fast inputs. Committed history only. Correct mistakes without erasing what happened.
      </p>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>WATER</p>
        <p className="title" style={{ fontSize: 28, marginBottom: 0 }}>{total} oz</p>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>SLEEP</p>
        <h2 className="card-title">Primary sleep</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Duration only. No target — logged as a historical fact.
        </p>
        {sleepMinutes !== undefined && (
          <p className="meta" style={{ marginBottom: 8 }}>
            Logged: {Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m
          </p>
        )}
        <div className="field">
          <label><span>Duration (minutes)</span></label>
          <input
            type="number"
            min={0}
            value={sleepInput}
            onChange={(e) => setSleepInput(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              color: "var(--text-1)",
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => void handleLogSleep()}>
          LOG SLEEP
        </button>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>BODYWEIGHT</p>
        <h2 className="card-title">Log bodyweight</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          A fact only — no goal.
        </p>
        {bodyweight !== undefined && (
          <p className="meta" style={{ marginBottom: 8 }}>Latest: {bodyweight} lbs</p>
        )}
        <div className="field">
          <label><span>Weight (lbs)</span></label>
          <input
            type="number"
            min={0}
            value={bodyweightInput}
            onChange={(e) => setBodyweightInput(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              color: "var(--text-1)",
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => void handleLogBodyweight()}>
          LOG BODYWEIGHT
        </button>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>PROTEIN</p>
        <h2 className="card-title">Log protein</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          No daily target — logs the amount only.
        </p>
        <p className="meta" style={{ marginBottom: 8 }}>Today: {proteinTotal} g</p>
        <div className="field">
          <label><span>Protein (g)</span></label>
          <input
            type="number"
            min={0}
            value={proteinInput}
            onChange={(e) => setProteinInput(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              color: "var(--text-1)",
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => void handleLogProtein()}>
          LOG PROTEIN
        </button>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>HYDRATION</p>
        <h2 className="card-title">Log water</h2>
        <div className="field">
          <label><span>Water (oz)</span></label>
          <input
            type="number"
            min={0}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              color: "var(--text-1)",
              padding: "10px 12px",
              fontSize: 15,
            }}
          />
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => void handleLog()}>
          LOG WATER
        </button>
        {error && <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>TODAY'S HYDRATION HISTORY</p>
        <h2 className="card-title">Water entries</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Correction preserves the original fact and changes only the effective value.
        </p>
        {entries.length === 0 && <p className="meta">No entries yet.</p>}
        {entries.map((entry) => (
          <div
            key={entry.rootEventId}
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="card-title" style={{ marginBottom: 2 }}>{entry.effectiveAmountOz} oz</p>
                <p className="meta">
                  {new Date(entry.recordedAt).toLocaleTimeString()}
                  {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                </p>
              </div>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)", width: "auto", padding: "8px 14px" }}
                onClick={() => {
                  setCorrectingId(entry.headEventId);
                  setCorrectionInput(String(entry.effectiveAmountOz));
                  setError(null);
                }}
              >
                CORRECT
              </button>
            </div>
            {correctingId === entry.headEventId && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <input
                  type="number"
                  value={correctionInput}
                  onChange={(e) => setCorrectionInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    color: "var(--text-1)",
                    padding: "10px 12px",
                    fontSize: 15,
                  }}
                />
                <button
                  className="btn-primary"
                  style={{ width: "auto", padding: "10px 16px" }}
                  disabled={busy}
                  onClick={() => void handleCorrect(entry)}
                >
                  SAVE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
