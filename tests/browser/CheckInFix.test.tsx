import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import "../../src/ui/styles/global.css";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { correctCheckIn } from "../../src/application/checkInCorrectionCommands";
import { getLatestCheckIn } from "../../src/application/queries";
import { db } from "../../src/persistence/db";
import { FIX_UNDO_MS } from "../../src/ui/hooks/useUndoWindow";
import { DailyControls as TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { HistoryScreen } from "../../src/ui/screens/history/HistoryScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * GRAYSON-CHECKIN-EDIT-001 (Gavin, 2026-11-24): FIX corrects a sent check-in from TODAY or History; UPDATE still records
 * a new one. Invented data. Mon Nov 23 2026, day opened 17:00, checked in 18:05.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const LOW: CheckInValues = { energy: 1, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 };
const GOOD: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
async function aa(label: string) {
  await settle();
  const r = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function seed(values: CheckInValues = LOW) {
  vi.setSystemTime(new Date(2026, 10, 23, 17, 0));
  const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 23, 18, 5));
  const { checkIn } = await submitCheckIn(day.id, values);
  vi.setSystemTime(new Date(2026, 10, 23, 18, 30));
  return { day, checkIn };
}
const fixDialog = () => page.getByRole("dialog", { name: "Fix this check-in", exact: true });
const pressed = (group: string) => fixDialog().getByRole("group", { name: group, exact: true }).element().querySelector('[aria-pressed="true"]')?.textContent;

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

describe("GRAYSON-CHECKIN-EDIT-001 on TODAY", () => {
  it("UPDATE still records a new check-in, with SAME AS LAST and ALL GOOD offered as before", async () => {
    await page.viewport(360, 800);
    const { day } = await seed();
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "Update check-in" }).click();
    const sheet = screen.getByRole("dialog", { name: "CHECK IN", exact: true });
    await expect.element(sheet.getByRole("button", { name: "SUBMIT CHECK-IN" })).toBeVisible();
    await expect.element(sheet.getByText("ALL GOOD", { exact: true }).first()).toBeInTheDocument();
    await sheet.getByRole("group", { name: "Energy", exact: true }).getByRole("button", { name: "3", exact: true }).click();
    await sheet.getByRole("group", { name: "Stress", exact: true }).getByRole("button", { name: "2", exact: true }).click();
    await sheet.getByRole("group", { name: "Mood", exact: true }).getByRole("button", { name: "3", exact: true }).click();
    await sheet.getByRole("group", { name: "Soreness", exact: true }).getByRole("button", { name: "1", exact: true }).click();
    await sheet.getByRole("group", { name: "Alcohol urge", exact: true }).getByRole("button", { name: "0", exact: true }).click();
    await sheet.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    expect(await db.events.where("type").equals("STATE_CHECKED_IN").count()).toBe(2);
    expect(await db.events.where("type").equals("CHECK_IN_CORRECTED").count()).toBe(0);
    expect((await getLatestCheckIn(day.id))?.energy).toBe(3);
  }, 60_000);

  it("FIX on the Checked in line opens fix mode with the answers filled in; SAVE FIX re-works advice; UNDO puts it back", async () => {
    await page.viewport(360, 800);
    const { day } = await seed();
    const screen = await render(<TodayScreen />);
    const fix = screen.getByRole("button", { name: "Fix the check-in from 18:05" });
    await expect.element(fix).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-today-card-360.png`, element: fix.element().closest(".equipment-row") as HTMLElement }); }
    await fix.click();
    await expect.element(fixDialog()).toBeVisible();
    // The sheet fills in once the check-in's chain is read.
    await expect.poll(() => pressed("Energy")).toBe("1");
    expect(pressed("Mood")).toBe("3");
    expect(fixDialog().getByRole("button", { name: "SAME AS LAST" }).elements()).toHaveLength(0);
    expect(fixDialog().getByRole("button", { name: "ALL GOOD" }).elements()).toHaveLength(0);
    expect(fixDialog().getByText("Previous check-in · reference").elements()).toHaveLength(0);
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-fix-mode-360.png` }); }
    await aa("fix mode");
    await fixDialog().getByRole("group", { name: "Energy", exact: true }).getByRole("button", { name: "4", exact: true }).click();
    await fixDialog().getByRole("button", { name: "SAVE FIX" }).click();
    await expect.element(screen.getByText(/^Check-in fixed\./)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "UNDO" })).toBeVisible();
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.energy).toBe(4);
    await expect.element(screen.getByText(/Checked in 18:05.* · edited/)).toBeVisible();
    expect(await db.checkIns.count()).toBe(2);
    expect(await db.events.where("type").equals("STATE_CHECKED_IN").count()).toBe(1);
    expect(await db.events.where("type").equals("RECOMMENDATION_ISSUED").count()).toBe(2);
    if (SHOTS) {
      await settle();
      await page.screenshot({ path: `${SHOTS}/after-new-recommendation-360.png` });
      screen.getByRole("button", { name: "UNDO" }).element().scrollIntoView({ block: "center" });
      await settle();
      await page.screenshot({ path: `${SHOTS}/after-undo-toast-360.png` });
    }
    await aa("after a fix");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.energy).toBe(1);
    await expect.element(screen.getByText("Fix undone.")).toBeVisible();
    expect(await db.events.where("type").equals("CHECK_IN_CORRECTION_UNDONE").count()).toBe(1);
  }, 60_000);

  it("works from the keyboard alone", async () => {
    await page.viewport(360, 800);
    const { day } = await seed();
    const screen = await render(<TodayScreen />);
    const fix = screen.getByRole("button", { name: "Fix the check-in from 18:05" });
    await expect.element(fix).toBeVisible();
    (fix.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(fixDialog()).toBeVisible();
    await expect.poll(() => pressed("Energy")).toBe("1");
    (fixDialog().getByRole("group", { name: "Energy", exact: true }).getByRole("button", { name: "5", exact: true }).element() as HTMLElement).focus();
    await userEvent.keyboard(" ");
    (fixDialog().getByRole("button", { name: "SAVE FIX" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.energy).toBe(5);
  }, 60_000);

  it("FIX is a 44 px target with 16 px text and no overflow at 320, 360 and 412 px; axe clean", async () => {
    await seed();
    await page.viewport(320, 800);
    const screen = await render(<TodayScreen />);
    const fix = screen.getByRole("button", { name: "Fix the check-in from 18:05" });
    await expect.element(fix).toBeVisible();
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800); await settle();
      const button = fix.element() as HTMLElement;
      const row = button.closest(".equipment-row") as HTMLElement;
      if (SHOTS && width !== 360) await page.screenshot({ path: `${SHOTS}/after-today-card-${width}.png`, element: row });
      expect(button.getBoundingClientRect().height, `${width} height`).toBeGreaterThanOrEqual(44);
      expect(button.getBoundingClientRect().width, `${width} width`).toBeGreaterThanOrEqual(44);
      expect(parseFloat(getComputedStyle(button).fontSize), `${width} font`).toBeGreaterThanOrEqual(16);
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
      expect(row.scrollWidth, `${width} row`).toBeLessThanOrEqual(row.clientWidth + 1);
      await aa(`today ${width}`);
    }
  }, 60_000);

  it("the Undo window is the shared 8 seconds", () => {
    expect(FIX_UNDO_MS).toBe(8000);
  });
});

