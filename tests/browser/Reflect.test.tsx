import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { JournalScreen } from "../../src/ui/screens/more/JournalScreen";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { reflectOnDecline } from "../../src/application/reflect";
import { db } from "../../src/persistence/db";

/** LOOP step 2 — REFLECT: a reason after "Not doing this" and "how did it go?" (the debrief lives in the shift handoff since LOOP-002; see ShiftHandoff.test.tsx). */
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });
const noOverflow = (width: number) => expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);

it("after declining, an optional reason is saved to the journal, linked to that recommendation", async () => {
  await page.viewport(320, 800);
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 1, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 });
  const screen = await render(<TodayScreen />);
  await screen.getByRole("button", { name: "Not doing this" }).click();
  await screen.getByRole("button", { name: "PROCEED ANYWAY" }).click();
  await expect.element(screen.getByText("Why not? Optional. It goes in your journal, not into the advice.")).toBeVisible();
  const before = await db.recommendations.toArray();
  await screen.getByRole("button", { name: "Wrong for me", exact: true }).click();
  await screen.getByLabelText("Anything to add? Optional.").fill("Slept well after all");
  await screen.getByRole("button", { name: "SAVE TO JOURNAL" }).click();
  await expect.element(screen.getByText(/^Saved to your journal: Wrong for me\./)).toBeVisible();
  const [entry] = await db.decisionJournalEntries.toArray();
  expect(entry).toMatchObject({ decision: "Wrong for me", reasoning: "Slept well after all", linkedRecommendationId: before.at(-1)!.id });
  expect(await db.recommendations.toArray()).toEqual(before); // the advice itself is untouched
  noOverflow(320);
  expect((await axe.run(document.querySelector("[data-reflect-saved]")!.parentElement!)).violations).toEqual([]);
});

it("the journal asks how it went from the next lived day, and one tap reviews it", async () => {
  await page.viewport(390, 850);
  const entry = await reflectOnDecline({ id: "rec-1", title: "Recover", why: "Capacity is moderate." }, "Not today");
  await db.decisionJournalEntries.update(entry.id, { createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() });
  const screen = await render(<JournalScreen />);
  await expect.element(screen.getByRole("heading", { name: "How did it go?" })).toBeVisible();
  await screen.getByRole("button", { name: "Should have done it", exact: true }).click();
  await screen.getByLabelText("Lesson for next time? Optional.").fill("Recover days pay off");
  noOverflow(390);
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "How did it go?" })).not.toBeInTheDocument();
  expect(await db.decisionJournalEntries.get(entry.id)).toMatchObject({ status: "REVIEWED", outcome: "Should have done it", lesson: "Recover days pay off" });
});
