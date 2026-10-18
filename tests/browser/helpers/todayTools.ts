import { expect } from "vitest";
import type { Locator } from "vitest/browser";

/**
 * Shift Clock (Drop 2): every TODAY capability that isn't one of the current
 * phase's rows lives behind one TOOLS row. Tests that reach for one of those
 * capabilities open TOOLS first — one tap, the same as the operator.
 */
export async function openTodayTools(screen: { getByRole: (role: "button", options: { name: string }) => Locator }): Promise<void> {
  const open = screen.getByRole("button", { name: "Open TOOLS" });
  await expect.element(open).toBeVisible();
  await open.click();
  await expect.element(screen.getByRole("button", { name: "Close TOOLS" })).toBeVisible();
}

/**
 * COMMAND-CENTER-001: quick Capture is TODAY's + LOG → Note (it was its own
 * CAPTURE button). Two taps, the same as the operator.
 */
export async function openCaptureFromLog(screen: { getByRole: (role: "button" | "dialog", options?: { name: string | RegExp }) => Locator }): Promise<void> {
  await screen.getByRole("button", { name: "Open LOG" }).click();
  const sheet = screen.getByRole("dialog", { name: "LOG" });
  await expect.element(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Note/ }).click();
}
