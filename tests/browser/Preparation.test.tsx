/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { WorkPreparation } from "../../src/ui/components/WorkPreparation";
import { db } from "../../src/persistence/db";
import { getPreparation, recordPreparation } from "../../src/application/preparation";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { setModePin } from "../../src/application/modePinQueries";
import { startDay, setWorkContext, updateSchedulePattern } from "../../src/application/commands";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 26, 17)); await page.viewport(390, 844);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN; await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("PREP-001 work preparation", () => {
  it("before work confirms food/bottle in one tap each, never logs consumption or changes guidance", async () => {
    const day = await startDay(); const screen = await render(<App />);
    const food = screen.getByRole("button", { name: "FOOD READY", exact: true }); await expect.element(food).toBeEnabled();
    const before = await db.events.toArray(); const guidance = document.querySelector('.console-guidance')?.textContent;
    await food.click(); await screen.getByRole("button", { name: "BOTTLE FILLED", exact: true }).click();
    await expect.element(screen.getByRole("status").filter({ hasText: "Preparation: no action required." })).toBeVisible();
    const ids = new Set(before.map((e) => e.id)); const added = (await db.events.toArray()).filter((e) => !ids.has(e.id));
    expect(added.map((e) => e.type)).toEqual(["PREPARATION_RECORDED", "PREPARATION_RECORDED"]);
    expect((await getPreparation(day.id)).BOTTLE.value).toBe("READY");
    expect(document.querySelector('.console-guidance')?.textContent).toBe(guidance);
    expect(await db.obligations.count()).toBe(0);
  });

  it("frozen backup is a covered arrangement, undo appends history, change remains available", async () => {
    const day = await startDay(); const screen = await render(<WorkPreparation dayId={day.id} beforeWork active />);
    await expect.element(screen.getByRole("button", { name: "FOOD READY", exact: true })).toBeEnabled();
    await screen.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
    const sheet = screen.getByRole("dialog", { name: "PREPARATION", exact: true });
    await sheet.getByRole("button", { name: "Frozen backup packed", exact: true }).click();
    await expect.element(sheet.getByRole("button", { name: "Frozen backup packed", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(sheet.getByRole("button", { name: "NOT CONFIRMED", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
    expect(await db.events.where("type").equals("PREPARATION_RECORDED").count()).toBe(2);
    await sheet.getByRole("button", { name: "Frozen backup packed", exact: true }).click();
    await sheet.getByRole("region", { name: "Bottle preparation" }).getByRole("button", { name: "Not needed tonight", exact: true }).click();
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.element(screen.getByText("Preparation: no action required.", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "CHANGE PREPARATION", exact: true })).toBeVisible();
  });

  it("same-tick taps save once and write failure retains an unconfirmed state with retry", async () => {
    const day = await startDay(); const screen = await render(<WorkPreparation dayId={day.id} beforeWork active />);
    const food = screen.getByRole("button", { name: "FOOD READY", exact: true }); await expect.element(food).toBeEnabled();
    const fail = vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("QuotaExceededError"));
    await food.click(); await expect.element(screen.getByRole("alert")).toBeVisible();
    expect((await getPreparation(day.id)).FOOD.value).toBe("UNCONFIRMED"); fail.mockRestore();
    (food.element() as HTMLButtonElement).click(); (food.element() as HTMLButtonElement).click();
    await expect.poll(async () => (await getPreparation(day.id)).FOOD.value).toBe("READY");
    expect(await db.events.where("type").equals("PREPARATION_RECORDED").count()).toBe(1);
  });

  it("a failed read is unavailable rather than fabricated empty data, with a real retry", async () => {
    const day = await startDay(); vi.spyOn(db.events, "where").mockImplementationOnce(() => { throw new Error("read failed"); });
    const screen = await render(<WorkPreparation dayId={day.id} beforeWork active />);
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Preparation could not be read");
    await expect.element(screen.getByRole("button", { name: "FOOD READY", exact: true })).toBeDisabled();
    await screen.getByRole("button", { name: "RELOAD PREPARATION", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "FOOD READY", exact: true })).toBeEnabled();
  });

  it("is manually available on days off and a mode pin cannot fabricate pre-work context", async () => {
    const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); setModePin(day.id, "PRE_WORK");
    const screen = await render(<App />);
    expect(screen.getByText("READY FOR TONIGHT", { exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "PREPARE FOR WORK", exact: true }).click();
    await expect.element(screen.getByRole("dialog", { name: "PREPARATION", exact: true })).toBeVisible();
  });

  it("reopens after midnight with the same facts and restores focus on CLOSE", async () => {
    const day = await startDay(); await recordPreparation({ dayId: day.id, item: "FOOD", value: "FROZEN", expectedPreviousId: null });
    const first = await render(<WorkPreparation dayId={day.id} beforeWork active />); await first.unmount();
    vi.setSystemTime(new Date(2026, 9, 27, 3));
    const screen = await render(<WorkPreparation dayId={day.id} beforeWork={false} active />);
    const trigger = screen.getByRole("button", { name: "PREPARE FOR WORK", exact: true }); await trigger.click();
    const sheet = screen.getByRole("dialog", { name: "PREPARATION", exact: true });
    await expect.element(sheet.getByRole("button", { name: "Frozen backup packed", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.poll(() => document.activeElement === trigger.element()).toBe(true);
  });

  it.each([[320, 640], [390, 844], [844, 390], [1280, 800]])("fits and passes axe at %sx%s", async (width, height) => {
    await page.viewport(width, height); const day = await startDay(); const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "FOOD READY", exact: true })).toBeEnabled();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
    const sheet = screen.getByRole("dialog", { name: "PREPARATION", exact: true });
    for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
    expect(sheet.element().scrollWidth).toBeLessThanOrEqual(sheet.element().clientWidth);
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    expect(await db.events.where("type").equals("PREPARATION_RECORDED").count()).toBe(0);
    expect(day.id).toBeTruthy();
  });
});
