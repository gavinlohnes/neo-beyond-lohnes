/// <reference types="@vitest/browser-playwright" />
import { openDetailedReviews } from "./helpers/review";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { logBodyweight, logProtein, logSleep, logWater, setWorkContext, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { ReviewScreen } from "../../src/ui/screens/review/ReviewScreen";

/**
 * REVIEW-001 Weekly Review dashboard (owner-approved 2026-10-18): the
 * prototype's weekly review over one real, command-built week — Mon Oct 12 to
 * Sun Oct 18 2026, three work days then four days off — viewed on Mon Oct 19
 * after 16:30, when that week has closed.
 */

const at = (day: number, hour: number) => new Date(2026, 9, day, hour);
function clock(date: Date) {
  vi.setSystemTime(date);
}

const WEEK = [
  { date: 12, context: "WORK", sleep: 6 * 60, protein: 120, water: 64, weight: 201.0, lift: 100 },
  { date: 13, context: "WORK", sleep: 5.5 * 60, protein: 140, water: 48 },
  { date: 14, context: "WORK", sleep: 6.5 * 60, protein: 130, water: 72, weight: 200.4 },
  { date: 15, context: "OFF", sleep: 8 * 60, protein: 160, water: 80, lift: 110 },
  { date: 16, context: "OFF", sleep: 7.5 * 60, protein: 150, water: 96, weight: 199.8 },
  { date: 17, context: "OFF", sleep: 8.5 * 60, protein: 100 },
  { date: 18, context: "OFF", sleep: 7 * 60, protein: 170, water: 88, weight: 199.6 },
] as const;

async function seedWeek() {
  // One earlier day (Thu Oct 8), so the week before has a record to navigate to.
  clock(at(8, 18));
  const earlier = await startDay();
  await logProtein(earlier.id, 90);
  for (const d of WEEK) {
    clock(at(d.date, 18));
    const day = await startDay();
    await setWorkContext(day.id, d.context, "MANUAL");
    await logSleep(day.id, d.sleep);
    await logProtein(day.id, d.protein);
    if ("water" in d) await logWater(day.id, d.water);
    if ("weight" in d) await logBodyweight(day.id, d.weight);
    if ("lift" in d) {
      const session = await startWorkout(day.id, "A", "STANDARD");
      await logSet(day.id, session.id, "machine-chest-press", 1, d.lift, 10);
      await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    }
  }
  // Monday Oct 19 after 16:30: starting the new day closes Sunday, and the week Oct 12–18 is complete.
  clock(at(19, 20));
  await startDay();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await page.viewport(360, 900);
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  window.scrollTo(0, 0);
});

async function renderReview(onOpenHistory = vi.fn()) {
  const screen = await render(<ReviewScreen onOpenHistory={onOpenHistory} />);
  await openDetailedReviews(screen);
  const dashboard = screen.getByRole("region", { name: "Weekly review", exact: true });
  await expect.element(dashboard.getByRole("heading", { name: "Oct 12 — Oct 18" })).toBeVisible();
  return { screen, dashboard, onOpenHistory };
}

const readout = (label: string, scope = ".weekly-dashboard") =>
  [...document.querySelectorAll(`${scope} .readout`)].find((r) => r.querySelector(".tool-label")?.textContent === label);
const patterns = ".weekly-dashboard__panel:has(.weekly-barline)";

