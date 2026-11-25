import { expect } from "vitest";
import { getActiveDay } from "../../../src/application/queries";

/**
 * Waits until TODAY has stopped moving, so a tap or a layout check lands on the final page rather than racing it.
 * TODAY's async sections arrive after first paint. When a day exists, TONIGHT'S ENERGY (ENERGY-CURVE-001) always
 * appears once its read settles, and it pushes the tiles below it down, so a tap located before then can miss
 * (MetricPage001 on #622) and a section-order check can see the page without it (RedesignToday on #620).
 * Two animation frames afterwards let the resulting layout land before the test acts.
 */
export async function todaySettled(): Promise<void> {
  await expect.poll(() => document.querySelector(".redesign-today")).not.toBeNull();
  if (await getActiveDay()) await expect.poll(() => document.querySelector('.redesign-today [aria-label="Tonight\'s energy"]')).not.toBeNull();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
