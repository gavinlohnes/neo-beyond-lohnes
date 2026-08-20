import { useEffect, useState } from "react";
import type { BeyondDay, Recommendation, StateCheckIn } from "../../../domain/common/types";
import {
  CHECK_IN_FIELDS,
  describeCheckInValues,
  isCheckInComplete,
  rangeForField,
  type CheckInValues,
  type PartialCheckInValues,
} from "./checkInFields";
import { describeSchedulePrediction, resolveWorkContextSource } from "./workContextCopy";
import { describeCapacity } from "./capacityCopy";
import { deriveCapacity } from "../../../engine/capacity";
import {
  DECLINE_LABEL,
  describeRecommendationAction,
  describeRecommendationEffect,
  describeRecordedDecision,
} from "./recommendationCopy";
import { dismissOutcome, isOutcomeDismissed } from "../../../persistence/outcomeDismissals";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import {
  isSeriouslyConstrained,
  MINIMUM_DAY_ENABLE_BODY,
  MINIMUM_DAY_ITEMS,
  MINIMUM_DAY_PROMINENT_BODY,
  MINIMUM_DAY_PROMINENT_TITLE,
} from "./minimumDayCopy";
import {
  describeResetInProgress,
  describeResetResult,
  describeShiftDownInProgress,
  describeShiftDownResult,
  isPrimaryReset,
  isPrimaryShiftDown,
  RESET_EXPLANATION,
  SHIFT_DOWN_DURATION_PRESETS,
  SHIFT_DOWN_EXPLANATION,
  type SessionOutcome,
} from "./resetShiftDownCopy";
import {
  startDay,
  ensureActiveDay,
  submitCheckIn,
  recordRecommendation,
  declineRecommendation,
  startReset,
  completeReset,
  cancelReset,
  startShiftDown,
  completeShiftDown,
  cancelShiftDown,
  endDay,
  rateOutcome,
  setWorkContext,
  enableMinimumDay,
  markMedsCompleted,
  markHygieneCompleted,
  markMoveCompleted,
  markRecoverConnectCompleted,
  logWater,
  logProtein,
} from "../../../application/commands";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  getRecommendationDecision,
  shouldSuggestEndDay,
  getPendingOutcomeRating,
  getScheduledContext,
  getMinimumDayStatus,
  getEffectiveHydrationTotal,
  getTotalProteinGrams,
  getOpenReset,
  getOpenShiftDown,
  type MinimumDayStatus,
  type RecommendationDecision,
} from "../../../application/queries";
import { getDaysSinceLastBackup } from "../../../persistence/backup";
import type { ScheduledContext } from "../../../engine/scheduledContext";

const BACKUP_NUDGE_THRESHOLD_DAYS = 7;

/**
 * Quick check-in default ("all good" one-tap, Context & Safety Decisions
 * 2026-08-19). Still produces a real StateCheckIn the Engine evaluates —
 * these values feed the locked capacity rule directly, so they were
 * chosen to land comfortably GREEN as "a genuinely fine day," not the
 * most extreme possible values. Confirmed with Gavin 2026-08-19.
 */
export const quickCheckInValues: CheckInValues = {
  energy: 4,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};

