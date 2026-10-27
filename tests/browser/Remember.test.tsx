import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { answerFollowUp, recordShiftDebrief, reflectOnDecline } from "../../src/application/reflect";
import { setModePin } from "../../src/application/modePinQueries";
import { db } from "../../src/persistence/db";

/** LOOP step 4 — REMEMBER: your own conclusions return on TODAY at the moment they apply. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });
const RED = { energy: 1, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 } as const;

it("the same kind of recommendation carries your lesson, and the advice itself is unchanged", async () => {
  await page.viewport(320, 850);
  const day = await startDay();
  const { recommendation: first } = await submitCheckIn(day.id, RED);
  const reason = await reflectOnDecline({ id: first.id, title: "Stabilize", why: "Capacity is low." }, "Wrong for me");
  await answerFollowUp(reason.id, "Should have done it", "Basics first when energy is 1");
  await submitCheckIn(day.id, RED);
  const recommendations = await db.recommendations.toArray();
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByText(/Looking back: should have done it\. Your lesson: Basics first when energy is 1\.$/)).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Not doing this" })).toBeVisible(); // still your call
  expect(await db.recommendations.toArray()).toEqual(recommendations);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  expect((await axe.run(document.querySelector("[data-remember-lesson]")!.closest("section, .cc-panel, .command-surface")!)).violations).toEqual([]);
});

it("before the next shift, PREP shows the one thing from your last debrief", async () => {
  await page.viewport(390, 850);
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 27, 7));
  await recordShiftDebrief({ felt: "Rough", because: [], next: "Nap before" });
  vi.setSystemTime(new Date(2026, 9, 27, 17));
  const day = await startDay();
  setModePin(day.id, "PRE_WORK");
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByText("From your last debrief — Next shift: Nap before")).toBeVisible();
  await cleanup();
  setModePin(day.id, "OFF");
  const off = await render(<TodayScreen />);
  await expect.element(off.getByRole("button", { name: /^Mode / })).toBeVisible();
  expect(document.querySelector("[data-remember-debrief]")).toBeNull();
});
