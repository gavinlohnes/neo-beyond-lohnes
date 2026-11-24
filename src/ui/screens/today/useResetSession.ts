import { useState } from "react";
import type { TodaySnapshot } from "./todayRead";
import type { SessionOutcome } from "./resetShiftDownCopy";

/**
 * GRAYSON-TODAY-SPLIT-003 slice C (small local state): RESET's session state, moved out of TodayScreen unchanged.
 * The open session found by TODAY's read seeds it through `seedFromRead`, called from refresh() in the same
 * synchronous run as the snapshot install, so it lands in the same render as before.
 */
export function useResetSession() {
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [openResetStartedAt, setOpenResetStartedAt] = useState<string | null>(null);
  const [lastResetOutcome, setLastResetOutcome] = useState<SessionOutcome | null>(null);
  function seedFromRead(openReset: TodaySnapshot["openReset"]) {
    if (openReset) {
      setActiveResetId(openReset.eventId);
      setResetIntensity(openReset.intensity);
      setOpenResetStartedAt(openReset.startedAt);
    } else {
      setActiveResetId(null);
      setOpenResetStartedAt(null);
    }
  }
  return {
    activeResetId,
    resetIntensity,
    setResetIntensity,
    openResetStartedAt,
    lastResetOutcome,
    setLastResetOutcome,
    seedFromRead,
  };
}
