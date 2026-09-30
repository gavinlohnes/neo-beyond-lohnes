import { expect } from "vitest";
import type { Locator } from "vitest/browser";

/** Press and hold a HoldButton long enough to confirm (Drop 4 hold-to-confirm). */
export async function holdToConfirm(locator: Locator, ms = 1100): Promise<void> {
  await expect.element(locator).toBeVisible();
  // A click waits for the button to be enabled; a synthetic hold has to wait for it too.
  await expect.element(locator).toBeEnabled();
  const el = locator.element() as HTMLElement;
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1, isPrimary: true }));
  await new Promise((resolve) => setTimeout(resolve, ms));
  el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1, isPrimary: true }));
}
