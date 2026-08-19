import { useEffect, useState } from "react";
import type { BeyondDay, Recommendation, StateCheckIn } from "../../../domain/common/types";
import {
  startDay,
  ensureActiveDay,
  submitCheckIn,
  recordRecommendation,
  startReset,
  completeReset,
  startShiftDown,
  completeShiftDown,
  endDay,
  rateOutcome,
  setWorkContext,
  enableMinimumDay,
  markMedsCompleted,
  markHygieneCompleted,
  markMoveCompleted,
  markRecoverConnectCompleted,
} from "../../../application/commands";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  wasRecommendationRecorded,
  shouldSuggestEndDay,
  getPendingOutcomeRating,
  getScheduledContext,
  getMinimumDayStatus,
  getOpenReset,
  getOpenShiftDown,
  type MinimumDayStatus,
} from "../../../application/queries";
import { getDaysSinceLastBackup } from "../../../persistence/backup";
import type { ScheduledContext } from "../../../engine/scheduledContext";

const BACKUP_NUDGE_THRESHOLD_DAYS = 7;

type Values = Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">;

const defaultValues: Values = {
  energy: 3,
  stress: 3,
  mood: 3,
  soreness: 1,
  alcoholUrge: 0,
};

/**
 * Quick check-in default ("all good" one-tap, Context & Safety Decisions
 * 2026-08-19). Still produces a real StateCheckIn the Engine evaluates —
 * these values feed the locked capacity rule directly, so they were
 * chosen to land comfortably GREEN as "a genuinely fine day," not the
 * most extreme possible values. Confirmed with Gavin 2026-08-19.
 */
export const quickCheckInValues: Values = {
  energy: 4,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};

const fields: { key: keyof Values; min: number }[] = [
  { key: "energy", min: 1 },
  { key: "stress", min: 1 },
  { key: "mood", min: 1 },
  { key: "soreness", min: 0 },
  { key: "alcoholUrge", min: 0 },
];

