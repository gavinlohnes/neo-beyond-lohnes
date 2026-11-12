import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { saveInboxItem } from "../../src/application/savedInbox";
import { db } from "../../src/persistence/db";
import { SavedInboxScreen } from "../../src/ui/screens/more/SavedInboxScreen";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(() => { cleanup(); window.scrollTo(0, 0); });

it("manages a shared item at 360px without creating a task until the operator asks", async () => {
  await saveInboxItem({ source: "SHARE", title: "Rotation article", text: "Keep the useful part.", url: "https://example.com/rotation" });
  const screen = await render(<SavedInboxScreen active />);
  await expect.element(screen.getByRole("heading", { name: "Rotation article", exact: true })).toBeVisible();
  expect(await db.obligations.count()).toBe(0);
  await screen.getByRole("textbox", { name: "Tags", exact: true }).fill("work, later");
  await screen.getByRole("textbox", { name: "Note", exact: true }).fill("Review after the shift.");
  await screen.getByRole("button", { name: "SAVE CHANGES", exact: true }).click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("Saved item updated.");
  await screen.getByRole("button", { name: "MAKE TASK", exact: true }).click();
  // The click returns before the write lands; wait for it rather than racing it.
  await expect.poll(() => db.obligations.count()).toBe(1);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  for (const control of document.querySelectorAll<HTMLElement>(".saved-inbox button, .saved-inbox input, .saved-inbox textarea")) {
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("button", { name: "DELETE", exact: true }).click();
  expect(await db.savedInboxItems.count()).toBe(1);
  await screen.getByRole("button", { name: "CONFIRM DELETE", exact: true }).click();
  await expect.element(screen.getByText("Nothing saved yet. Share text or a link to BEYOND from another app.", { exact: true })).toBeVisible();
});
