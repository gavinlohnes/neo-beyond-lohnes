import { useEffect, useRef, useState } from "react";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { Ban } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { HoldButton } from "../../components/HoldButton";
import { LineIcon } from "../../icons/LineIcon";
import { URGE_TRIGGERS, type UrgeTrigger } from "../../../domain/common/types";
import { getActiveDay } from "../../../application/queries";
import { ensureActiveDay } from "../../../application/commands";
import { getQuitSummary, type QuitSummary } from "../../../application/quitQueries";
import { logCleanDay, logUrge, respondToUrgePlan, undoUrge } from "../../../application/quitCommands";
import { describeCleanDays, describePlanResponse, describeYourPlan, formatUsd, URGE_TRIGGER_LABELS } from "./quitCopy";
import { SHORTCUT_ANCHOR_IDS } from "../../shortcuts";
import { describeError } from "../../errorMessage";

/**
 * Drop 6 (quit tracker, owner approval 2026-09-30), on BODY per the owner's
 * ruling. Clean days this month (never a resetting streak — an unmarked day
 * simply isn't counted, and nothing here names a slip), a hold-to-confirm
 * clean-day log, one-tap urge logging by trigger with undo, and money saved.
 * Neutral ink only; red never decorates.
 */
export function QuitTracker({ initiallyOpen = false }: { initiallyOpen?: boolean } = {}) {
  const [summary, setSummary] = useState<QuitSummary | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  // Drop 7: the "Urge" home-screen shortcut opens the tracker straight to its urge buttons.
  const [open, setOpen] = useState(initiallyOpen);
  const [busy, setBusy] = useState(false);
  const [lastUrge, setLastUrge] = useState<{ eventId: string; trigger: UrgeTrigger } | null>(null);
  // Drop 4: the operator's answer to their own plan for lastUrge, once given.
  const [planAnswer, setPlanAnswer] = useState<boolean | null>(null);
  const [holdHint, setHoldHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);

  async function refresh() {
    const day = await getActiveDay();
    const next = await getQuitSummary(day?.id);
    if (disposedRef.current) return;
    setSummary(next);
    setLoaded(true);
  }

  // DROP 0: today's clean-day and urge state belongs to the new day after a 16:30 rollover.
  useDayRolloverRefresh(refresh);

  useEffect(() => {
    disposedRef.current = false;
    void refresh().catch(() => {});
    return () => {
      disposedRef.current = true;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      if (!disposedRef.current) setError(describeError(e, "Could not save that."));
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  const handleCleanDay = () =>
    run(async () => {
      const day = await ensureActiveDay();
      await logCleanDay(day.id);
      setHoldHint(false);
    });

  const handleUrge = (trigger: UrgeTrigger) =>
    run(async () => {
      const day = await ensureActiveDay();
      const eventId = await logUrge(day.id, trigger);
      setLastUrge({ eventId, trigger });
      setPlanAnswer(null);
    });

  const handleUndoUrge = () =>
    run(async () => {
      if (!lastUrge) return;
      const day = await ensureActiveDay();
      await undoUrge(day.id, lastUrge.eventId);
      setLastUrge(null);
      setPlanAnswer(null);
    });

  const handlePlanAnswer = (used: boolean) =>
    run(async () => {
      if (!lastUrge) return;
      const day = await ensureActiveDay();
      await respondToUrgePlan(day.id, lastUrge.eventId, used);
      setPlanAnswer(used);
    });

  const lastUrgePlan = lastUrge ? summary?.habit.ifThenPlans?.[lastUrge.trigger] : undefined;

  if (!loaded) return null;

  if (!open) {
    const rowSummary = summary
      ? `${describeCleanDays(summary.cleanThisMonth)}${
          summary.savedThisMonthUsd !== undefined ? ` · ${formatUsd(summary.savedThisMonthUsd)} saved` : ""
        }`
      : "Set it up in MORE → Settings";
    return (
      <CollapsibleRow
        name={summary ? `QUIT: ${summary.habit.name.toUpperCase()}` : "QUIT TRACKER"}
        icon={<LineIcon icon={Ban} />}
        summary={rowSummary}
        onOpen={() => setOpen(true)}
      />
    );
  }

  return (
    <div className="equipment-row" id={SHORTCUT_ANCHOR_IDS.urge}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <p className="tool-label" style={{ margin: 0 }}>
          {summary ? `QUIT: ${summary.habit.name.toUpperCase()}` : "QUIT TRACKER"}
        </p>
        <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setOpen(false)}>
          DONE
        </button>
      </div>

      {!summary ? (
        <p className="card-body">Name the habit you're avoiding in MORE → Settings, and it will show up here.</p>
      ) : (
        <>
          <p className="recommendation-title" style={{ marginBottom: 2 }}>{describeCleanDays(summary.cleanThisMonth)}</p>
          <p className="meta" style={{ marginBottom: 4 }}>{summary.cleanTotal} in total</p>
          {summary.savedThisMonthUsd !== undefined && summary.savedTotalUsd !== undefined && (
            <p className="meta" style={{ marginBottom: 12 }}>
              {formatUsd(summary.savedThisMonthUsd)} saved this month · {formatUsd(summary.savedTotalUsd)} total
            </p>
          )}

          {summary.cleanToday ? (
            <p className="meta-strong" style={{ margin: "12px 0" }}>Today is logged as clean.</p>
          ) : (
            <div style={{ margin: "12px 0" }}>
              <HoldButton className="btn-secondary" disabled={busy} onEarlyRelease={() => setHoldHint(true)} onConfirm={() => void handleCleanDay()}>
                LOG A CLEAN DAY
              </HoldButton>
              <p className="meta" role="status" style={{ margin: holdHint ? "6px 0 0" : 0 }}>
                {holdHint ? "Hold to log." : ""}
              </p>
            </div>
          )}

          <p className="meta" style={{ marginBottom: 6 }}>Urge? Tap what set it off:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {URGE_TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                type="button"
                className="chip"
                disabled={busy}
                aria-label={`Log urge: ${URGE_TRIGGER_LABELS[trigger]}`}
                onClick={() => void handleUrge(trigger)}
              >
                {URGE_TRIGGER_LABELS[trigger]}
              </button>
            ))}
          </div>
          {lastUrge && (
            <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <p className="meta-strong" role="status" style={{ margin: 0 }}>
                Urge logged — {URGE_TRIGGER_LABELS[lastUrge.trigger]}.
              </p>
              <button type="button" className="btn-secondary" style={{ width: "auto", padding: "2px 10px", fontSize: 14 }} disabled={busy} onClick={() => void handleUndoUrge()}>
                UNDO
              </button>
            </div>
          )}
          {/* Drop 4: the owner's own if-then plan for this trigger, in their words. One optional tap, never asked twice. */}
          {lastUrge && lastUrgePlan && (
            <div className="fade-in" role="group" aria-label="Your plan" style={{ margin: "4px 0 10px" }}>
              <p className="card-body" style={{ marginBottom: 6 }}>{describeYourPlan(lastUrge.trigger, lastUrgePlan)}</p>
              {planAnswer === null ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handlePlanAnswer(true)}>
                    PLAN USED
                  </button>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handlePlanAnswer(false)}>
                    NOT THIS TIME
                  </button>
                </div>
              ) : (
                <p className="meta" role="status" style={{ margin: 0 }}>{describePlanResponse(planAnswer)}</p>
              )}
            </div>
          )}
          {error && <p className="meta" role="alert">{error}</p>}
          {summary.urgesToday.length > 0 && (
            <p className="meta" style={{ margin: 0 }}>
              {summary.urgesToday.length} {summary.urgesToday.length === 1 ? "urge" : "urges"} logged today
            </p>
          )}
        </>
      )}
    </div>
  );
}
