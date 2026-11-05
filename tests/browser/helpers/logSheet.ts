import { expect } from "vitest";
import type { render } from "vitest-browser-react";

type Screen = Awaited<ReturnType<typeof render>>;

/** TODAY-FOLD-001: the permanent center LOG is the single entry to ordinary logging. */
export async function openLogTarget(screen: Screen, target: "WATER" | "MEAL") {
  await screen.getByRole("button", { name: "Open LOG", exact: true }).click();
  const log = screen.getByRole("dialog", { name: "LOG", exact: true });
  await expect.element(log).toBeVisible();
  await log.getByRole("button", { name: target, exact: true }).click();
}