export function TodayScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [decision, setDecision] = useState<RecommendationDecision | undefined>(undefined);
  const [values, setValues] = useState<PartialCheckInValues>({});
  const [busy, setBusy] = useState(false);
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [openResetStartedAt, setOpenResetStartedAt] = useState<string | null>(null);
  const [lastResetOutcome, setLastResetOutcome] = useState<SessionOutcome | null>(null);
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [openShiftDownStartedAt, setOpenShiftDownStartedAt] = useState<string | null>(null);
  const [lastShiftDownOutcome, setLastShiftDownOutcome] = useState<SessionOutcome | null>(null);
  const [suggestEndDay, setSuggestEndDay] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Recommendation | null>(null);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  const [minimumDay, setMinimumDay] = useState<MinimumDayStatus | null>(null);
  const [minimumDayHydrateOz, setMinimumDayHydrateOz] = useState(0);
  const [minimumDayProteinG, setMinimumDayProteinG] = useState(0);
  const [mdWaterInput, setMdWaterInput] = useState("");
  const [mdProteinInput, setMdProteinInput] = useState("");
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

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
      setDecision(rec ? await getRecommendationDecision(activeDay.id, rec.id) : undefined);
      setSuggestEndDay(await shouldSuggestEndDay(activeDay.id));
      const pending = (await getPendingOutcomeRating(activeDay.id)) ?? null;
      setPendingOutcome(pending && !isOutcomeDismissed(pending.id) ? pending : null);
      setMinimumDay(await getMinimumDayStatus(activeDay.id));
      setMinimumDayHydrateOz(await getEffectiveHydrationTotal(activeDay.id));
      setMinimumDayProteinG(await getTotalProteinGrams(activeDay.id));

      const openReset = await getOpenReset(activeDay.id);
      if (openReset) {
        setActiveResetId(openReset.eventId);
        setResetIntensity(openReset.intensity);
        setOpenResetStartedAt(openReset.startedAt);
      } else {
        setActiveResetId(null);
        setOpenResetStartedAt(null);
      }

      const openShiftDown = await getOpenShiftDown(activeDay.id);
      if (openShiftDown) {
        setActiveShiftDownId(openShiftDown.eventId);
        setShiftDownDuration(openShiftDown.durationMinutes);
        setOpenShiftDownStartedAt(openShiftDown.startedAt);
      } else {
        setActiveShiftDownId(null);
        setOpenShiftDownStartedAt(null);
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
    if (busy || !isCheckInComplete(values)) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, values);
      // Refetch everything derived from the new recommendation — not just
      // checkIn/recommendation — so pendingOutcome (CP10) and any other
      // derived state stay in sync without requiring a page reload.
      await refresh();
      // Empty must look empty (Phase 2): a just-submitted check-in is
      // already reflected by "last recorded" below, not by the fields
      // still showing the values as if pending. Reset so a returning user
      // never mistakes leftover selections for a new, unsubmitted check-in.
      setValues({});
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

  async function actuallyDecline() {
    if (!day || !recommendation) return;
    setBusy(true);
    try {
      await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /**
   * A STABILIZE recommendation only ever exists because capacity was RED
   * (engine/evaluate.ts's only path to that kind) — declining it is always
   * an override of RED-tier guidance, so it goes through the same shared
   * confirm-every-time mechanism TRAIN uses (useRedCapacityOverrideGate).
   * RECOVER/EXECUTE_PLANNED_WORK never pair with RED and skip straight to
   * actuallyDecline, matching how TRAIN's REDUCED/RECOVERY variants skip
   * the same gate for startWorkout.
   */
  function handleDecline() {
    if (busy || !day || !recommendation) return;
    if (recommendation.kind === "STABILIZE") {
      guard("RED", () => actuallyDecline());
    } else {
      void actuallyDecline();
    }
  }

  async function handleStartReset() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await startReset(day.id, resetIntensity);
      setLastResetOutcome(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteReset() {
    if (busy || !day || !activeResetId) return;
    setBusy(true);
    try {
      await completeReset(day.id, activeResetId);
      setLastResetOutcome("COMPLETED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Distinct from completing — "started this but didn't go through with it," never recorded as done. */
  async function handleCancelReset() {
    if (busy || !day || !activeResetId) return;
    setBusy(true);
    try {
      await cancelReset(day.id, activeResetId);
      setLastResetOutcome("CANCELLED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStartShiftDown() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await startShiftDown(day.id, shiftDownDuration);
      setLastShiftDownOutcome(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteShiftDown() {
    if (busy || !day || !activeShiftDownId) return;
    setBusy(true);
    try {
      await completeShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("COMPLETED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelShiftDown() {
    if (busy || !day || !activeShiftDownId) return;
    setBusy(true);
    try {
      await cancelShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("CANCELLED");
      await refresh();
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

  async function handleSetWorkContext(value: "WORK" | "OFF") {
    if (busy || !day || !scheduledContext) return;
    setBusy(true);
    try {
      const source = resolveWorkContextSource(scheduledContext.todayIsScheduledWorkDay, value);
      await setWorkContext(day.id, value, source);
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

  async function handleMarkMinimum(kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER" | "CONNECT") {
    if (busy || !day) return;
    setBusy(true);
    try {
      if (kind === "MEDS") await markMedsCompleted(day.id);
      else if (kind === "HYGIENE") await markHygieneCompleted(day.id);
      else if (kind === "MOVE") await markMoveCompleted(day.id);
      else await markRecoverConnectCompleted(day.id, kind);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Item 3 (Phase 3): logs directly from the same commands/events BODY
   * uses (logWater/logProtein) — no separate record-keeping path, so
   * there's no way for this to create a duplicate of a BODY-side log.
   */
  async function handleMinimumDayLogWater() {
    if (busy) return;
    const amount = Number(mdWaterInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await logWater(activeDay.id, amount);
      setMdWaterInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMinimumDayLogProtein() {
    if (busy) return;
    const grams = Number(mdProteinInput);
    if (!Number.isFinite(grams) || grams <= 0) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await logProtein(activeDay.id, grams);
      setMdProteinInput("");
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

  function handleDismissOutcome() {
    if (!pendingOutcome) return;
    dismissOutcome(pendingOutcome.id);
    setPendingOutcome(null);
  }

  const capacityResult = checkIn ? deriveCapacity(checkIn) : null;
  // Item 1 (Phase 3): RED or multi-factor YELLOW offers Minimum Day
  // prominently, but only while it isn't already enabled — once it's on,
  // there's nothing left to "offer."
  const seriouslyConstrained = capacityResult
    ? isSeriouslyConstrained(capacityResult.capacity, capacityResult.reasonCodes.length)
    : false;
  const showProminentMinimumDay = seriouslyConstrained && !!minimumDay && !minimumDay.enabled;

  // Item 6 (Phase 4): when a tool IS the actual Engine recommendation
  // (Recommendation.suggestedCommand), it shouldn't read as an "override"
  // of that recommendation — it IS the recommendation. shiftDownIsPrimary
  // is reachable today (STABILIZE -> START_SHIFT_DOWN); resetIsPrimary is
  // always false under the current locked engine (no recommendation kind
  // has a START_RESET suggestedCommand) — see resetShiftDownCopy.ts.
  const shiftDownIsPrimary = isPrimaryShiftDown(recommendation);
  const resetIsPrimary = isPrimaryReset(recommendation);

  function renderResetCard(prominent: boolean) {
    if (!day) return null;
    const active = activeResetId !== null;
    return (
      <div className="card" style={prominent || active ? { borderColor: "var(--accent)" } : undefined}>
        <p className="eyebrow" style={{ marginBottom: 4, color: active ? "var(--accent)" : undefined }}>
          {active ? "● RESET IN PROGRESS" : prominent ? "RECOMMENDED — RESET" : "RESET"}
        </p>
        <p className="card-body" style={{ marginBottom: 12 }}>{RESET_EXPLANATION}</p>
        {active ? (
          <>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {describeResetInProgress(resetIntensity)}
              {openResetStartedAt ? ` Started ${new Date(openResetStartedAt).toLocaleTimeString()}.` : ""}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleCompleteReset()}>
                COMPLETE RESET
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: "var(--surface-2)" }}
                disabled={busy}
                onClick={() => void handleCancelReset()}
              >
                CANCEL RESET
              </button>
            </div>
          </>
        ) : (
          <>
            {lastResetOutcome && (
              <p className="meta" style={{ marginBottom: 12 }}>{describeResetResult(lastResetOutcome)}</p>
            )}
            <p className="meta" style={{ marginBottom: 8 }}>
              BODY BEFORE STORY — how much do you need? 1 is a light touch, 5 is fully immersive.
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    width: "auto",
                    background: resetIntensity === n ? "var(--accent)" : "var(--surface-2)",
                    padding: "8px 0",
                  }}
                  disabled={busy}
                  onClick={() => setResetIntensity(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => void handleStartReset()}>
              START RESET
            </button>
          </>
        )}
      </div>
    );
  }

  function renderShiftDownCard(prominent: boolean) {
    if (!day) return null;
    const active = activeShiftDownId !== null;
    return (
      <div className="card" style={prominent || active ? { borderColor: "var(--accent)" } : undefined}>
        <p className="eyebrow" style={{ marginBottom: 4, color: active ? "var(--accent)" : undefined }}>
          {active ? "● SHIFT DOWN IN PROGRESS" : prominent ? "RECOMMENDED — SHIFT DOWN" : "SHIFT DOWN"}
        </p>
        <p className="card-body" style={{ marginBottom: 12 }}>{SHIFT_DOWN_EXPLANATION}</p>
        {active ? (
          <>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {describeShiftDownInProgress(shiftDownDuration)}
              {openShiftDownStartedAt ? ` Started ${new Date(openShiftDownStartedAt).toLocaleTimeString()}.` : ""}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleCompleteShiftDown()}>
                COMPLETE SHIFT DOWN
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: "var(--surface-2)" }}
                disabled={busy}
                onClick={() => void handleCancelShiftDown()}
              >
                CANCEL SHIFT DOWN
              </button>
            </div>
          </>
        ) : (
          <>
            {lastShiftDownOutcome && (
              <p className="meta" style={{ marginBottom: 12 }}>{describeShiftDownResult(lastShiftDownOutcome)}</p>
            )}
            <p className="meta" style={{ marginBottom: 8 }}>How many minutes?</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {SHIFT_DOWN_DURATION_PRESETS.map((n) => (
                <button
                  key={n}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    minWidth: 50,
                    width: "auto",
                    padding: "8px 0",
                    background: shiftDownDuration === n ? "var(--accent)" : "var(--surface-2)",
                  }}
                  disabled={busy}
                  onClick={() => setShiftDownDuration(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <span className="meta">Custom:</span>
              <input
                type="number"
                min={1}
                value={shiftDownDuration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setShiftDownDuration(Number.isNaN(v) || v < 1 ? 1 : v);
                }}
                className="input"
                style={{ flex: 1 }}
              />
              <span className="meta">min</span>
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => void handleStartShiftDown()}>
              START SHIFT DOWN
            </button>
          </>
        )}
      </div>
    );
  }

  function renderMinimumDayCard(prominent: boolean) {
    if (!minimumDay) return null;
    return (
      <div className="card" style={prominent ? { borderColor: "var(--accent)" } : undefined}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>MINIMUM DAY</p>
        {!minimumDay.enabled ? (
          <>
            <h2 className="card-title">{prominent ? MINIMUM_DAY_PROMINENT_TITLE : "Reduced baseline"}</h2>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {prominent ? MINIMUM_DAY_PROMINENT_BODY : MINIMUM_DAY_ENABLE_BODY}
            </p>
            <button className="btn-primary" disabled={busy} onClick={() => void handleEnableMinimumDay()}>
              ENABLE MINIMUM DAY
            </button>
          </>
        ) : (
          <>
            {MINIMUM_DAY_ITEMS.map((item) => {
              const done = minimumDay[item.key];
              return (
                <div key={item.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="card-body" style={{ margin: 0 }}>
                      {done ? "✓ " : ""}
                      {item.label}
                      {item.key === "hydrate" ? ` — ${minimumDayHydrateOz}oz logged` : ""}
                      {item.key === "protein" ? ` — ${minimumDayProteinG}g logged` : ""}
                    </span>
                    {!done && item.key === "meds" && (
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("MEDS")}
                      >
                        MARK DONE
                      </button>
                    )}
                    {!done && item.key === "hygiene" && (
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("HYGIENE")}
                      >
                        MARK DONE
                      </button>
                    )}
                    {!done && item.key === "move" && (
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("MOVE")}
                      >
                        MARK DONE
                      </button>
                    )}
                  </div>
                  <p className="meta" style={{ marginTop: 4 }}>{item.updateNote}</p>
                  {!done && item.key === "hydrate" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="oz"
                        value={mdWaterInput}
                        onChange={(e) => setMdWaterInput(e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                        disabled={busy || !(Number(mdWaterInput) > 0)}
                        onClick={() => void handleMinimumDayLogWater()}
                      >
                        LOG WATER
                      </button>
                    </div>
                  )}
                  {!done && item.key === "protein" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="g"
                        value={mdProteinInput}
                        onChange={(e) => setMdProteinInput(e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                        disabled={busy || !(Number(mdProteinInput) > 0)}
                        onClick={() => void handleMinimumDayLogProtein()}
                      >
                        LOG PROTEIN
                      </button>
                    </div>
                  )}
                  {!done && item.key === "recoverConnect" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: "6px 12px", fontSize: 16, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("RECOVER")}
                      >
                        MARK RECOVER
                      </button>
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: "6px 12px", fontSize: 16, background: "var(--surface-2)" }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("CONNECT")}
                      >
                        MARK CONNECT
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

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

      {pendingOutcome && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>LAST TIME</p>
          <p className="card-body" style={{ marginBottom: 8 }}>
            Last time, BEYOND recommended "{pendingOutcome.title}" — how did that go?
          </p>
          <p className="meta" style={{ marginBottom: 12 }}>
            This just records your answer for later review. It won't change today's guidance.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              disabled={busy}
              onClick={handleDismissOutcome}
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
          {capacityResult && (
            <p className="card-body" style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>
              {describeCapacity(capacityResult.capacity, capacityResult.reasonCodes)}
            </p>
          )}
          <h2 className="card-title">{recommendation.title}</h2>
          <p className="card-body">{recommendation.rationale}</p>
          <details className="why">
            <summary>How BEYOND decided</summary>
            {recommendation.trace.matchedRules.map((r) => (
              <div key={r.ruleId} className={`why-rule ${r.result ? "why-rule--matched" : ""}`}>
                <span>{r.ruleId}</span>
                <span>{r.result ? r.reason : "—"}</span>
              </div>
            ))}
          </details>
          <div style={{ marginTop: 12 }}>
            {decision ? (
              <button className="btn-primary" disabled>
                {describeRecordedDecision(decision)}
              </button>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onClick={() => void handleRecord()}
                  >
                    {describeRecommendationAction(recommendation.kind)}
                  </button>
                  {recommendation.kind !== "NO_ACTION_REQUIRED" && (
                    <button
                      className="btn-primary"
                      style={{ flex: 1, background: "var(--surface-2)" }}
                      disabled={busy}
                      onClick={handleDecline}
                    >
                      {DECLINE_LABEL}
                    </button>
                  )}
                </div>
                <p className="meta" style={{ marginTop: 8 }}>
                  {describeRecommendationEffect(recommendation.kind)}
                </p>
              </>
            )}
            <ConfirmPanel />
          </div>
        </div>
      )}

      {day &&
        recommendation &&
        (shiftDownIsPrimary ? (
          <>
            {renderShiftDownCard(true)}
            {renderResetCard(resetIsPrimary)}
          </>
        ) : (
          <>
            {renderResetCard(resetIsPrimary)}
            {renderShiftDownCard(false)}
          </>
        ))}

      {showProminentMinimumDay && renderMinimumDayCard(true)}

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>STATE INPUT</p>
        <h2 className="card-title">State check-in</h2>
        <p className="card-body" style={{ marginBottom: 12 }}>
          How are you doing right now? Tap a number for each — nothing here is filled in for you.
        </p>
        <button
          className="btn-primary"
          style={{ marginBottom: 4 }}
          disabled={busy}
          onClick={() => void handleQuickCheckIn()}
        >
          ALL GOOD
        </button>
        <p className="meta" style={{ marginBottom: 16 }}>
          Sets {describeCheckInValues(quickCheckInValues)} — submits immediately.
        </p>
        {CHECK_IN_FIELDS.map((field) => (
          <div key={field.key} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span className="card-body" style={{ margin: 0, fontWeight: 600, color: "var(--text-1)" }}>
                {field.label}
              </span>
              <span className="meta">{field.directionLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {rangeForField(field).map((n) => {
                const selected = values[field.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    className="btn-primary"
                    aria-pressed={selected}
                    disabled={busy}
                    style={{
                      flex: 1,
                      width: "auto",
                      padding: "10px 0",
                      fontSize: 16,
                      minHeight: 40,
                      background: selected ? "var(--accent)" : "var(--surface-2)",
                      border: selected ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                    }}
                    onClick={() => setValues((s) => ({ ...s, [field.key]: n }))}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button className="btn-primary" disabled={busy || !isCheckInComplete(values)} onClick={() => void handleCheckIn()}>
          SUBMIT CHECK-IN
        </button>
        {!isCheckInComplete(values) && (
          <p className="meta" style={{ marginTop: 8 }}>Select all five to submit.</p>
        )}
        {checkIn && (
          <p className="meta" style={{ marginTop: 8 }}>
            last recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {day && scheduledContext && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>WORK CONTEXT</p>
          <h2 className="card-title">Are you working today?</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, background: day.workContext === "WORK" ? "var(--accent)" : "var(--surface-2)" }}
              disabled={busy}
              onClick={() => void handleSetWorkContext("WORK")}
            >
              YES
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1, background: day.workContext === "OFF" ? "var(--accent)" : "var(--surface-2)" }}
              disabled={busy}
              onClick={() => void handleSetWorkContext("OFF")}
            >
              NO
            </button>
          </div>
          <p className="card-body" style={{ fontSize: 16 }}>{describeSchedulePrediction(scheduledContext)}</p>
          {day.workContext !== "UNKNOWN" && (
            <p className="meta" style={{ marginTop: 8 }}>
              Currently set: {day.workContext === "WORK" ? "working today" : "off today"}.
            </p>
          )}
        </div>
      )}

      {day && minimumDay && !showProminentMinimumDay && renderMinimumDayCard(false)}

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
