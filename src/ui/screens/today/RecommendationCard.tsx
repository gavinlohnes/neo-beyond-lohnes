import type { ReactNode } from "react";
import type { BeyondDay, Recommendation, StateCheckIn } from "../../../domain/common/types";
import type { ObligationRelevance } from "../../../engine/obligationRelevance";
import type { PriorOutcomeMemory, RecommendationDecision, RecommendationHandoffTarget } from "../../../application/queries";
import { CommandSurface } from "../../components/CommandSurface";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { WhyDisclosure } from "../../components/WhyDisclosure";
import { ConfirmIcon, ResolveIcon } from "../../icons/Icon";
import { CHECK_IN_FIELDS } from "./checkInFields";
import { ReflectOnDecline } from "./ReflectOnDecline";
import { describeRememberedLesson, type RememberedLesson } from "../../../application/remember";
import { AskHowItWent } from "./AskHowItWent";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import {
  DECLINE_LABEL,
  describeRecommendationReason,
  describeEvidenceBasis,
  describeRecommendationAction,
  describeRecommendationEffect,
  describePriorOutcomeMemory,
  describeRecommendationHandoff,
  describeRecommendationTitle,
  describeRecordedDecision,
  describeTraceLabel,
  describeTraceValue,
  describeSelectionReason,
  explainRecommendation,
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
  nextAction = false,
  context,
  recommendation,
  headlineCommitment = null,
  isDominant,
  isAttention = false,
  decision,
  checkIn,
  recommendationOpen,
  setRecommendationOpen,
  recommendationHandoff,
  activeShiftDownId,
  priorOutcomeMemory,
  materiallyRepeated = false,
  rememberedLesson = null,
  pendingReflection = null,
  onReflectionAnswered,
  questionBelow = false,
  busy,
  onOpenTrain,
  onRecord,
  onDecline,
  onHandoff,
  confirmPanel,
}: {
  day: BeyondDay | null;
  nextAction?: boolean;
  /** POLISH-002: on the all-clear card, what's next ("6h 20m left. Log as you go."). */
  context?: string | undefined;
  recommendation: Recommendation | null;
  /** ADVISORY-002: an OBLIGATION_DUE recommendation is titled with the real commitment, not "An obligation needs attention". */
  headlineCommitment?: ObligationRelevance | null;
  isDominant: boolean;
  isAttention?: boolean;
  decision: RecommendationDecision | undefined;
  checkIn: StateCheckIn | null;
  recommendationOpen: boolean;
  setRecommendationOpen: (open: boolean) => void;
  recommendationHandoff: RecommendationHandoffTarget | null;
  activeShiftDownId: string | null;
  priorOutcomeMemory: PriorOutcomeMemory | null;
  /**
   * FOUNDATION-1B (Scenario E): true when this exact recommendation is
   * indistinguishable (same DecisionTrace) from an immediately-prior
   * DECLINED one on the same day — application/continuityQueries.ts's
   * wasRecommendationMateriallyRepeated. Presentation-only: it changes
   * one line of copy, never the accept/decline behavior itself, and never
   * suppresses issuing the real Recommendation record.
   */
  materiallyRepeated?: boolean;
  /** LOOP step 4 — REMEMBER: what you concluded the last time this kind of recommendation came up. Informational only. */
  rememberedLesson?: RememberedLesson | null;
  /** LOOP-002: a reason you gave on an earlier recommendation of this kind that still awaits "how did it go?". */
  pendingReflection?: DecisionJournalEntry | null;
  onReflectionAnswered?: () => void;
  /**
   * TONIGHT-001: TODAY is showing an unanswered question (the work question or the
   * workout call). The all-clear keeps its meaning (nothing is required) but no longer
   * reads "Nothing needs you" above a question.
   */
  questionBelow?: boolean;
  busy: boolean;
  onOpenTrain?: ((destination: "RECOVERY" | "WORKOUT") => void) | undefined;
  onRecord: () => void;
  onDecline: () => void;
  onHandoff: (target: RecommendationHandoffTarget) => void;
  confirmPanel: ReactNode;
}) {
  if (!day || !recommendation) return null;
  const evidenceBasis = describeEvidenceBasis(checkIn !== null);
  const title = describeRecommendationTitle(recommendation, headlineCommitment);
  const isAllClear = recommendation.kind === "NO_ACTION_REQUIRED";
  const canHandoff = !!recommendationHandoff && !(recommendationHandoff === "SHIFT_DOWN" && activeShiftDownId !== null) && (recommendationHandoff === "SHIFT_DOWN" || !!onOpenTrain);
  const open = nextAction || isDominant || isAttention || isAllClear || recommendationOpen;
  if (!open) {
    return (
      <CollapsibleRow
        name="RECOMMENDATION"
        summary={decision ? `${title} — ${describeRecordedDecision(decision)}` : title}
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
      {nextAction && !isAllClear && <p className="cc-lbl">NEXT</p>}
      {!nextAction && (isAttention || isDominant) && !isAllClear && <p className="tool-label">ENGINE GUIDANCE</p>}
      {nextAction ? <h2 className={isAllClear ? undefined : "command-title"}>{isAllClear ? describeAllClearHeadline(questionBelow) : title}</h2> : (
      <h2 className={isDominant || isAllClear ? "command-title" : isAttention ? "card-title" : "tool-label"} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {isAllClear ? <ConfirmIcon size={isDominant ? 24 : 20} /> : <ResolveIcon size={isDominant ? 28 : 20} />}
        {title}
      </h2>)}
      {/* POLISH-002: one line of evidence under the headline, as in the prototype. */}
      {nextAction && (isAllClear ? context && <p>{context}</p> : <p>{describeRecommendationReason(recommendation.rationale)}</p>)}
      {/* DECLUTTER-001: the all-clear rationale ("No rule requires attention
          right now.") only repeats the title, so it isn't shown there. */}
      {!nextAction && !isAllClear && <p className="card-body">{describeRecommendationReason(recommendation.rationale)}</p>}
      {!nextAction && evidenceBasis && (
        <p className="meta" style={{ marginTop: 8 }}>{evidenceBasis}</p>
      )}
      {materiallyRepeated && (
        <p className="meta" style={{ marginTop: 8 }}>Same as before — you already said not now.</p>
      )}
      {rememberedLesson && !isAllClear && <p className="meta" style={{ marginTop: 8 }} data-remember-lesson>{describeRememberedLesson(rememberedLesson)}</p>}
      {pendingReflection && !isAllClear && <AskHowItWent entry={pendingReflection} onAnswered={onReflectionAnswered} />}
      {nextAction && !decision && (isAllClear
        // FIELD-AUTHORITY-001: an all-clear earns no red; its acknowledgement is neutral.
        ? <button type="button" className="btn-secondary" disabled={busy} onClick={onRecord}>{describeRecommendationAction(recommendation.kind)}</button>
        : <button type="button" className="cc-decline" disabled={busy} onClick={onDecline}>{DECLINE_LABEL}</button>)}
      <WhyDisclosure summary="See the reasoning" style={{ marginTop: nextAction ? 2 : 12 }}>
        {/* DELTA-002 slice 1: the plain answer first; the rules in detail stay below. */}
        <div className="why-plain" data-why-plain>{explainRecommendation(recommendation, checkIn).map((line) => <p key={line}>{line}</p>)}</div>
        {nextAction && <>{evidenceBasis && <p className="meta">{evidenceBasis}</p>}<p className="meta">{describeRecommendationEffect(recommendation.kind)}</p>
</>}
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

          <p className="why-selection">{describeSelectionReason(recommendation.trace.selectionReason)}</p>
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
          {isAllClear && !nextAction && (
            <p className="card-body" style={{ marginTop: 12 }}>{describeRecommendationEffect(recommendation.kind)}</p>
          )}
          <p className="meta" style={{ marginTop: 8 }}>
            ENGINE {recommendation.trace.engineVersion} · EVALUATED{" "}
            {new Date(recommendation.trace.evaluatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
          </p>
        </div>
        <p className="meta">Your call.</p>
      </WhyDisclosure>
      <div style={{ marginTop: nextAction ? 0 : isDominant && !isAllClear ? 20 : 12 }}>
        {nextAction ? (
          decision ? isAllClear ? <p className="meta">{describeRecordedDecision(decision)}</p> : <>
            <p className="meta">{describeRecordedDecision(decision)}</p>
            {canHandoff ? <button type="button" className="btn-primary cc-cta" disabled={busy} onClick={() => onHandoff(recommendationHandoff!)}>{describeRecommendationHandoff(recommendationHandoff!)}</button>
              : <button type="button" className="btn-primary cc-cta" disabled>{describeRecordedDecision(decision)}</button>}
          </> : !isAllClear && <>
            <button className="btn-primary cc-cta" disabled={busy} onClick={onRecord}>{describeRecommendationAction(recommendation.kind)}</button>

          </>
        ) : <>
        {decision ? (
          <>
            {/* DECLUTTER Drop 2 (owner ruling 2026-09-30): the all-clear
                button is neutral, not red, in both states. */}
            <button className={isAllClear ? "btn-secondary" : "btn-primary"} disabled style={isDominant && !isAllClear ? { fontSize: 18, padding: "18px var(--space-4)" } : undefined}>
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
                  className={isAllClear ? "btn-secondary" : "btn-primary"}
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
            {/* DECLUTTER-001: for the all-clear state this note now lives inside
                "How BEYOND decided" instead of under the button. */}
            {!isAllClear && (
              <p className="meta" style={{ marginTop: 8 }}>
                {describeRecommendationEffect(recommendation.kind)}
              </p>
            )}
          </>
        )}
        </>}
        {decision === "DECLINED" && <ReflectOnDecline recommendationId={recommendation.id} title={title} why={describeRecommendationReason(recommendation.rationale)} />}
        {confirmPanel}
      </div>
    </>
  );
  if (nextAction) return <div key={recommendation.id} className={`cc-panel cc-rec next-action-card${isAllClear ? " all-clear" : " command-surface"}`}>{cardContent}</div>;
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

/** TONIGHT-001: the all-clear headline, honest about a question shown below it. */
export function describeAllClearHeadline(questionBelow = false): string {
  return questionBelow ? "Nothing urgent. One question below." : "Nothing needs you.";
}