describe("Weekly Review dashboard", () => {
  it("shows the closed week's headline numbers from the recorded days", async () => {
    await seedWeek();
    await renderReview();
    expect(readout("SLEEP / AVERAGE")?.textContent).toContain("7.0 h");
    expect(readout("SLEEP / AVERAGE")?.textContent).toContain("6.0 h work · 7.8 h off · 7 days");
    expect(readout("PROTEIN / AVERAGE")?.textContent).toContain("139 g");
    expect(readout("TRAINING")?.textContent).toContain("2 sessions");
    expect(readout("WEIGHT CHANGE")?.textContent).toContain("-1.4 lb");
    expect(readout("WEIGHT CHANGE")?.textContent).toContain("Oct 12 to Oct 18, first to last recorded");
  });

  it("selects a lived day from the strip, shows its detail, and opens it in History", async () => {
    await seedWeek();
    const { dashboard, onOpenHistory } = await renderReview();
    const strip = dashboard.getByRole("group", { name: "Days of this week" }).getByRole("button");
    expect(strip.elements()).toHaveLength(7);
    // Opens on the last recorded day (Sunday).
    await expect.element(dashboard.getByRole("button", { name: /^SUN Oct 18:/ })).toHaveAttribute("aria-pressed", "true");

    await dashboard.getByRole("button", { name: "THU Oct 15: sleep 8.0 h, protein 160 g, 1 session, day off" }).click();
    await expect.element(dashboard.getByText("DAY DETAIL · THU Oct 15")).toBeVisible();
    const detail = document.querySelector(".weekly-dashboard__detail")!.textContent!;
    expect(detail).toContain("8.0 h");
    expect(detail).toContain("160 g");
    expect(detail).toContain("80 oz");
    expect(detail).toContain("Not recorded"); // no weigh-in Thursday: missing, not zero
    await dashboard.getByRole("button", { name: "INSPECT DAY EVENTS →" }).click();
    const thursday = (await db.beyondDays.toArray()).find((d) => new Date(d.startedAt).getDate() === 15)!;
    expect(onOpenHistory).toHaveBeenCalledWith(thursday.id);
  });

  it("compares work and off days, and abstains below the floor", async () => {
    await seedWeek();
    const { dashboard } = await renderReview();
    await dashboard.getByRole("button", { name: "WORK", exact: true }).click();
    expect(readout("DAYS", patterns)?.textContent).toContain("3");
    expect(readout("SLEEP", patterns)?.textContent).toContain("6.0 h");
    await dashboard.getByRole("button", { name: "OFF", exact: true }).click();
    expect(readout("DAYS", patterns)?.textContent).toContain("4");
    expect(readout("PROTEIN", patterns)?.textContent).toContain("145 g");
    await expect.element(dashboard.getByText("Evidence, not diagnosis", { exact: false })).toBeVisible();
  });

  it("explores a metric across the week without treating missing days as zero", async () => {
    await seedWeek();
    const { dashboard } = await renderReview();
    await dashboard.getByRole("button", { name: "WEIGHT", exact: true }).click();
    await expect.element(dashboard.getByText(/Recorded on 4 days of 7 · 199\.6 to 201\.0 lb\./)).toBeVisible();
    expect(document.querySelectorAll(".weekly-explorer circle")).toHaveLength(4);
  });

  it("lists accomplishments as counts: sessions, the week's record, the weight observation", async () => {
    await seedWeek();
    const { dashboard } = await renderReview();
    await expect.element(dashboard.getByText("2 strength sessions on 2 days.")).toBeVisible();
    await expect.element(dashboard.getByText(/Machine Chest Press: heaviest yet \(110 lb\)/)).toBeVisible();
    await expect.element(dashboard.getByText("1.4 lb lower between the first and last recorded weigh-in.")).toBeVisible();
  });

  it("COMPLETE REVIEW opens Carry forward; earlier weeks are read only", async () => {
    await seedWeek();
    const { dashboard } = await renderReview();
    await dashboard.getByRole("button", { name: "COMPLETE REVIEW →" }).click();
    const carry = dashboard.getByRole("region", { name: "Carry forward", exact: true });
    await expect.element(carry.getByRole("textbox", { name: "What stood out? (optional)" })).toBeVisible();

    await dashboard.getByRole("button", { name: "← PREVIOUS WEEK" }).click();
    await expect.element(dashboard.getByRole("heading", { name: "Oct 5 — Oct 11" })).toBeVisible();
    await expect.element(dashboard.getByText("No review was saved for this week.", { exact: true })).toBeVisible();
    expect(readout("PROTEIN / AVERAGE")?.textContent).toContain("90 g");
    expect(dashboard.getByRole("button", { name: "COMPLETE REVIEW →" }).elements()).toHaveLength(0);
    await expect.element(dashboard.getByRole("button", { name: "← PREVIOUS WEEK" })).toBeDisabled();
    await dashboard.getByRole("button", { name: "NEXT WEEK →" }).click();
    await expect.element(dashboard.getByRole("heading", { name: "Oct 12 — Oct 18" })).toBeVisible();
    await expect.element(dashboard.getByRole("button", { name: "NEXT WEEK →" })).toBeDisabled();
  });

  it("writes nothing while browsing, fits 320/360/412 px, passes axe and honors reduced motion", async () => {
    await seedWeek();
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const before = [await db.events.count(), await db.beyondDays.count(), await db.workoutSessions.count()];
    const { dashboard } = await renderReview();
    await dashboard.getByRole("button", { name: "OFF", exact: true }).click();
    await dashboard.getByRole("button", { name: "WATER", exact: true }).click();
    await dashboard.getByRole("button", { name: "← PREVIOUS WEEK" }).click();
    await dashboard.getByRole("button", { name: "NEXT WEEK →" }).click();
    await expect.element(dashboard.getByRole("heading", { name: "Oct 12 — Oct 18" })).toBeVisible();
    expect([await db.events.count(), await db.beyondDays.count(), await db.workoutSessions.count()]).toEqual(before);
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 900);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    expect((await axe.run(document.querySelector(".weekly-dashboard")!)).violations).toEqual([]);
  });
});
