import { commandResult } from "./command";
import type { render } from "vitest-browser-react";
type Screen = Awaited<ReturnType<typeof render>>;
import { expect } from "vitest";
import type { Locator } from "vitest/browser";

/**
 * Shift Clock (Drop 2): every TODAY capability that isn't one of the current
 * phase's rows lives behind one TOOLS row. Tests that reach for one of those
 * capabilities open TOOLS first — one tap, the same as the operator.
 */
export async function openTodayTools(screen: Screen): Promise<void> {
  if (!screen.getByRole("button", { name: "Open TOOLS" }).elements().length && !screen.getByRole("button", { name: "Close TOOLS" }).elements().length) {
    await (await commandResult(screen, "TODAY TOOLS")).click();
  }
  const close = screen.getByRole("button", { name: "Close TOOLS" });
  if (!close.elements().length) await screen.getByRole("button", { name: "Open TOOLS" }).click();
  await expect.element(close).toBeVisible();
}

/**
 * COMMAND-CENTER-001: quick Capture is TODAY's + LOG → Note (it was its own
 * CAPTURE button). Two taps, the same as the operator.
 */
export async function openCaptureFromLog(screen: { getByRole: (role: "button" | "dialog", options?: { name: string | RegExp }) => Locator }): Promise<void> {
  await screen.getByRole("button", { name: "Open LOG" }).click();
  const sheet = screen.getByRole("dialog", { name: "LOG" });
  await expect.element(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Note/i }).click();
}

/**
 * COMMAND-CENTER-001: TODAY's SYSTEM dialog is retired; its catalog is the
 * COMMAND tab's search. Opens COMMAND's index and types the query.
 */
export async function searchCommand(screen: { getByRole: (role: "button" | "searchbox", options?: { name: string; exact?: boolean }) => Locator }, query: string): Promise<Locator> {
  const tab = screen.getByRole("button", { name: "COMMAND", exact: true });
  await tab.click();
  if (tab.element().getAttribute("aria-current") === "page" && screen.getByRole("searchbox", { name: "Find a screen or action" }).elements().length === 0) await tab.click();
  const search = screen.getByRole("searchbox", { name: "Find a screen or action" });
  await expect.element(search).toBeVisible();
  await search.fill(query);
  return search;
}

export async function revealAllGood(screen: { getByRole: (role: "button" | "dialog", options?: { name: string | RegExp; exact?: boolean }) => Locator }): Promise<void> {
  const sheet = screen.getByRole("dialog", { name: "CHECK IN", exact: true });
  if (!sheet.elements().length) await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
  const summary = sheet.element().querySelector("details:last-child > summary") as HTMLElement;
  if (!(summary.parentElement as HTMLDetailsElement).open) summary.click();
  await expect.element(sheet.getByRole("button", { name: "ALL GOOD", exact: true })).toBeVisible();
}