export function TodayScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [values, setValues] = useState<Values>(defaultValues);
  const [busy, setBusy] = useState(false);
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [showReset, setShowReset] = useState(false);
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [showShiftDown, setShowShiftDown] = useState(false);
  const [suggestEndDay, setSuggestEndDay] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Recommendation | null>(null);
  const [outcomeDismissed, setOutcomeDismissed] = useState(false);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  const [minimumDay, setMinimumDay] = useState<MinimumDayStatus | null>(null);

  useEffect(() => {
    void refresh();
    setDaysSinceBackup(getDaysSinceLastBackup());
    setScheduledContext(getScheduledContext());
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    if (activeDay) {
      setCheckIn((await getLatestCheckIn(activeDay.id)) ?? null);
      const rec = (await getLatestRecommendation(activeDay.id)) ?? null;
      setRecommendation(rec);
      setRecorded(rec ? await wasRecommendationRecorded(activeDay.id, rec.id) : false);
      setSuggestEndDay(await shouldSuggestEndDay(activeDay.id));
      setPendingOutcome((await getPendingOutcomeRating(activeDay.id)) ?? null);
      setMinimumDay(await getMinimumDayStatus(activeDay.id));

      const openReset = await getOpenReset(activeDay.id);
      if (openReset) {
        setActiveResetId(openReset.eventId);
        setResetIntensity(openReset.intensity);
        setShowReset(true);
      } else {
        setActiveResetId(null);
      }

      const openShiftDown = await getOpenShiftDown(activeDay.id);
      if (openShiftDown) {
        setActiveShiftDownId(openShiftDown.eventId);
        setShiftDownDuration(openShiftDown.durationMinutes);
        setShowShiftDown(true);
      } else {
        setActiveShiftDownId(null);
      }
    }
  }

  async function handleStartDay() {
    if (busy) return;
    setBusy(true);
    try {
      setDay(await startDay());
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    if (busy) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, values);
      // Refetch everything derived from the new recommendation — not just
      // checkIn/recommendation — so pendingOutcome (CP10) and any other
      // derived state stay in sync without requiring a page reload.
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickCheckIn() {
    if (busy) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, quickCheckInValues);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRecord() {
    if (busy || !day || !recommendation) return;
    setBusy(true);
    try {
      await recordRecommendation(day.id, recommendation);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStartReset() {
    if (busy || !day) return;
    setBusy(true);
    try {
      const id = await startReset(day.id, resetIntensity);
      setActiveResetId(id);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteReset() {
    if (busy || !day || !activeResetId) return;
    setBusy(true);
    try {
      await completeReset(day.id, activeResetId);
      setActiveResetId(null);
      setShowReset(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartShiftDown() {
    if (busy || !day) return;
    setBusy(true);
    try {
      const id = await startShiftDown(day.id, shiftDownDuration);
      setActiveShiftDownId(id);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteShiftDown() {
    if (busy || !day || !activeShiftDownId) return;
    setBusy(true);
    try {
      await completeShiftDown(day.id, activeShiftDownId);
      setActiveShiftDownId(null);
      setShowShiftDown(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleEndDay() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await endDay(day.id, "EXPLICIT_END_DAY");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptScheduledContext(value: "WORK" | "OFF") {
    if (busy || !day) return;
    setBusy(true);
    try {
      await setWorkContext(day.id, value, "SCHEDULE_SUGGESTION_ACCEPTED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableMinimumDay() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await enableMinimumDay(day.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkMinimum(kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER_CONNECT") {
    if (busy || !day) return;
    setBusy(true);
    try {
      if (kind === "MEDS") await markMedsCompleted(day.id);
      else if (kind === "HYGIENE") await markHygieneCompleted(day.id);
      else if (kind === "MOVE") await markMoveCompleted(day.id);
      else await markRecoverConnectCompleted(day.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRateOutcome(rating: "GOOD" | "NEUTRAL" | "BAD") {
    if (busy || !day || !pendingOutcome) return;
    setBusy(true);
    try {
      await rateOutcome(day.id, pendingOutcome.id, rating);
      setPendingOutcome(null);
    } finally {
      setBusy(false);
    }
  }

  const recordLabel = recommendation?.kind === "NO_ACTION_REQUIRED" ? "RECORD NO ACTION" : "ACCEPT";

  return (
    <div className="screen">
      <p className="eyebrow">BEYOND // TODAY</p>
      <h1 className="title">Command</h1>

      {(daysSinceBackup === null || daysSinceBackup >= BACKUP_NUDGE_THRESHOLD_DAYS) && (
        <div className="card" style={{ borderColor: "var(--border-strong)" }}>
          <p className="meta">
            {daysSinceBackup === null
              ? "No backup on record yet — export one from MORE."
              : `It's been ${daysSinceBackup} days since your last backup — export one from MORE.`}
          </p>
        </div>
      )}

      {pendingOutcome && !outcomeDismissed && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>LAST TIME</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            {pendingOutcome.title} — how'd that go?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleRateOutcome("GOOD")}>
              GOOD
            </button>
            <button className="btn-primary" style={{ width: "auto", padding: "8px 16px", background: "var(--surface-2)" }} disabled={busy} onClick={() => void handleRateOutcome("NEUTRAL")}>
              NEUTRAL
            </button>
            <button className="btn-primary" style={{ width: "auto", padding: "8px 16px", background: "var(--surface-2)" }} disabled={busy} onClick={() => void handleRateOutcome("BAD")}>
              BAD
            </button>
            <button
              className="btn-primary"
              style={{ width: "auto", padding: "8px 16px", background: "var(--surface-2)" }}
              onClick={() => setOutcomeDismissed(true)}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {!day && (
        <div className="card card--action">
          <h2 className="card-title">Start your day</h2>
          <p className="card-body">No active BeyondDay. Starting begins wake-to-sleep tracking for today.</p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleStartDay()}>
            START DAY
          </button>
        </div>
      )}

      {day && recommendation && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>PRIMARY GUIDANCE</p>
          <p className="meta" style={{ marginBottom: 12 }}>Context: {day.workContext}</p>
          <h2 className="card-title">{recommendation.title}</h2>
          <p className="card-body">{recommendation.rationale}</p>
          <details className="why">
            <summary>WHY</summary>
            {recommendation.trace.matchedRules.map((r) => (
              <div key={r.ruleId} className={`why-rule ${r.result ? "why-rule--matched" : ""}`}>
                <span>{r.ruleId}</span>
                <span>{r.result ? r.reason : "—"}</span>
              </div>
            ))}
          </details>
          <div style={{ marginTop: 12 }}>
            <button
              className="btn-primary"
              disabled={busy || recorded}
              onClick={() => void handleRecord()}
            >
              {recorded ? "RECORDED" : recordLabel}
            </button>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <p className="meta" style={{ marginBottom: 8 }}>OVERRIDE</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                onClick={() => setShowReset((s) => !s)}
              >
                RESET
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                onClick={() => setShowShiftDown((s) => !s)}
              >
                SHIFT DOWN
              </button>
            </div>
            {showReset && (
              <div style={{ marginTop: 12 }}>
                <p className="meta" style={{ marginBottom: 8 }}>BODY BEFORE STORY — intensity</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button
                      key={n}
                      className="btn-primary"
                      style={{
                        background: resetIntensity === n ? "var(--accent)" : "var(--surface-2)",
                        padding: "8px 14px",
                        width: "auto",
                      }}
                      onClick={() => setResetIntensity(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {!activeResetId ? (
                  <button className="btn-primary" disabled={busy} onClick={() => void handleStartReset()}>
                    START RESET
                  </button>
                ) : (
                  <button className="btn-primary" disabled={busy} onClick={() => void handleCompleteReset()}>
                    COMPLETE RESET
                  </button>
                )}
              </div>
            )}
            {showShiftDown && (
              <div style={{ marginTop: 12 }}>
                <p className="meta" style={{ marginBottom: 8 }}>Duration (minutes)</p>
                <input
                  type="number"
                  min={1}
                  value={shiftDownDuration}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setShiftDownDuration(Number.isNaN(v) || v < 1 ? 1 : v);
                  }}
                  disabled={activeShiftDownId !== null}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    color: "var(--text-1)",
                    padding: "10px 12px",
                    fontSize: 15,
                    marginBottom: 8,
                  }}
                />
                {!activeShiftDownId ? (
                  <button className="btn-primary" disabled={busy} onClick={() => void handleStartShiftDown()}>
                    START SHIFT DOWN
                  </button>
                ) : (
                  <button className="btn-primary" disabled={busy} onClick={() => void handleCompleteShiftDown()}>
                    COMPLETE SHIFT DOWN
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>STATE INPUT</p>
        <h2 className="card-title">State check-in</h2>
        <button
          className="btn-primary"
          style={{ marginBottom: 12 }}
          disabled={busy}
          onClick={() => void handleQuickCheckIn()}
        >
          ALL GOOD
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {fields.map(({ key, min }) => (
            <div className="field" key={key}>
              <label>
                <span style={{ textTransform: "capitalize" }}>{key}</span>
              </label>
              <input
                type="number"
                min={min}
                max={5}
                value={values[key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setValues((s) => ({ ...s, [key]: Number.isNaN(v) ? min : v }));
                }}
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
          ))}
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => void handleCheckIn()}>
          SUBMIT CHECK-IN
        </button>
        {checkIn && (
          <p className="meta" style={{ marginTop: 8 }}>
            last recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {day && scheduledContext && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>SCHEDULE (PREDICTION, NOT FACT)</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Week {scheduledContext.week} — {scheduledContext.phase.replace(/_/g, " ")}
            {scheduledContext.todayIsScheduledWorkDay ? " (scheduled work day)" : " (scheduled off)"}.
            Current context: {day.workContext}.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-primary"
              style={{ width: "auto", padding: "8px 16px", background: day.workContext === "WORK" ? "var(--accent)" : "var(--surface-2)" }}
              disabled={busy}
              onClick={() => void handleAcceptScheduledContext("WORK")}
            >
              CONFIRM WORK
            </button>
            <button
              className="btn-primary"
              style={{ width: "auto", padding: "8px 16px", background: day.workContext === "OFF" ? "var(--accent)" : "var(--surface-2)" }}
              disabled={busy}
              onClick={() => void handleAcceptScheduledContext("OFF")}
            >
              CONFIRM OFF
            </button>
          </div>
        </div>
      )}

      {day && minimumDay && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>MINIMUM DAY</p>
          {!minimumDay.enabled ? (
            <>
              <p className="card-body" style={{ marginBottom: 12 }}>
                Reduced six-minimum baseline for a low-capacity day. Lowers expectations, doesn't add work.
              </p>
              <button className="btn-primary" disabled={busy} onClick={() => void handleEnableMinimumDay()}>
                ENABLE MINIMUM DAY
              </button>
            </>
          ) : (
            <>
              {(
                [
                  { key: "hydrate", label: "HYDRATE ≥40oz" },
                  { key: "protein", label: "PROTEIN ≥25g" },
                  { key: "meds", label: "MEDS", mark: "MEDS" as const },
                  { key: "hygiene", label: "HYGIENE", mark: "HYGIENE" as const },
                  { key: "move", label: "MOVE ≥5min", mark: "MOVE" as const },
                  { key: "recoverConnect", label: "RECOVER/CONNECT ≥10min", mark: "RECOVER_CONNECT" as const },
                ] as const
              ).map((item) => {
                const done = minimumDay[item.key as keyof MinimumDayStatus] as boolean;
                return (
                  <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                    <span className="card-body" style={{ margin: 0 }}>
                      {done ? "✓ " : ""}
                      {item.label}
                    </span>
                    {!done && "mark" in item && (
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 12, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum(item.mark)}
                      >
                        MARK DONE
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {day && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>BEYONDDAY</p>
          {suggestEndDay && (
            <p className="card-body" style={{ marginBottom: 12 }}>
              Primary sleep logged — this BeyondDay looks done. End it whenever you're ready.
            </p>
          )}
          <button className="btn-primary" style={{ background: "var(--surface-2)" }} disabled={busy} onClick={() => void handleEndDay()}>
            END DAY
          </button>
        </div>
      )}
    </div>
  );
}
