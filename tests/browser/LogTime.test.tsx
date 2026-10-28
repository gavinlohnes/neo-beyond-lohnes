import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { getHydrationEntries } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** LOG-TIME-001: one extra tap says when it happened; the log lands there, then WHEN returns to NOW. */
let dayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 27, 16, 35));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay()).id;
  vi.setSystemTime(new Date(2026, 9, 28, 4, 30));
  await page.viewport(360, 800);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("logs water an hour ago from the sheet, says so, and resets to NOW", async () => {
  const screen = await render(<App />);
  const continueButton = screen.getByRole("button", { name: "CONTINUE", exact: true });
  if (document.querySelector(".shift-change")) await continueButton.click();
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
  const when = sheet.getByRole("group", { name: "When" });
  await expect.element(when.getByRole("button", { name: "NOW", exact: true })).toHaveAttribute("aria-pressed", "true");
  await when.getByRole("button", { name: "1 H AGO", exact: true }).click();
  expect((await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
  await sheet.getByRole("button", { name: "+16 oz", exact: true }).click();
  await expect.element(screen.getByText("16 oz recorded at 03:30.", { exact: true })).toBeVisible();
  const [entry] = await getHydrationEntries(dayId);
  expect(entry!.at).toBe(new Date(2026, 9, 28, 3, 30).toISOString());
  expect(entry!.recordedAt).toBe(new Date(2026, 9, 28, 4, 30).toISOString());
});
