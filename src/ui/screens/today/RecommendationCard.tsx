import type { ReactNode } from "react";
import type { BeyondDay, Recommendation, StateCheckIn } from "../../../domain/common/types";
import type { PriorOutcomeMemory, RecommendationDecision, RecommendationHandoffTarget } from "../../../application/queries";
import { CommandSurface } from "../../components/CommandSurface";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmIcon, ResolveIcon } from "../../icons/Icon";
import { CHECK_IN_FIELDS } from "./checkInFields";
import {
  DECLINE_LABEL,
  describeEvidenceBasis,
  describeRecommendationAction,
  describeRecommendationEffect,
  describePriorOutcomeMemory,
  describeRecommendationHandoff,
  describeRecordedDecision,
  describeTraceLabel,
  describeTraceValue,
} from "./recommendationCopy";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderRecommendationCard` closure — the
 * screen's single most complex render function (PRIMARY DECISION /
 * EXECUTION territory, the full WHY trace, and every accept/decline/
 * handoff path). The internal `if (!day || !recommendation) return null`
 * guard is preserved exactly: unlike ResetCard/ShiftDownCard, one call
 * site (the ATTENTION-tier `recommendationInAttention` placement) does
 * not itself gate on `day && recommendation`, so this guard is load-
 * bearing, not dead code.
 */
export function RecommendationCard({
  day,
  recommendation,
  isDominant,
  isAttention = false,
  decision,
  checkIn,
  recommendationOpen,
  setRecommendationOpen,
  recommendationHandoff,
  activeShiftDownId,
  priorOutcomeMemory,
  busy,
  onOpenTrain,
  onRecord,
  onDecline,
  onHandoff,
  confirmPanel,
}: {
  day: BeyondDay | null;
  recommendation: Recommendation | null;
  isDominant: boolean;
  isAttention?: boolean;
  decision: RecommendationDecision | undefined;
  checkIn: StateCheckIn | null;
  recommendationOpen: boolean;
  setRecommendationOpen: (open: boolean) => void;
  recommendationHandoff: RecommendationHandoffTarget | null;
  activeShiftDownId: string | null;
  priorOutcomeMemory: PriorOutcomeMemory | null;
  busy: boolean;
  onOpenTrain?: ((destination: "RECOVERY" | "WORKOUT") => void) | undefined;
  onRecord: () => void;
  onDecline: () => void;
  onHandoff: (target: RecommendationHandoffTarget) => void;
  confirmPanel: ReactNode;
}) {
  if (!day || !recommendation) return null;
  const evidenceBasis = describeEvidenceBasis(checkIn !== null);
  const isAllClear = recommendation.kind === "NO_ACTION_REQUIRED";
  const open = isDominant || isAttention || isAllClear || recommendationOpen;
  if (!open) {
    return (
      <CollapsibleRow
        name="RECOMMENDATION"
        summary={decision ? `${recommendation.title} — ${describeRecordedDecision(decision)}` : recommendation.title}
        onOpen={() => setRecommendationOpen(true)}
      />
    );
  }
  const wrapperClassName = isAllClear
    ? "all-clear fade-in"
    : isAttention
      ? "card signal-row fade-in"
      : "equipment-row fade-in";
  const cardContent = (
    <>
      {(isAttention || isDominant) && !isAllClear && <p className="tool-label">ENGINE GUIDANCE</p>}
      <h2 className={isDominant || isAllClear ? "command-title" : isAttention ? "card-title" : "tool-label"} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {isAllClear ? <ConfirmIcon size={isDominant ? 24 : 20} /> : <ResolveIcon size={isDominant ? 28 : 20} />}
        {recommendation.title}
      </h2>
      <p className="card-body">{recommendation.rationale}</p>
      {evidenceBasis && (
        <p className="meta" style={{ marginTop: 8 }}>{evidenceBasis}</p>
      )}
      <details className="why" style={{ marginTop: 12 }}>
        <summary>How BEYOND decided</summary>
        <div className="machinery-panel">
          {checkIn && (
            <>
              <p className="why-group-label">State input</p>
              {CHECK_IN_FIELDS.map((f) => (
                <div key={f.key} className="why-rule">
                  <span>{f.label}</span>
                  <span>{checkIn[f.key]}</span>
                </div>
              ))}
            </>
          )}

          <p className="why-group-label">Derived</p>
          {recommendation.trace.derived.length > 0 ? (
            recommendation.trace.derived.map((d) => (
              <div key={d.key} className="why-rule">
                <span>{describeTraceLabel(d.key)}</span>
                <span>{describeTraceValue(d.value)}</span>
              </div>
            ))
          ) : (
            <div className="why-rule">
              <span>Capacity</span>
              <span>Not computed — no check-in yet</span>
            </div>
          )}

          <p className="why-group-label">Context</p>
          {recommendation.trace.inputs.map((i) => (
            <div key={i.key} className="why-rule">
              <span>{describeTraceLabel(i.key)}</span>
              <span>{describeTraceValue(i.value)}</span>
            </div>
          ))}

          <p className="why-group-label">Rules evaluated</p>
          {recommendation.trace.matchedRules.map((r) => (
            <div key={r.ruleId} className={`why-rule ${r.result ? "why-rule--matched" : ""}`}>
              <span>{r.ruleId}</span>
              <span>{r.result ? r.reason : "—"}</span>
            </div>
          ))}

          <p className="why-selection">{recommendation.trace.selectionReason}</p>
          {priorOutcomeMemory && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
              <p className="why-group-label">Previous result</p>
              <p className="card-body">
                {describePriorOutcomeMemory(
                  priorOutcomeMemory.decision,
                  priorOutcomeMemory.rating,
                  priorOutcomeMemory.recommendation.issuedAt,
                )}
              </p>
            </div>
          )}
          <p className="meta" style={{ marginTop: 8 }}>
            ENGINE {recommendation.trace.engineVersion} · EVALUATED{" "}
            {new Date(recommendation.trace.evaluatedAt).toLocaleTimeString()}
          </p>
        </div>
      </details>
      <div style={{ marginTop: isDominant && !isAllClear ? 20 : 12 }}>
        {decision ? (
          <>
            <button className="btn-primary" disabled style={isDominant && !isAllClear ? { fontSize: 18, padding: "18px var(--space-4)" } : undefined}>
              {describeRecordedDecision(decision)}
            </button>
            {recommendationHandoff &&
              !(recommendationHandoff === "SHIFT_DOWN" && activeShiftDownId !== null) &&
              (recommendationHandoff === "SHIFT_DOWN" || onOpenTrain) && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => onHandoff(recommendationHandoff)}
                  aria-label={`${describeRecommendationHandoff(recommendationHandoff)} — does not start the action`}
                >
                  {describeRecommendationHandoff(recommendationHandoff)}
                </button>
              )}
          </>
        ) : (
          <>
            {isDominant && !isAllClear && recommendation.kind !== "NO_ACTION_REQUIRED" ? (
              <>
                <button
                  className="btn-primary"
                  style={{ fontSize: 18, padding: "18px var(--space-4)" }}
                  disabled={busy}
                  onClick={onRecord}
                >
                  {describeRecommendationAction(recommendation.kind)}
                </button>
                <p className="field-divider">OR</p>
                <button className="btn-secondary" disabled={busy} onClick={onDecline}>
                  {DECLINE_LABEL}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, ...(isDominant && !isAllClear ? { fontSize: 18, padding: "18px var(--space-4)" } : {}) }}
                  disabled={busy}
                  onClick={onRecord}
                >
                  {describeRecommendationAction(recommendation.kind)}
                </button>
                {recommendation.kind !== "NO_ACTION_REQUIRED" && (
                  <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={onDecline}>
                    {DECLINE_LABEL}
                  </button>
                )}
              </div>
            )}
            <p className={isAllClear ? "meta field-note" : "meta"} style={{ marginTop: 8 }}>
              {describeRecommendationEffect(recommendation.kind)}
            </p>
          </>
        )}
        {confirmPanel}
      </div>
    </>
  );
  if (isDominant && !isAllClear) {
    return (
      <CommandSurface key={recommendation.id}>
        {cardContent}
      </CommandSurface>
    );
  }
  return (
    <div key={recommendation.id} className={wrapperClassName}>
      {cardContent}
    </div>
  );
}
