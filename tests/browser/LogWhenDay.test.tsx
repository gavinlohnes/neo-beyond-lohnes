import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { performDueDayRollover, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getHydrationEntries } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { settleVisuals } from "./helpers/settleVisuals";
import { openLogTarget } from "./helpers/logSheet";

/** GRAYSON WHEN upgrade: DAY puts the log on yesterday; SHIFT END is one tap; today is untouched. */
let yesterdayId: string, todayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 27, 16, 35));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  yesterdayId = (await startDay()).id;
  vi.setSystemTime(new Date(2026, 9, 28, 16, 40));
  todayId = (await performDueDayRollover())!.id;
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`logs water on yesterday at its shift end at ${width}px`, async () => {
    await page.viewport(width, 800);
    const screen = await render(<App />);
    if (document.querySelector(".shift-change")) await screen.getByRole("button", { name: "CONTINUE", exact: true }).click();
    vi.setSystemTime(new Date(2026, 9, 28, 16, 45));
    await openLogTarget(screen, "WATER");
    const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
    const day = sheet.getByRole("group", { name: "Day" });
    await expect.element(day.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-pressed", "true");
    await day.getByRole("button", { name: "YESTERDAY", exact: true }).click();
    // An earlier day has no "now": NOW and AGO leave, and it asks for when.
    const when = sheet.getByRole("group", { name: "When" });
    expect(when.getByRole("button", { name: "NOW", exact: true }).query()).toBeNull();
    await expect.element(sheet.getByText("Pick when on yesterday.", { exact: true })).toBeVisible();
    await sheet.getByRole("group", { name: "Shift" }).getByRole("button", { name: "Shift end, 06:00", exact: true }).click();
    await settleVisuals(sheet.element());
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    await sheet.getByRole("button", { name: "+16 oz", exact: true }).click();
    await expect.element(screen.getByText("16 oz recorded yesterday at 06:00.", { exact: true })).toBeVisible();
    expect((await getHydrationEntries(yesterdayId)).map((e) => e.at)).toEqual([new Date(2026, 9, 28, 6).toISOString()]);
    expect(await getHydrationEntries(todayId)).toEqual([]);
  });
}

it("after END DAY with no new day open, YESTERDAY is the real yesterday and the receipt says where it landed", async () => {
  const { endDay } = await import("../../src/application/commands");
  // beforeEach left the 27th ended and the 28th active; end the 28th too and look from the 29th's morning.
  vi.setSystemTime(new Date(2026, 9, 29, 9, 0));
  await endDay(todayId, "EXPLICIT_END_DAY");
  vi.setSystemTime(new Date(2026, 9, 29, 10, 5));
  await page.viewport(360, 800);
  const screen = await render(<App />);
  if (document.querySelector(".shift-change")) await screen.getByRole("button", { name: "CONTINUE", exact: true }).click();
  vi.setSystemTime(new Date(2026, 9, 29, 10, 5));
  await openLogTarget(screen, "WATER");
  const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
  const day = sheet.getByRole("group", { name: "Day" });
  await day.getByRole("button", { name: "YESTERDAY", exact: true }).click();
  // Only one earlier day is offered: the 27th's lived day. The 28th's (still today's) is not.
  expect(day.getByRole("combobox").query()).toBeNull();
  await sheet.getByRole("group", { name: "When" }).getByLabelText("Pick a time").fill("20:00");
  await sheet.getByRole("button", { name: "+8 oz", exact: true }).click();
  await expect.element(screen.getByText("8 oz recorded yesterday at 20:00.", { exact: true })).toBeVisible();
  expect((await getHydrationEntries(yesterdayId)).map((e) => e.at)).toEqual([new Date(2026, 9, 27, 20).toISOString()]);
  expect(await getHydrationEntries(todayId)).toEqual([]);
});
