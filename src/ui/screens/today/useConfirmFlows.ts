import { useRef, useState } from "react";
import { emptyCapturePromotionDraft, type CapturePromotionDraft } from "../../components/CapturePromotionForm";
import type { CaptureDateSuggestion } from "../../../domain/capture/types";

type Feedback = { kind: "SUCCESS" | "ERROR"; message: string };

/**
 * GRAYSON-TODAY-SPLIT-003 slice C (small local state): the capture and commitment confirm flows, moved out of
 * TodayScreen unchanged: the just-resolved capture (its UNDO), the "-> OBLIGATION" conversion panel, and the
 * commitment "done?" confirmation with its feedback line.
 */
export function useConfirmFlows() {
  // Overdrive Phase 17 (Capture 1.1): reopenCaptureItem already existed
  // (application/commands.ts) and was already tested
  // (captureInbox.test.ts, "reopening undoes an accidental resolve") but
  // had no UI wired to it — an accidental RESOLVE tap had no way back.
  // Tracks only the single most-recently-resolved item, mirroring how
  // BODY's own confirmation-with-undo banners work (each new one simply
  // replaces the last) — not a resolved-items history browser, which
  // would start pulling Capture toward task management.
  const [justResolvedCapture, setJustResolvedCapture] = useState<{ id: string; text: string } | null>(null);
  // Capture Processing, Slice 3: the inline "-> OBLIGATION" confirm panel
  // for a specific capture row (id null when closed), the editable title
  // (pre-filled from the capture's own text, never auto-submitted), and a
  // one-line result — same non-undoable SUCCESS/ERROR shape as
  // commitmentFeedback below, since undoing would mean deleting an
  // Obligation, which Drop 01 doctrine has no operation for.
  const [captureConversion, setCaptureConversion] = useState<{ id: string; text: string } | null>(null);
  // CAPTURE-PARITY-001: title, planned day and due date are one draft shared
  // with quick capture's form (components/CapturePromotionForm.tsx).
  const [conversionDraft, setConversionDraft] = useState<CapturePromotionDraft>(emptyCapturePromotionDraft());
  // Capture Intelligence layer (2026-09-02): a chrono-node/Compromise-derived
  // due-date proposal (see engine/captureIntelligence.ts), pre-filled into
  // this same editable field the moment the conversion panel opens — never
  // applied on its own. conversionDateSuggestion is kept only to show the
  // evidence line ("Detected from ..."); conversionDraft.dueAt is the actual,
  // freely editable/clearable form value that gets submitted.
  const [conversionDateSuggestion, setConversionDateSuggestion] = useState<CaptureDateSuggestion | null>(null);
  const [captureConversionFeedback, setCaptureConversionFeedback] = useState<Feedback | null>(null);
  const [commitmentConfirmation, setCommitmentConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [commitmentFeedback, setCommitmentFeedback] = useState<Feedback | null>(null);
  const commitmentFeedbackRef = useRef<HTMLParagraphElement>(null);
  const commitmentSatisfactionPendingRef = useRef(false);
  return {
    justResolvedCapture,
    setJustResolvedCapture,
    captureConversion,
    setCaptureConversion,
    conversionDraft,
    setConversionDraft,
    conversionDateSuggestion,
    setConversionDateSuggestion,
    captureConversionFeedback,
    setCaptureConversionFeedback,
    commitmentConfirmation,
    setCommitmentConfirmation,
    commitmentFeedback,
    setCommitmentFeedback,
    commitmentFeedbackRef,
    commitmentSatisfactionPendingRef,
  };
}