describe("GRAYSON-CHECKIN-EDIT-001 in History", () => {
  it("the original row opens the current version; the fix row shows before and after; Put it back works", async () => {
    await page.viewport(360, 800);
    const { day, checkIn } = await seed();
    vi.setSystemTime(new Date(2026, 10, 23, 18, 40));
    await correctCheckIn(checkIn.id, GOOD);
    vi.setSystemTime(new Date(2026, 10, 23, 19, 0));
    const screen = await render(<HistoryScreen />);
    await screen.getByRole("button", { name: "SHOW" }).first().click();
    await expect.element(screen.getByText("Check-in fixed: energy 1 → 4, stress 3 → 2, mood 3 → 4.")).toBeVisible();
    await expect.element(screen.getByText(/Check-in: energy 1, .* · edited/)).toBeVisible();
    for (const width of [320, 412, 360]) {
      await page.viewport(width, 800); await settle();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-history-${width}.png` });
      for (const button of document.querySelectorAll<HTMLElement>(".history-fix")) {
        expect(button.getBoundingClientRect().height, `${width} height`).toBeGreaterThanOrEqual(44);
        expect(parseFloat(getComputedStyle(button).fontSize), `${width} font`).toBeGreaterThanOrEqual(16);
      }
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
      await aa(`history ${width}`);
    }
    await screen.getByRole("button", { name: "Fix the check-in from 18:05", exact: true }).click();
    await expect.element(fixDialog()).toBeVisible();
    await expect.poll(() => pressed("Energy")).toBe("4");
    await fixDialog().getByText("Edited · before and after").click();
    await expect.element(fixDialog().getByText(/Fixed 18:40: Energy 1 → 4 · Stress 3 → 2 · Mood 3 → 4\./)).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-edited-detail-360.png` }); }
    await fixDialog().getByRole("button", { name: "PUT IT BACK" }).click();
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.energy).toBe(1);
    await expect.element(screen.getByText("Fix put back.")).toBeVisible();
    await expect.element(screen.getByText("Check-in fix undone: the answers before it count again.")).toBeVisible();
  }, 60_000);

  it("fixes a past day's check-in from History, opening fix mode on the fixed row too", async () => {
    await page.viewport(360, 800);
    const { day, checkIn } = await seed();
    const first = await correctCheckIn(checkIn.id, GOOD);
    if (first.status !== "CORRECTED") throw new Error("expected a fix");
    const screen = await render(<HistoryScreen />);
    await screen.getByRole("button", { name: "SHOW" }).first().click();
    // The fix row has its own FIX: it opens the same chain's current answers.
    await expect.element(screen.getByRole("button", { name: "Fix the check-in from 18:05", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Fix the check-in from 18:05 again", exact: true }).click();
    await expect.poll(() => pressed("Energy")).toBe("4");
    await fixDialog().getByRole("group", { name: "Stress", exact: true }).getByRole("button", { name: "1", exact: true }).click();
    await fixDialog().getByRole("button", { name: "SAVE FIX" }).click();
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.stress).toBe(1);
    await expect.element(screen.getByText("Check-in fixed.", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getLatestCheckIn(day.id))?.stress).toBe(2);
  }, 60_000);
});
