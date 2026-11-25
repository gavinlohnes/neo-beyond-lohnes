import { describe, expect, it } from "vitest";
import { deriveTodayView, type TodayViewUi } from "../../src/ui/screens/today/todayView";
import { EMPTY_TODAY_SNAPSHOT, type TodaySnapshot } from "../../src/ui/screens/today/todayRead";
import { TOOLS_ORDER } from "../../src/ui/screens/today/shiftClock";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { deriveLifeState, lifeStateInput } from "../../src/application/lifeState";

// GRAYSON-TODAY-SPLIT-003 slice D1: TODAY's derived view is computed in render from the one read, the local values and
// the minute clock. Invented data; the default rotation saved as his own (Week A Mon/Tue/Fri/Sat/Sun, Week B Wed/Thu, 18:00-06:00).

const UI: TodayViewUi = {
  activeResetId: null,
  activeShiftDownId: null,
  checkInFormOpen: false,
  commandFocus: undefined,
  hydrationOperationOpen: false,
  measured: null,
  modePin: null,
  nextWorkout: null,
  paceHistories: null,
  workContextOpen: false,
  workoutQuestion: { open: false },
};
function dayAt(startedAt: Date, workContext: "WORK" | "OFF" | "UNKNOWN" = "UNKNOWN") {
  return {
    id: `day-${startedAt.toISOString()}`,
    startedAt: startedAt.toISOString(),
    timezoneId: "America/Chicago",
    workContext,
    status: "ACTIVE",
    createdAt: startedAt.toISOString(),
    updatedAt: startedAt.toISOString(),
  } as unknown as NonNullable<TodaySnapshot["day"]>;
}
/** The default rotation, saved by the operator (a saved schedule is what life state reads). */
const PATTERN = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-11-01T00:00:00.000Z" };
const snap = (patch: Partial<TodaySnapshot>): TodaySnapshot => ({ ...EMPTY_TODAY_SNAPSHOT, ...patch });

describe("deriveTodayView", () => {
  it("no day: no rows, every tool in TOOLS, no life state, nothing stale", () => {
    const view = deriveTodayView(EMPTY_TODAY_SNAPSHOT, UI, new Date(2026, 10, 24, 10, 0));
    expect(view.phaseRows).toEqual([]);
    expect(view.toolsItems).toEqual([...TOOLS_ORDER]);
    expect(view.lifeState).toBeNull();
    expect(view.lifeMoment).toBeNull();
    expect(view.stale).toBe(false);
    expect(view.headlineCommitment).toBeFalsy();
    expect(view.lookNow).toBeNull();
  });

  it("each life state in a four-week sweep matches the life-state rule, and the view is the same on a second call", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 28; i++) {
      const start = new Date(2026, 10, 2 + i, 16, 30);
      const now = new Date(2026, 10, 2 + i, 20, 0);
      const s = snap({ day: dayAt(start), schedulePattern: PATTERN });
      const view = deriveTodayView(s, UI, now);
      const expected = deriveLifeState(lifeStateInput(now, PATTERN, null, null, undefined, undefined))?.state ?? null;
      expect(view.lifeState).toBe(expected);
      expect(deriveTodayView(s, UI, now)).toEqual(view);
      if (view.lifeState) seen.add(view.lifeState);
    }
    // A four-week sweep of this rotation meets a work run, a recovery day and a free day.
    expect(seen.has("WORK_RUN") && seen.has("RECOVERY")).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it("an open RESET takes the dominant surface; an open SHIFT DOWN does too", () => {
    const s = snap({ day: dayAt(new Date(2026, 10, 24, 16, 30), "OFF"), schedulePattern: PATTERN });
    const now = new Date(2026, 10, 24, 20, 0);
    expect(deriveTodayView(s, { ...UI, activeResetId: "r-1" }, now).dominant).toBe("RESET_ACTIVE");
    expect(deriveTodayView(s, { ...UI, activeShiftDownId: "s-1" }, now).dominant).toBe("SHIFT_DOWN_ACTIVE");
  });

  it("the strip's edge follows System Status, and a day past its 16:30 roll reads stale", () => {
    const day = dayAt(new Date(2026, 10, 23, 16, 30), "OFF");
    const red = deriveTodayView(snap({ day, systemStatus: { level: "RED" } as TodaySnapshot["systemStatus"] }), UI, new Date(2026, 10, 24, 17, 0));
    expect(red.stripLevel).toBe("red");
    expect(red.stale).toBe(true);
    const amber = deriveTodayView(snap({ day, systemStatus: { level: "AMBER" } as TodaySnapshot["systemStatus"] }), UI, new Date(2026, 10, 23, 20, 0));
    expect(amber.stripLevel).toBe("yellow");
    expect(amber.stale).toBe(false);
  });

  it("a manual mode pin changes the shown phase but not the scheduled one", () => {
    const day = dayAt(new Date(2026, 10, 24, 16, 30), "WORK");
    const s = snap({ day, schedulePattern: PATTERN });
    const now = new Date(2026, 10, 24, 17, 0);
    const plain = deriveTodayView(s, UI, now);
    const pinned = deriveTodayView(s, { ...UI, modePin: { dayId: day.id, phase: "OFF" } }, now);
    expect(pinned.scheduledClock).toEqual(plain.scheduledClock);
    expect(pinned.shiftClock.displayPhase).toBe("OFF");
  });
});
