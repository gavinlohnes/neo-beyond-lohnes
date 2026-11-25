import { useState } from "react";
import type { TodaySnapshot } from "./todayRead";
import type { SessionOutcome } from "./resetShiftDownCopy";

/**
 * GRAYSON-TODAY-SPLIT-003 slice C (small local state): SHIFT DOWN's session state, moved out of TodayScreen
 * unchanged. The open session found by TODAY's read seeds it through `seedFromRead`, called from refresh() in the
 * same synchronous run as the snapshot install, so it lands in the same render as before.
 */
export function useShiftDownSession() {
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [openShiftDownStartedAt, setOpenShiftDownStartedAt] = useState<string | null>(null);
  const [lastShiftDownOutcome, setLastShiftDownOutcome] = useState<SessionOutcome | null>(null);
  function seedFromRead(openShiftDown: TodaySnapshot["openShiftDown"]) {
    if (openShiftDown) {
      setActiveShiftDownId(openShiftDown.eventId);
      setShiftDownDuration(openShiftDown.durationMinutes);
      setOpenShiftDownStartedAt(openShiftDown.startedAt);
    } else {
      setActiveShiftDownId(null);
      setOpenShiftDownStartedAt(null);
    }
  }
  return {
    activeShiftDownId,
    shiftDownDuration,
    setShiftDownDuration,
    openShiftDownStartedAt,
    lastShiftDownOutcome,
    setLastShiftDownOutcome,
    seedFromRead,
  };
}
