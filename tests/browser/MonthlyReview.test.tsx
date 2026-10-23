import { openDetailedReviews } from "./helpers/review";
import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { endDay, logBodyweight, setWorkContext, startDay } from "../../src/application/commands";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import { logMeasurement } from "../../src/application/measurementCommands";
import { addProgressPhoto, hideProgressPhoto } from "../../src/application/progressPhotoCommands";
import { getMonthlyReview } from "../../src/application/monthlyReviewQueries";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { db } from "../../src/persistence/db";

vi.mock("../../src/application/monthlyReviewQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/monthlyReviewQueries")>();
  return { ...actual, getMonthlyReview: vi.fn(actual.getMonthlyReview) };
});

/** REVIEW-001 monthly review: 4 weeks after the first saved review, the review adds body composition. */
function clock(at: Date) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at); }
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

async function photoBlob(shade: string): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 60; canvas.height = 80;
  const context = canvas.getContext("2d")!; context.fillStyle = shade; context.fillRect(0, 0, 60, 80);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg"));
}
async function day(start: Date, weight?: number) {
  clock(start);
  const record = await startDay();
  if (weight !== undefined) await logBodyweight(record.id, weight);
  clock(new Date(start.getTime() + 60 * 60_000));
  await endDay(record.id);
}
async function seedMonth() {
  await day(new Date(2026, 9, 13, 18));
  clock(new Date(2026, 9, 19, 20));
  const reviewDay = await startDay();
  const week = latestReviewWeek(new Date());
  await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "First review", focus: null, expectedPreviousId: null });
  clock(new Date(2026, 9, 19, 21)); await endDay(reviewDay.id);
  await day(new Date(2026, 9, 20, 18), 199.5);
  await day(new Date(2026, 10, 14, 18), 197);
  clock(new Date(2026, 10, 16, 20));
  await logMeasurement({ site: "WAIST", inches: 35.5, measuredOn: "2026-10-21" });
  await logMeasurement({ site: "WAIST", inches: 35, measuredOn: "2026-11-15" });
  await addProgressPhoto(await photoBlob("#444"), { pose: "FRONT", takenOn: "2026-10-01" }, "IMPORT");
  const later = await addProgressPhoto(await photoBlob("#888"), { pose: "FRONT", takenOn: "2026-11-10" }, "IMPORT");
  const today = await startDay();
  await setWorkContext(today.id, "OFF", "MANUAL");
  return { later };
}

for (const width of [320, 360, 412]) it(`opens the monthly review from TODAY with body composition at ${width}px, writing nothing`, async () => {
  await page.viewport(width, 800);
  await seedMonth();
  const before = await db.events.count();
  const screen = await render(<App />);
  expect(screen.getByText("Monthly review ready", { exact: true }).elements()).toHaveLength(0);
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  const review = screen.getByRole("region", { name: "Weekly review", exact: true });
  await expect.element(review.getByText("MONTHLY REVIEW · LATEST COMPLETED WEEK", { exact: true })).toBeVisible();
  const body = screen.getByRole("region", { name: "BODY COMPOSITION · LAST 4 WEEKS" });
  await expect.element(body.getByText("Oct 19 – Nov 15. First and last recorded values. Readings only; you draw the conclusions.", { exact: true })).toBeVisible();
  await expect.element(body.getByText("-2.5 lb", { exact: true })).toBeVisible();
  await expect.element(body.getByText("-0.5 in", { exact: true })).toBeVisible();
  const pair = body.getByRole("figure", { name: "Front photos, Oct 1 and Nov 10" });
  await expect.element(pair).toBeVisible();
  await expect.poll(() => pair.element().querySelectorAll("img").length).toBe(2);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(body.element(), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations).toEqual([]);
  expect(await db.events.count()).toBe(before);
});

it("keeps ordinary weeks weekly and says when the monthly review comes", async () => {
  await day(new Date(2026, 9, 13, 18));
  clock(new Date(2026, 9, 19, 20));
  const reviewDay = await startDay();
  const week = latestReviewWeek(new Date());
  await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "First review", focus: null, expectedPreviousId: null });
  clock(new Date(2026, 9, 19, 21)); await endDay(reviewDay.id);
  await day(new Date(2026, 9, 22, 18), 199);
  clock(new Date(2026, 9, 26, 20));
  const today = await startDay(); await setWorkContext(today.id, "OFF", "MANUAL");
  const screen = await render(<App />);
  expect(screen.getByText("Weekly review ready", { exact: true }).elements()).toHaveLength(0);
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  const review = screen.getByRole("region", { name: "Weekly review", exact: true });
  await expect.element(review.getByText("WEEKLY REVIEW · LATEST COMPLETED WEEK", { exact: true })).toBeVisible();
  await expect.element(review.getByText("Monthly review in 3 weeks. It adds body composition: weight, measurements and photos.", { exact: true })).toBeVisible();
  expect(document.querySelector(".monthly-body")).toBeNull();
});

it("never shows a newly hidden photo while the re-read is pending, then shows only fresh evidence", async () => {
  const { later } = await seedMonth();
  const screen = await render(<App />);
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  await expect.element(screen.getByRole("figure", { name: "Front photos, Oct 1 and Nov 10" })).toBeVisible();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await hideProgressPhoto(later.id);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const actual = (await vi.importActual<typeof import("../../src/application/monthlyReviewQueries")>("../../src/application/monthlyReviewQueries")).getMonthlyReview;
  vi.mocked(getMonthlyReview).mockImplementationOnce(async (week) => { await held; return actual(week); });
  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Weekly review", exact: true })).toBeVisible();
  await new Promise((resolve) => setTimeout(resolve, 250));
  expect(document.querySelector(".monthly-body")).toBeNull();
  expect(document.querySelectorAll(".weekly-dashboard img").length).toBe(0);
  release();
  const body = screen.getByRole("region", { name: "BODY COMPOSITION · LAST 4 WEEKS" });
  await expect.element(body.getByText("-2.5 lb", { exact: true })).toBeVisible();
  expect(document.querySelector(".monthly-body figure")).toBeNull();
});

it("drops the cached body panel when a re-read fails, so a newly hidden photo is never shown, and recovers on the next read", async () => {
  const { later } = await seedMonth();
  const screen = await render(<App />);
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  await expect.element(screen.getByRole("figure", { name: "Front photos, Oct 1 and Nov 10" })).toBeVisible();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await hideProgressPhoto(later.id);
  vi.mocked(getMonthlyReview).mockRejectedValueOnce(new Error("read failed"));
  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  await expect.element(screen.getByText("Body composition for this month couldn’t be read. The weekly review below is unaffected.", { exact: true })).toBeVisible();
  expect(document.querySelector(".monthly-body")).toBeNull();
  expect(document.querySelectorAll(".weekly-dashboard img").length).toBe(0);
  await expect.element(screen.getByText("-2.5 lb", { exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  const body = screen.getByRole("region", { name: "BODY COMPOSITION · LAST 4 WEEKS" });
  await expect.element(body.getByText("-2.5 lb", { exact: true })).toBeVisible();
  expect(document.querySelector(".monthly-body figure")).toBeNull();
});
