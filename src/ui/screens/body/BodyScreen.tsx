import { useEffect, useState } from "react";
import { ConfirmIcon } from "../../icons/Icon";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import {
  logWater,
  correctWater,
  logSleep,
  correctSleep,
  logBodyweight,
  correctBodyweight,
  logProtein,
  correctProtein,
  ensureActiveDay,
} from "../../../application/commands";
import {
  getActiveDay,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getSleepEntries,
  getBodyweightEntries,
  getProteinEntries,
  type SleepEntry,
  type BodyweightEntry,
  type ProteinEntry,
} from "../../../application/queries";
import {
  BODYWEIGHT_PLAUSIBLE_RANGE,
  describeBodyweightLogged,
  describeImplausibleBodyweight,
  describeImplausibleProtein,
  describeImplausibleSleep,
  describeProteinLogged,
  describeSleepLogged,
  describeWaterLogged,
  formatDuration,
  hoursAndMinutesToTotalMinutes,
  isImplausible,
  PROTEIN_PLAUSIBLE_RANGE,
  SLEEP_PRIMARY_PLAUSIBLE_RANGE,
  SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE,
  totalMinutesToHoursAndMinutes,
  WATER_QUICK_ADD_OZ,
} from "./bodyScreenCopy";

type Confirmation = { message: string; headEventId: string } | null;

