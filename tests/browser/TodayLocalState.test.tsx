import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { useResetSession } from "../../src/ui/screens/today/useResetSession";
import { useShiftDownSession } from "../../src/ui/screens/today/useShiftDownSession";
import { useCheckInForm } from "../../src/ui/screens/today/useCheckInForm";
import { useSmallSteps } from "../../src/ui/screens/today/useSmallSteps";
import type { TodaySnapshot } from "../../src/ui/screens/today/todayRead";

// GRAYSON-TODAY-SPLIT-003 slice C: TODAY's small local state lives in hooks. These pin the seeding and defaults
// that moved out of TodayScreen unchanged. Invented data.

type Box<T> = { current: T | null };
async function capture<T>(useHook: () => T): Promise<Box<T>> {
  const box: Box<T> = { current: null };
  function Probe() {
    box.current = useHook();
    return null;
  }
  await render(<Probe />);
  return box;
}
const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

afterEach(() => cleanup());

describe("TODAY slice C local-state hooks", () => {
  it("RESET: an open reset seeds id, intensity and start; no open reset clears id and start but keeps intensity", async () => {
    const reset = await capture(useResetSession);
    expect(reset.current).toMatchObject({ activeResetId: null, resetIntensity: 3, openResetStartedAt: null, lastResetOutcome: null });
    reset.current!.seedFromRead({ eventId: "r-1", intensity: 5, startedAt: "2026-11-24T14:00:00.000Z" } as NonNullable<TodaySnapshot["openReset"]>);
    await settle();
    expect(reset.current).toMatchObject({ activeResetId: "r-1", resetIntensity: 5, openResetStartedAt: "2026-11-24T14:00:00.000Z" });
    reset.current!.seedFromRead(undefined);
    await settle();
    expect(reset.current).toMatchObject({ activeResetId: null, resetIntensity: 5, openResetStartedAt: null });
  });

  it("SHIFT DOWN: an open session seeds id, duration and start; none clears id and start but keeps duration", async () => {
    const sd = await capture(useShiftDownSession);
    expect(sd.current).toMatchObject({ activeShiftDownId: null, shiftDownDuration: 10, openShiftDownStartedAt: null });
    sd.current!.seedFromRead({ eventId: "s-1", durationMinutes: 20, startedAt: "2026-11-24T23:00:00.000Z" } as NonNullable<TodaySnapshot["openShiftDown"]>);
    await settle();
    expect(sd.current).toMatchObject({ activeShiftDownId: "s-1", shiftDownDuration: 20, openShiftDownStartedAt: "2026-11-24T23:00:00.000Z" });
    sd.current!.seedFromRead(undefined);
    await settle();
    expect(sd.current).toMatchObject({ activeShiftDownId: null, shiftDownDuration: 20, openShiftDownStartedAt: null });
  });

  it("check-in form: the draft shows until START BLANK dismisses it", async () => {
    const draft = { values: { energy: 3 } } as unknown as Parameters<typeof useCheckInForm>[1];
    const form = await capture(() => useCheckInForm(false, draft));
    expect(form.current!.activeCheckInDraft).toBe(draft);
    expect(form.current!.checkInFormValues).toEqual({});
    form.current!.setCheckInDraftDismissed(true);
    await settle();
    expect(form.current!.activeCheckInDraft).toBeUndefined();
  });

  it("Small Steps: exit turns it off, clears the tool and opens TOOLS", async () => {
    const opened: boolean[] = [];
    const steps = await capture(() => useSmallSteps((open) => opened.push(open)));
    steps.current!.setSmallSteps(true);
    steps.current!.setSmallTool("CAPTURE");
    await settle();
    expect(steps.current).toMatchObject({ smallSteps: true, smallTool: "CAPTURE" });
    steps.current!.exitSmallSteps();
    await settle();
    expect(steps.current).toMatchObject({ smallSteps: false, smallTool: null });
    expect(opened).toEqual([true]);
  });
});
