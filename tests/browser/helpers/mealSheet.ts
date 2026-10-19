import { expect } from "vitest";
import type { render } from "vitest-browser-react";

type Screen = Awaited<ReturnType<typeof render>>;

/** TONIGHT-001: TODAY's MEAL opens a sheet; its last option opens BODY's meal entry. */
export function mealButton(screen: Screen) {
  return screen.getByRole("button", { name: "Log a meal", exact: true });
}

export async function openMealInBody(screen: Screen) {
  await mealButton(screen).click();
  await screen.getByRole("button", { name: /^New meal or manual entry/ }).click();
}

/** The same, through DOM clicks, for tests that must not let a locator scroll the page. */
export async function openMealInBodyDom(screen: Screen) {
  (mealButton(screen).element() as HTMLElement).click();
  await expect.poll(() => document.querySelector("dialog[aria-labelledby='meal-sheet-title']")).not.toBeNull();
  const option = [...document.querySelectorAll<HTMLButtonElement>("dialog[aria-labelledby='meal-sheet-title'] button")]
    .find((button) => button.textContent?.startsWith("New meal or manual entry"));
  option!.click();
}