export function BodyScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Water
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState("");
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [waterConfirmation, setWaterConfirmation] = useState<Confirmation>(null);
  const [waterHistoryOpen, setWaterHistoryOpen] = useState(false);
  // Overdrive Phase 18 (REAL-DEVICE ACCEPTANCE CORRECTION, BODY
  // GLANCEABILITY): the manual custom-amount entry is a fallback once
  // quick-add already covers the common case — defaults collapsed so
  // each card reads as "fast action, then more if you need it" instead
  // of a permanently-open form. Progressively disclosed, never removed.
  const [waterManualOpen, setWaterManualOpen] = useState(false);

  // Sleep
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [sleepKind, setSleepKind] = useState<"PRIMARY" | "SUPPLEMENTAL">("PRIMARY");
  const [sleepHoursInput, setSleepHoursInput] = useState("");
  const [sleepMinutesInput, setSleepMinutesInput] = useState("");
  const [sleepPendingConfirm, setSleepPendingConfirm] = useState(false);
  const [sleepCorrectingId, setSleepCorrectingId] = useState<string | null>(null);
  const [sleepCorrectionHours, setSleepCorrectionHours] = useState("");
  const [sleepCorrectionMinutes, setSleepCorrectionMinutes] = useState("");
  const [sleepConfirmation, setSleepConfirmation] = useState<Confirmation>(null);
  const [sleepHistoryOpen, setSleepHistoryOpen] = useState(false);

  // Bodyweight
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightEntry[]>([]);
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [bodyweightPendingConfirm, setBodyweightPendingConfirm] = useState(false);
  const [bodyweightCorrectingId, setBodyweightCorrectingId] = useState<string | null>(null);
  const [bodyweightCorrectionInput, setBodyweightCorrectionInput] = useState("");
  const [bodyweightConfirmation, setBodyweightConfirmation] = useState<Confirmation>(null);
  const [bodyweightHistoryOpen, setBodyweightHistoryOpen] = useState(false);
  // Manual entry only has a real "fast path" alternative (SAME AS LAST)
  // once a prior entry exists — see the `bodyweightManualOpen ||
  // !lastBodyweightEntry` condition further down.
  const [bodyweightManualOpen, setBodyweightManualOpen] = useState(false);

  // Protein
  const [proteinEntries, setProteinEntries] = useState<ProteinEntry[]>([]);
  const [proteinInput, setProteinInput] = useState("");
  const [proteinPendingConfirm, setProteinPendingConfirm] = useState(false);
  const [proteinCorrectingId, setProteinCorrectingId] = useState<string | null>(null);
  const [proteinCorrectionInput, setProteinCorrectionInput] = useState("");
  const [proteinConfirmation, setProteinConfirmation] = useState<Confirmation>(null);
  const [proteinHistoryOpen, setProteinHistoryOpen] = useState(false);
  const [proteinManualOpen, setProteinManualOpen] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    if (activeDay) {
      setEntries(await getHydrationEntries(activeDay.id));
      setTotal(await getEffectiveHydrationTotal(activeDay.id));
      setSleepEntries(await getSleepEntries(activeDay.id));
      setBodyweightEntries(await getBodyweightEntries(activeDay.id));
      setProteinEntries(await getProteinEntries(activeDay.id));
    }
  }

  const proteinTotal = proteinEntries.reduce((sum, e) => sum + e.effectiveGrams, 0);
  const lastWaterAmount = entries.length > 0 ? entries[entries.length - 1]!.effectiveAmountOz : null;
  const lastSleepEntry = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1]! : null;
  const lastBodyweightEntry = bodyweightEntries.length > 0 ? bodyweightEntries[bodyweightEntries.length - 1]! : null;
  const lastProteinEntry = proteinEntries.length > 0 ? proteinEntries[proteinEntries.length - 1]! : null;

  // ---- SLEEP ----

  async function handleLogSleep(skipConfirm = false) {
    if (busy) return;
    const hours = Number(sleepHoursInput) || 0;
    const minutes = Number(sleepMinutesInput) || 0;
    const totalMinutes = hoursAndMinutesToTotalMinutes(hours, minutes);
    if (totalMinutes <= 0) {
      setError("Enter a sleep duration.");
      return;
    }
    const range = sleepKind === "PRIMARY" ? SLEEP_PRIMARY_PLAUSIBLE_RANGE : SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE;
    if (!skipConfirm && isImplausible(totalMinutes, range)) {
      setSleepPendingConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    setSleepPendingConfirm(false);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logSleep(activeDay.id, totalMinutes, sleepKind);
      setSleepHoursInput("");
      setSleepMinutesInput("");
      setSleepKind("PRIMARY");
      setSleepConfirmation({ message: describeSleepLogged(totalMinutes), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function beginCorrectSleep(entry: SleepEntry) {
    setSleepCorrectingId(entry.headEventId);
    const { hours, minutes } = totalMinutesToHoursAndMinutes(entry.effectiveDurationMinutes);
    setSleepCorrectionHours(String(hours));
    setSleepCorrectionMinutes(String(minutes));
    setError(null);
    // The correction row lives inside the collapsed history disclosure —
    // called from the just-logged confirmation banner too, where that
    // disclosure may still be closed.
    setSleepHistoryOpen(true);
  }

  async function handleSaveSleepCorrection() {
    if (busy || !day || !sleepCorrectingId) return;
    const hours = Number(sleepCorrectionHours) || 0;
    const minutes = Number(sleepCorrectionMinutes) || 0;
    const totalMinutes = hoursAndMinutesToTotalMinutes(hours, minutes);
    if (totalMinutes <= 0) {
      setError("Enter a sleep duration.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctSleep(day.id, sleepCorrectingId, totalMinutes);
      setSleepCorrectingId(null);
      if (sleepConfirmation?.headEventId === sleepCorrectingId) setSleepConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- BODYWEIGHT ----

  async function handleLogBodyweightAmount(weight: number) {
    if (busy || weight <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logBodyweight(activeDay.id, weight);
      setBodyweightInput("");
      setBodyweightConfirmation({ message: describeBodyweightLogged(weight), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogBodyweight(skipConfirm = false) {
    if (busy) return;
    const weight = Number(bodyweightInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a positive weight in lbs.");
      return;
    }
    if (!skipConfirm && isImplausible(weight, BODYWEIGHT_PLAUSIBLE_RANGE)) {
      setBodyweightPendingConfirm(true);
      return;
    }
    setBodyweightPendingConfirm(false);
    await handleLogBodyweightAmount(weight);
  }

  function beginCorrectBodyweight(entry: BodyweightEntry) {
    setBodyweightCorrectingId(entry.headEventId);
    setBodyweightCorrectionInput(String(entry.effectiveWeightLbs));
    setError(null);
    setBodyweightHistoryOpen(true);
  }

  async function handleSaveBodyweightCorrection() {
    if (busy || !day || !bodyweightCorrectingId) return;
    const weight = Number(bodyweightCorrectionInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a positive weight in lbs.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctBodyweight(day.id, bodyweightCorrectingId, weight);
      setBodyweightCorrectingId(null);
      if (bodyweightConfirmation?.headEventId === bodyweightCorrectingId) setBodyweightConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- PROTEIN ----

  async function handleLogProteinAmount(grams: number) {
    if (busy || grams <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logProtein(activeDay.id, grams);
      setProteinInput("");
      setProteinConfirmation({ message: describeProteinLogged(grams), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogProtein(skipConfirm = false) {
    if (busy) return;
    const grams = Number(proteinInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a positive number of grams.");
      return;
    }
    if (!skipConfirm && isImplausible(grams, PROTEIN_PLAUSIBLE_RANGE)) {
      setProteinPendingConfirm(true);
      return;
    }
    setProteinPendingConfirm(false);
    await handleLogProteinAmount(grams);
  }

  function beginCorrectProtein(entry: ProteinEntry) {
    setProteinCorrectingId(entry.headEventId);
    setProteinCorrectionInput(String(entry.effectiveGrams));
    setError(null);
    setProteinHistoryOpen(true);
  }

  async function handleSaveProteinCorrection() {
    if (busy || !day || !proteinCorrectingId) return;
    const grams = Number(proteinCorrectionInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a positive number of grams.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctProtein(day.id, proteinCorrectingId, grams);
      setProteinCorrectingId(null);
      if (proteinConfirmation?.headEventId === proteinCorrectingId) setProteinConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- WATER ----

  async function handleLogWaterAmount(amount: number) {
    if (busy || amount <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logWater(activeDay.id, amount);
      setInput("");
      setWaterConfirmation({ message: describeWaterLogged(amount), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLog() {
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive number of ounces.");
      return;
    }
    await handleLogWaterAmount(amount);
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
      if (waterConfirmation?.headEventId === entry.headEventId) setWaterConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen fade-in">
      <p className="eyebrow">BODY // ESSENTIALS</p>
      <h1 className="title">Readiness inputs</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        Fast inputs, kept as a permanent record. Correct mistakes without erasing what happened.
      </p>

      {/* Overdrive Phase 5: a single glanceable status strip before the
          four separate logging cards, so BODY reads as one physical-status
          subsystem at a glance instead of four unrelated forms you have to
          scroll through to piece together. Purely a summary of state
          already computed below (total/proteinTotal/lastSleepEntry/
          lastBodyweightEntry) — no new query, no new fact, nothing this
          strip shows isn't already the source of truth for its own card. */}
      {/* Overdrive Phase 13 (BODY -> PHYSICAL STATUS 2.0): "Status" / "Log"
          section-labels give this screen the two groups it actually has
          instead of leaving the strip unlabeled above four identical
          cards. No corner-flag here, deliberately — BODY's four trackers
          are peer subsystems, not one leading recommendation the way
          TODAY/TRAIN have; marking any single one of them as "the leader"
          would manufacture a hierarchy that doesn't exist in the product. */}
      <p className="section-label">Status</p>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <p className="meta" style={{ margin: 0 }}>WATER</p>
          <p className="status-value">{total} oz</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>PROTEIN</p>
          <p className="status-value">{proteinTotal} g</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>SLEEP</p>
          <p className="status-value">{lastSleepEntry ? formatDuration(lastSleepEntry.effectiveDurationMinutes) : "Not logged"}</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>WEIGHT</p>
          <p className="status-value">{lastBodyweightEntry ? `${lastBodyweightEntry.effectiveWeightLbs} lbs` : "Not logged"}</p>
        </div>
      </div>

      <p className="section-label">Log</p>

      {/* WATER — one consolidated card: current total, fastest actions, custom fallback, collapsed history. */}
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>HYDRATION</p>
        <p className="recommendation-title" style={{ marginBottom: 12 }}>{total} oz today</p>
        {/* Overdrive Phase 18 (PHONE WIDTH + BODY GLANCEABILITY): quick-add
            and "repeat last" used to share one flexWrap row — at a real
            narrow-Android content width their combined minimum widths sat
            right at the wrap boundary, an unpredictable break. Separate
            rows remove the ambiguity entirely and read as two distinct
            fast actions rather than one crowded strip. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {WATER_QUICK_ADD_OZ.map((amount) => (
            <button
              key={amount}
              className="btn-secondary"
              style={{ flex: 1, minWidth: 60 }}
              disabled={busy}
              onClick={() => void handleLogWaterAmount(amount)}
            >
              +{amount} oz
            </button>
          ))}
        </div>
        <button
          className="btn-secondary"
          style={{ marginBottom: 8 }}
          disabled={busy || lastWaterAmount === null}
          onClick={() => lastWaterAmount !== null && void handleLogWaterAmount(lastWaterAmount)}
        >
          {lastWaterAmount !== null ? `Repeat last (${lastWaterAmount} oz)` : "Repeat last"}
        </button>
        <button className="btn-secondary" onClick={() => setWaterManualOpen((v) => !v)}>
          {waterManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY
        </button>
        {waterManualOpen && (
          <div className="fade-in" style={{ marginTop: 12 }}>
            <div className="field">
              <label><span>Custom (oz)</span></label>
              <input type="number" min={0} value={input} onChange={(e) => setInput(e.target.value)} className="input" />
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => void handleLog()}>
              LOG WATER
            </button>
          </div>
        )}
        {waterConfirmation && (
          <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {waterConfirmation.message}
            </p>
            <button
              className="btn-secondary"
              style={{ width: "auto", padding: "6px 12px", fontSize: 16 }}
              onClick={() => {
                const entry = entries.find((e) => e.headEventId === waterConfirmation.headEventId);
                if (entry) {
                  setCorrectingId(entry.headEventId);
                  setCorrectionInput(String(entry.effectiveAmountOz));
                  setError(null);
                  setWaterHistoryOpen(true);
                }
              }}
            >
              CORRECT
            </button>
          </div>
        )}
        {error && <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}

        {entries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <button className="btn-secondary" onClick={() => setWaterHistoryOpen((v) => !v)}>
              {waterHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES ({entries.length})
            </button>
            {waterHistoryOpen && (
              <div className="fade-in" style={{ marginTop: 12 }}>
                <p className="card-body" style={{ marginBottom: 12 }}>
                  Correcting an entry keeps the original and shows the corrected number — nothing is deleted.
                </p>
                {entries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveAmountOz} oz</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ width: "auto", padding: "8px 14px" }}
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
                          className="input"
                          style={{ flex: 1 }}
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
            )}
          </div>
        )}
      </div>

      {/* SLEEP */}
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>SLEEP</p>
        <p className="card-body" style={{ marginBottom: 12 }}>
          {lastSleepEntry
            ? `Last: ${lastSleepEntry.kind === "PRIMARY" ? "main sleep" : "nap"}, ${formatDuration(lastSleepEntry.effectiveDurationMinutes)} at ${new Date(lastSleepEntry.recordedAt).toLocaleTimeString()}`
            : "No sleep logged yet today."}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className={`chip ${sleepKind === "PRIMARY" ? "chip--selected" : ""}`}
            aria-pressed={sleepKind === "PRIMARY"}
            onClick={() => {
              setSleepKind("PRIMARY");
              setSleepPendingConfirm(false);
            }}
          >
            MAIN SLEEP
          </button>
          <button
            type="button"
            className={`chip ${sleepKind === "SUPPLEMENTAL" ? "chip--selected" : ""}`}
            aria-pressed={sleepKind === "SUPPLEMENTAL"}
            onClick={() => {
              setSleepKind("SUPPLEMENTAL");
              setSleepPendingConfirm(false);
            }}
          >
            NAP
          </button>
        </div>
        <p className="card-body" style={{ marginBottom: 12 }}>
          {sleepKind === "PRIMARY"
            ? "Main sleep suggests ending your day on TODAY once logged."
            : "A nap doesn't suggest ending your day — log the sleep that actually closes it out as Main Sleep."}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label><span>Hours</span></label>
            <input
              type="number"
              min={0}
              value={sleepHoursInput}
              onChange={(e) => {
                setSleepHoursInput(e.target.value);
                setSleepPendingConfirm(false);
              }}
              className="input"
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label><span>Minutes</span></label>
            <input
              type="number"
              min={0}
              max={59}
              value={sleepMinutesInput}
              onChange={(e) => {
                setSleepMinutesInput(e.target.value);
                setSleepPendingConfirm(false);
              }}
              className="input"
            />
          </div>
        </div>
        {sleepPendingConfirm && (
          <div style={{ marginBottom: 12 }}>
            <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
              {describeImplausibleSleep(
                hoursAndMinutesToTotalMinutes(Number(sleepHoursInput) || 0, Number(sleepMinutesInput) || 0),
              )}
            </p>
            <button className="btn-secondary" disabled={busy} onClick={() => void handleLogSleep(true)}>
              LOG ANYWAY
            </button>
          </div>
        )}
        {!sleepPendingConfirm && (
          <button className="btn-primary" disabled={busy} onClick={() => void handleLogSleep()}>
            LOG SLEEP
          </button>
        )}
        {sleepConfirmation && (
          <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {sleepConfirmation.message}
            </p>
            <button
              className="btn-secondary"
              style={{ width: "auto", padding: "6px 12px", fontSize: 16 }}
              onClick={() => {
                const entry = sleepEntries.find((e) => e.headEventId === sleepConfirmation.headEventId);
                if (entry) beginCorrectSleep(entry);
              }}
            >
              CORRECT
            </button>
          </div>
        )}

        {sleepEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <button className="btn-secondary" onClick={() => setSleepHistoryOpen((v) => !v)}>
              {sleepHistoryOpen ? "HIDE" : "SHOW"} TODAY'S SLEEP ({sleepEntries.length})
            </button>
            {sleepHistoryOpen && (
              <div className="fade-in" style={{ marginTop: 12 }}>
                {sleepEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>
                          {entry.kind === "PRIMARY" ? "Main sleep" : "Nap"} — {formatDuration(entry.effectiveDurationMinutes)}
                        </p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectSleep(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {sleepCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                          <label><span>Hours</span></label>
                          <input type="number" min={0} value={sleepCorrectionHours} onChange={(e) => setSleepCorrectionHours(e.target.value)} className="input" />
                        </div>
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                          <label><span>Minutes</span></label>
                          <input type="number" min={0} max={59} value={sleepCorrectionMinutes} onChange={(e) => setSleepCorrectionMinutes(e.target.value)} className="input" />
                        </div>
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveSleepCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BODYWEIGHT */}
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>BODYWEIGHT</p>
        <p className="card-body" style={{ marginBottom: 12 }}>
          {lastBodyweightEntry
            ? `Last: ${lastBodyweightEntry.effectiveWeightLbs} lbs at ${new Date(lastBodyweightEntry.recordedAt).toLocaleTimeString()}`
            : "No bodyweight logged yet today."}
          {" "}A fact only — no goal.
        </p>
        {/* Overdrive Phase 18 (BODY GLANCEABILITY): manual entry only has
            a genuine fast-path alternative once a prior weight exists
            (SAME AS LAST) — collapsed by default in that case, always
            open when it's the only path (first-ever log). */}
        {lastBodyweightEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: 12 }}
            disabled={busy}
            onClick={() => void handleLogBodyweightAmount(lastBodyweightEntry.effectiveWeightLbs)}
          >
            SAME AS LAST ({lastBodyweightEntry.effectiveWeightLbs} lbs)
          </button>
        )}
        {lastBodyweightEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: bodyweightManualOpen ? 12 : 0 }}
            onClick={() => setBodyweightManualOpen((v) => !v)}
          >
            {bodyweightManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY
          </button>
        )}
        {(bodyweightManualOpen || !lastBodyweightEntry) && (
          <div className="fade-in">
            <div className="field">
              <label><span>Weight (lbs)</span></label>
              <input
                type="number"
                min={0}
                value={bodyweightInput}
                onChange={(e) => {
                  setBodyweightInput(e.target.value);
                  setBodyweightPendingConfirm(false);
                }}
                className="input"
              />
            </div>
            {bodyweightPendingConfirm && (
              <div style={{ marginBottom: 12 }}>
                <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
                  {describeImplausibleBodyweight(Number(bodyweightInput) || 0)}
                </p>
                <button className="btn-secondary" disabled={busy} onClick={() => void handleLogBodyweight(true)}>
                  LOG ANYWAY
                </button>
              </div>
            )}
            {!bodyweightPendingConfirm && (
              <button className="btn-primary" disabled={busy} onClick={() => void handleLogBodyweight()}>
                LOG BODYWEIGHT
              </button>
            )}
          </div>
        )}
        {bodyweightConfirmation && (
          <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {bodyweightConfirmation.message}
            </p>
            <button
              className="btn-secondary"
              style={{ width: "auto", padding: "6px 12px", fontSize: 16 }}
              onClick={() => {
                const entry = bodyweightEntries.find((e) => e.headEventId === bodyweightConfirmation.headEventId);
                if (entry) beginCorrectBodyweight(entry);
              }}
            >
              CORRECT
            </button>
          </div>
        )}

        {bodyweightEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <button className="btn-secondary" onClick={() => setBodyweightHistoryOpen((v) => !v)}>
              {bodyweightHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES ({bodyweightEntries.length})
            </button>
            {bodyweightHistoryOpen && (
              <div className="fade-in" style={{ marginTop: 12 }}>
                {bodyweightEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveWeightLbs} lbs</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectBodyweight(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {bodyweightCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <input type="number" value={bodyweightCorrectionInput} onChange={(e) => setBodyweightCorrectionInput(e.target.value)} className="input" style={{ flex: 1 }} />
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveBodyweightCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROTEIN */}
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>PROTEIN</p>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Today: {proteinTotal} g. No daily target — logs the amount only.
        </p>
        {lastProteinEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: 12 }}
            disabled={busy}
            onClick={() => void handleLogProteinAmount(lastProteinEntry.effectiveGrams)}
          >
            REPEAT LAST ({lastProteinEntry.effectiveGrams} g)
          </button>
        )}
        {lastProteinEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: proteinManualOpen ? 12 : 0 }}
            onClick={() => setProteinManualOpen((v) => !v)}
          >
            {proteinManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY
          </button>
        )}
        {(proteinManualOpen || !lastProteinEntry) && (
          <div className="fade-in">
            <div className="field">
              <label><span>Protein (g)</span></label>
              <input
                type="number"
                min={0}
                value={proteinInput}
                onChange={(e) => {
                  setProteinInput(e.target.value);
                  setProteinPendingConfirm(false);
                }}
                className="input"
              />
            </div>
            {proteinPendingConfirm && (
              <div style={{ marginBottom: 12 }}>
                <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
                  {describeImplausibleProtein(Number(proteinInput) || 0)}
                </p>
                <button className="btn-secondary" disabled={busy} onClick={() => void handleLogProtein(true)}>
                  LOG ANYWAY
                </button>
              </div>
            )}
            {!proteinPendingConfirm && (
              <button className="btn-primary" disabled={busy} onClick={() => void handleLogProtein()}>
                LOG PROTEIN
              </button>
            )}
          </div>
        )}
        {proteinConfirmation && (
          <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {proteinConfirmation.message}
            </p>
            <button
              className="btn-secondary"
              style={{ width: "auto", padding: "6px 12px", fontSize: 16 }}
              onClick={() => {
                const entry = proteinEntries.find((e) => e.headEventId === proteinConfirmation.headEventId);
                if (entry) beginCorrectProtein(entry);
              }}
            >
              CORRECT
            </button>
          </div>
        )}

        {proteinEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <button className="btn-secondary" onClick={() => setProteinHistoryOpen((v) => !v)}>
              {proteinHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES ({proteinEntries.length})
            </button>
            {proteinHistoryOpen && (
              <div className="fade-in" style={{ marginTop: 12 }}>
                {proteinEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveGrams} g</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectProtein(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {proteinCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <input type="number" value={proteinCorrectionInput} onChange={(e) => setProteinCorrectionInput(e.target.value)} className="input" style={{ flex: 1 }} />
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveProteinCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
