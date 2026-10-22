import { expect } from "vitest";
import type { render } from "vitest-browser-react";
type Screen = Awaited<ReturnType<typeof render>>;
export function mealButton(screen: Screen) { return screen.getByRole("button", { name: "Log a meal", exact: true }); }

/** Existing preset management/correction form, now behind the production meal sheet. */
export async function openMealInBody(screen: Screen) {
  await mealButton(screen).click();
  const oldRoute = screen.getByRole("button", { name: /^New meal or manual entry/ });
  if (oldRoute.elements().length) await oldRoute.click();
  const tools = screen.getByRole("dialog").getByRole("button", { name: "More meal tools & corrections", exact: true });
  if (tools.elements().length) await tools.click();
}
/** DOM clicks avoid a locator scrolling away the origin under test. */
export async function openMealInBodyDom(screen: Screen) {
  (mealButton(screen).element() as HTMLElement).click();
  await expect.poll(() => document.querySelector("dialog[open]")).not.toBeNull();
  const option = [...document.querySelectorAll<HTMLButtonElement>("dialog[open] button")]
    .find((button) => button.textContent?.startsWith("More meal tools & corrections") || button.textContent?.startsWith("New meal or manual entry"));
  option!.click();
}
export async function closeMealSheet(screen: Screen) {
  await screen.getByRole('dialog').getByRole('button', { name: 'CLOSE', exact: true }).click();
  await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
}
