import { useState } from "react";
import { useSessionDraft } from "../../sessionDrafts";
import { FIX_UNDO_MS, useUndoWindow } from "../../hooks/useUndoWindow";
import type { CheckInDraft } from "../../../engine/checkInDraft";
import type { PartialCheckInValues } from "./checkInFields";

/**
 * GRAYSON-TODAY-SPLIT-003 slice C (small local state): the check-in form's state, moved out of TodayScreen
 * unchanged: the tapped values, the error, whether the draft was dismissed (START BLANK), and the fix sheet's
 * target and Undo.
 */
export function useCheckInForm(operationsOnly: boolean, checkInDraft: CheckInDraft | undefined) {
  const [values, setValues] = useState<PartialCheckInValues>({});
  const [checkInError, setCheckInError] = useState<string | null>(null);
  useSessionDraft(operationsOnly ? "command-check-in" : "check-in", Object.keys(values).length > 0);
  // Drop 5: the check-in draft (the operator's previous answers), and whether they chose START BLANK.
  const [checkInDraftDismissed, setCheckInDraftDismissed] = useState(false);
  const activeCheckInDraft = checkInDraft && !checkInDraftDismissed ? checkInDraft : undefined;
  // What the form shows and submits: taps win over the draft.
  const checkInFormValues: PartialCheckInValues = values;
  // GRAYSON-CHECKIN-EDIT-001: which check-in the fix sheet is open on, and the Undo shown for FIX_UNDO_MS after a fix.
  const [fixCheckInId, setFixCheckInId] = useState<string | null>(null);
  const [fixUndo, setFixUndo] = useUndoWindow<{ message: string; correctionEventId?: string }>(FIX_UNDO_MS);
  return {
    values,
    setValues,
    checkInError,
    setCheckInError,
    checkInDraftDismissed,
    setCheckInDraftDismissed,
    activeCheckInDraft,
    checkInFormValues,
    fixCheckInId,
    setFixCheckInId,
    fixUndo,
    setFixUndo,
  };
}
