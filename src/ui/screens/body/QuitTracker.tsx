import { useEffect, useRef, useState } from "react";
import { Ban } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { HoldButton } from "../../components/HoldButton";
import { LineIcon } from "../../icons/LineIcon";
import { URGE_TRIGGERS, type UrgeTrigger } from "../../../domain/common/types";
import { getActiveDay } from "../../../application/queries";
import { ensureActiveDay } from "../../../application/commands";
import { getQuitSummary, type QuitSummary } from "../../../application/quitQueries";
import { logCleanDay, logUrge, undoUrge } from "../../../application/quitCommands";
import { describeCleanDays, formatUsd, URGE_TRIGGER_LABELS } from "./quitCopy";

/**
 * Drop 6 (quit tracker, owner approval 2026-09-30), on BODY per the owner's
 * ruling. Clean days this month (never a resetting streak — an unmarked day
 * simply isn't counted, and nothing here names a slip), a hold-to-confirm
 * clean-day log, one-tap urge logging by trigger with undo, and money saved.
 * Neutral ink only; red never decorates.
 */
export function QuitTracker() {
  const [summary, setSummary] = useState<QuitSummary | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastUrge, setLastUrge] = useState<{ eventId: string; trigger: UrgeTrigger } | null>(null);
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
      if (!disposedRef.current) setError(e instanceof Error ? e.message : "Could not save that.");
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
    });

  const handleUndoUrge = () =>
    run(async () => {
      if (!lastUrge) return;
      const day = await ensureActiveDay();
      await undoUrge(day.id, lastUrge.eventId);
      setLastUrge(null);
    });

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
    <div className="equipment-row">
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
