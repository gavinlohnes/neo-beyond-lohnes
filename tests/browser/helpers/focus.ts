import { expect } from "vitest";

/**
 * GRAYSON-FLAKES-003: focus moves in effects and on the next frame: wait for it, never read it straight after an
 * action. A screen that focuses its heading when it opens does so in an effect after paint, so a test that focuses a
 * control itself first lets that effect run (two animation frames, as todaySettled does), then focuses, then waits
 * until focus is really there. A focus bug still fails: the poll times out.
 */
export async function afterFocusMoves(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export async function focusAfterSettle(target: Element | { element: () => Element }): Promise<HTMLElement> {
  await afterFocusMoves();
  const el = ("element" in target && typeof target.element === "function" ? target.element() : target) as HTMLElement;
  el.focus();
  await expect.poll(() => document.activeElement).toBe(el);
  return el;
}
