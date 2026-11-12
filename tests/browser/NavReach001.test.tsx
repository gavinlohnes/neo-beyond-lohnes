import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** NAV-REACH-001: the reflective views link to each other, and BACK returns to where you came from. */
beforeEach(async () => { await page.viewport(390, 844); });
afterEach(async () => { await cleanup(); sessionStorage.clear(); });

async function openByName(screen: Awaited<ReturnType<typeof render>>, query: string, label: string, description: string) {
  await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill(query);
  await screen.getByRole("button", { name: `${label} ${description}`, exact: true }).click();
}
const views = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("group", { name: "Personal understanding views" });

it("daily note → DELTA → back, and DELTA → weekly interview → back", async () => {
  await startDay();
  const before = await db.events.count();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "daily note", "DAILY NOTE", "Write about today, tag it, answer DELTA's question");
  await screen.getByRole("button", { name: "SEE DELTA", exact: true }).click();
  await expect.element(views(screen).getByRole("button", { name: "DELTA" })).toHaveAttribute("aria-pressed", "true");
  await screen.getByRole("button", { name: "BACK TO DAILY NOTE", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "Your note", exact: true })).toBeVisible();

  await screen.getByRole("button", { name: "SEE PATTERNS", exact: true }).click();
  await expect.element(views(screen).getByRole("button", { name: "Patterns" })).toHaveAttribute("aria-pressed", "true");
  const links = screen.getByRole("group", { name: "Write or look back" });
  await links.getByRole("button", { name: "OPEN WEEKLY INTERVIEW", exact: true }).click();
  await expect.element(screen.getByText("WHAT THIS WEEK SHOWED")).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).first().click();
  await expect.element(views(screen)).toBeVisible();

  await screen.getByRole("group", { name: "Write or look back" }).getByRole("button", { name: "OPEN DAILY NOTE", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "Your note", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).first().click();
  await expect.element(views(screen)).toBeVisible();
  // A plain trip from the menu still returns to MORE.
  await screen.getByRole("button", { name: "BACK TO MORE", exact: true }).click();
  await openByName(screen, "daily note", "DAILY NOTE", "Write about today, tag it, answer DELTA's question");
  await expect.element(screen.getByRole("button", { name: "BACK TO MORE", exact: true })).toBeVisible();
  // Getting around wrote nothing.
  expect(await db.events.count()).toBe(before);
});

it("the weekly interview links to patterns, and back returns to the weekly check-in", async () => {
  await startDay();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "interview", "WEEKLY INTERVIEW", "Look back at the week and answer a few questions");
  await screen.getByRole("button", { name: "SEE PATTERNS", exact: true }).click();
  await expect.element(views(screen).getByRole("button", { name: "Patterns" })).toHaveAttribute("aria-pressed", "true");
  await screen.getByRole("button", { name: "BACK TO WEEKLY CHECK-IN", exact: true }).click();
  await expect.element(screen.getByText("MORE // WEEKLY CHECK-IN", { exact: true })).toBeVisible();
});
