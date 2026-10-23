import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WholePicture } from "../../src/ui/screens/review/WholePicture";
import { getWholePicture } from "../../src/application/wholePictureQueries";
import { startDay, endDay, logSleep, logProtein, setWorkContext, submitCheckIn } from "../../src/application/commands";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import { getWeeklyReviewRecords } from "../../src/application/weeklyReviewQueries";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { db } from "../../src/persistence/db";
vi.mock("../../src/application/wholePictureQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/wholePictureQueries")>();
  return { ...actual, getWholePicture: vi.fn(actual.getWholePicture) };
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.mocked(getWholePicture).mockClear(); await page.viewport(1280, 800); });
async function seed() {
  vi.useFakeTimers({ toFake: ["Date"] });
  for (let dayNumber = 12; dayNumber <= 19; dayNumber++) {
    vi.setSystemTime(new Date(2026, 9, dayNumber, 20)); const day = await startDay();
    await setWorkContext(day.id, dayNumber <= 15 ? "WORK" : "OFF", "MANUAL");
    await logSleep(day.id, dayNumber <= 15 ? 360 : 480, "PRIMARY"); await logProtein(day.id, 100);
    await submitCheckIn(day.id, { energy: dayNumber <= 15 ? 2 : 4, stress: dayNumber <= 15 ? 4 : 2, mood: 3, soreness: 0, alcoholUrge: 0 }); await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 20, 20)); await startDay();
}
for (const width of [320, 390, 1280]) it(`connects comparisons to exact contributing days and returns focus at ${width}px without writes`, async () => {
  await page.viewport(width, 850); await seed(); const before = await db.events.toArray(), onOpenHistory = vi.fn();
  const screen = await render(<WholePicture onOpenHistory={onOpenHistory} />);
  await expect.element(screen.getByRole("heading", { name: "How have you really been?" })).toBeVisible();
  await screen.getByRole("tab", { name: "Compare", exact: true }).click();
  const average = screen.getByRole("button", { name: "6h 00m 4 recorded days · inspect →", exact: true });
  await average.click(); await expect.element(screen.getByRole("dialog")).toBeVisible();
  await expect.element(screen.getByText(/4 contributing recorded days/)).toBeVisible();
  await screen.getByRole("button", { name: /Open Mon, Oct 12 source records/ }).click();
  await expect.element(screen.getByRole("heading", { name: "Main sleep · 6h 00m", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "CLOSE", exact: true }).click();
  await expect.poll(() => document.activeElement?.textContent).toContain("6h 00m");
  expect(await db.events.toArray()).toEqual(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("tab", { name: "Your next move", exact: true }).click();
  await screen.getByRole("button", { name: "Keep Week Ahead suggestions", exact: true }).click();
  expect(await db.events.toArray()).toEqual(before);
  expect((await axe.run(document.body)).violations).toEqual([]);
});
it("saves the chosen focus through the existing weekly command and preserves its note and prior version", async () => {
  await seed(); const week = latestReviewWeek(new Date());
  await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "Keep this original reflection.", focus: null, expectedPreviousId: null });
  const recommendations = await db.recommendations.toArray(); const screen = await render(<WholePicture />);
  await expect.element(screen.getByRole("heading", { name: "How have you really been?" })).toBeVisible();
  await screen.getByRole("tab", { name: "Your next move", exact: true }).click();
  await screen.getByRole("radio", { name: /Understand my energy/ }).click();
  await screen.getByRole("textbox", { name: "What would this look like in your life?", exact: true }).fill("Leave some space after the last shift.");
  await screen.getByRole("button", { name: "Save weekly review & focus", exact: true }).click();
  await expect.element(screen.getByRole("status")).toHaveTextContent(/Weekly review and focus saved/);
  const records = await getWeeklyReviewRecords(); expect(records).toHaveLength(2);
  expect(records[0]!.note).toBe("Keep this original reflection.");
  expect(records[0]!.focus?.text).toContain("Leave some space after the last shift.");
  expect(records[0]!.supersedes).toBe(records[1]!.id); expect(await db.recommendations.toArray()).toEqual(recommendations);
});
it("keeps a dirty focus on inactive navigation and rejects a competing saved review before explicit adoption", async () => {
  await seed(); const screen = await render(<WholePicture />);
  await expect.element(screen.getByRole("heading", { name: "How have you really been?" })).toBeVisible();
  await screen.getByRole("tab", { name: "Your next move", exact: true }).click();
  await screen.getByRole("textbox", { name: "What would this look like in your life?", exact: true }).fill("My unsaved intention.");
  await screen.rerender(<WholePicture active={false} />);
  const week = latestReviewWeek(new Date()); await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "Saved elsewhere", focus: null, expectedPreviousId: null });
  await screen.rerender(<WholePicture active />);
  await expect.element(screen.getByText("Your choice / week starting Mon, Oct 19", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Save weekly review & focus", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent(/different saved weekly review exists/);
  await expect.element(screen.getByRole("textbox", { name: "What would this look like in your life?", exact: true })).toHaveValue("My unsaved intention.");
  expect(await getWeeklyReviewRecords()).toHaveLength(1);
  await screen.getByRole("button", { name: "Use latest saved review, keep my focus draft", exact: true }).click();
  await screen.getByRole("button", { name: "Save weekly review & focus", exact: true }).click();
  await expect.poll(async () => (await getWeeklyReviewRecords()).length).toBe(2);
  expect((await getWeeklyReviewRecords())[0]!.note).toBe("Saved elsewhere");
});
it("offers a visible retry and honest empty/insufficient states, never demo data", async () => {
  vi.mocked(getWholePicture).mockRejectedValueOnce(new Error("Synthetic read failure"));
  const screen = await render(<WholePicture />);
  await expect.element(screen.getByRole("alert")).toHaveTextContent("unavailable, not empty");
  await screen.getByRole("button", { name: "RETRY WHOLE PICTURE", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Your record starts with what you choose to record.", exact: true })).toBeVisible();
  await screen.getByRole("tab", { name: "Compare", exact: true }).click();
  await expect.element(screen.getByText("0 recorded days · needs 3 · inspect →").first()).toBeVisible();
  expect(await db.events.count()).toBe(0);
});

it("ROTATION-001: shows recorded runs, newest first, and opens a day's records from the rotation", async () => {
  await page.viewport(390, 850); await seed(); const before = await db.events.toArray();
  const screen = await render(<WholePicture />);
  await screen.getByRole("tab", { name: "Rotation", exact: true }).click();
  const runs = [...document.querySelectorAll(".rotation-run h3")].map((h) => h.textContent);
  expect(runs[0]).toMatch(/^Days off · .+ · 4 days$/); // Oct 16–19, newest first
  expect(runs[1]).toMatch(/^Work run · .+ · 4 shifts$/); // Oct 12–15
  await screen.getByRole("button", { name: /shift 1 of 4: main sleep 6:00, energy 2, no workout\. Open records\.$/ }).click();
  await expect.element(screen.getByRole("dialog")).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Main sleep · 6h 00m", exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

