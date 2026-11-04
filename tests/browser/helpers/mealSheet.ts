import { expect } from "vitest";
import type { render } from "vitest-browser-react";
type Screen = Awaited<ReturnType<typeof render>>;
export function mealButton(screen: Screen) { return screen.getByRole("button", { name: "Log a meal", exact: true }); }

/** Existing preset management/correction form, now behind the production meal sheet. */
export async function openMealInBody(screen: Screen) {
  await mealButton(screen).click();
  // Wait for the sheet's contents first; checking synchronously can run before it renders and skip the route.
  await expect.poll(() => screen.getByRole("button", { name: /^New meal or manual entry/ }).elements().length + screen.getByRole("button", { name: "More meal tools & corrections", exact: true }).elements().length).toBeGreaterThan(0);
  const oldRoute = screen.getByRole("button", { name: /^New meal or manual entry/ });
  // Isolated TODAY harnesses expose the DATA handoff instead of mounting RecordSheets.
  if (oldRoute.elements().length) { await oldRoute.click(); return; }
  const tools = screen.getByRole("dialog").getByRole("button", { name: "More meal tools & corrections", exact: true });
  await tools.click();
  await expect.element(screen.getByRole("dialog", { name: "MEAL TOOLS", exact: true })).toBeVisible();
}
/** DOM clicks avoid a locator scrolling away the origin under test. */
export async function openMealInBodyDom(screen: Screen) {
  (mealButton(screen).element() as HTMLElement).click();
  const option = () => [...document.querySelectorAll<HTMLButtonElement>("dialog[open] button")]
    .find((button) => button.textContent?.startsWith("More meal tools & corrections") || button.textContent?.startsWith("New meal or manual entry"));
  await expect.poll(option).toBeDefined();
  option()!.click();
  await expect.element(screen.getByRole("dialog", { name: "MEAL TOOLS", exact: true })).toBeVisible();
}
export async function closeMealSheet(screen: Screen) {
  await screen.getByRole('dialog').getByRole('button', { name: 'CLOSE', exact: true }).click();
  await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
}
