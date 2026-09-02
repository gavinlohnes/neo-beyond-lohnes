import type { Mission, Obligation } from "../../../domain/intent/types";
import type { ObligationRelevance } from "../../../engine/obligationRelevance";
import { isAttentionWorthyTier } from "../../../engine/obligationRelevance";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { SignalRow } from "../../components/SignalRow";
import { describeCommitmentMission, describeCommitmentsSummary, describeObligationRelevance } from "./commitmentsCopy";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderCommitmentsCard` closure. See that
 * function's original doc comment (preserved in git history) for why
 * VIEW switches tabs rather than deep-linking to this specific
 * Obligation — unchanged by this extraction.
 */
export function CommitmentsCard({
  headlineCommitment,
  unresolvedObligationsCount,
  commitmentsOpen,
  setCommitmentsOpen,
  headlineCommitmentMission,
  commitmentConfirmation,
  busy,
  onViewCommitments,
  onRequestSatisfaction,
  onCancelSatisfaction,
  onConfirmSatisfaction,
}: {
  headlineCommitment: ObligationRelevance | null;
  unresolvedObligationsCount: number;
  commitmentsOpen: boolean;
  setCommitmentsOpen: (open: boolean) => void;
  headlineCommitmentMission: { obligationId: string; mission: Mission } | null;
  commitmentConfirmation: { id: string; title: string } | null;
  busy: boolean;
  onViewCommitments?: (() => void) | undefined;
  onRequestSatisfaction: (obligation: Obligation) => void;
  onCancelSatisfaction: () => void;
  onConfirmSatisfaction: () => void;
}) {
  if (!headlineCommitment) return null;
  const otherCount = unresolvedObligationsCount - 1;
  const { obligation, tier } = headlineCommitment;

  if (!commitmentsOpen) {
    return (
      <CollapsibleRow
        name="COMMITMENT"
        summary={describeCommitmentsSummary(tier, obligation, otherCount)}
        onOpen={() => setCommitmentsOpen(true)}
      />
    );
  }

  const body = (
    <>
      <h2 className="card-title">{obligation.title}</h2>
      {obligation.description && <p className="card-body">{obligation.description}</p>}
      {headlineCommitmentMission?.obligationId === obligation.id && (
        <p className="meta" style={{ marginBottom: 4 }}>
          {describeCommitmentMission(headlineCommitmentMission.mission)}
        </p>
      )}
      <p className="meta" style={{ marginBottom: otherCount > 0 ? 4 : 12 }}>
        {describeObligationRelevance(tier, obligation)}
      </p>
      {otherCount > 0 && (
        <p className="meta" style={{ marginBottom: 12 }}>
          +{otherCount} more unresolved.
        </p>
      )}
      {commitmentConfirmation?.id === obligation.id && (
        <div className="fade-in" aria-busy={busy} style={{ marginBottom: 12, padding: 12, border: "1px solid var(--border-subtle)" }}>
          <p className="tool-label" style={{ marginBottom: 4 }}>CONFIRM SATISFACTION</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Mark “{obligation.title}” satisfied? This records that the commitment was fulfilled and cannot currently be undone.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" disabled={busy} onClick={onConfirmSatisfaction}>
              CONFIRM SATISFACTION
            </button>
            <button className="btn-secondary" disabled={busy} onClick={onCancelSatisfaction}>
              CANCEL
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setCommitmentsOpen(false)}>
          CLOSE
        </button>
        {onViewCommitments && (
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={onViewCommitments}>
            VIEW
          </button>
        )}
        {!commitmentConfirmation && (
          <button
            className="btn-secondary"
            style={{ width: "auto", padding: "8px 16px" }}
            aria-label="SATISFY COMMITMENT"
            disabled={busy}
            onClick={() => onRequestSatisfaction(obligation)}
          >
            SATISFY COMMITMENT
          </button>
        )}
      </div>
    </>
  );
  if (isAttentionWorthyTier(tier)) {
    return <SignalRow label="COMMITMENT">{body}</SignalRow>;
  }
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>COMMITMENT</p>
      {body}
    </div>
  );
}
