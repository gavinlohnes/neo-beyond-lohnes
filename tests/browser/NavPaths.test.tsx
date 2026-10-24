import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { db } from "../../src/persistence/db";
import { previewAnyRestore } from "../../src/persistence/restore";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * NAV-001: Gavin's tree-test tasks, each walked from TODAY by visible labels only. A task that
 * fails here is a task he can't find. Later slices turn the todos into real paths.
 */
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  await page.viewport(390, 844);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

async function openLog(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "Open LOG" }).click();
  const sheet = screen.getByRole("dialog", { name: "LOG" });
  await expect.element(sheet).toBeVisible();
  return sheet;
}

describe("NAV-001 top tasks from TODAY", () => {
  it.each([[320, 640], [390, 844], [844, 390], [1280, 800]])("+ remains reachable above navigation at %sx%s, including after scroll", async (width, height) => {
    await page.viewport(width, height);
    await startDay();
    const screen = await render(<App />);
    const plus = screen.getByRole("button", { name: "Open LOG" });
    await expect.element(plus).toBeVisible();
    const box = plus.element().getBoundingClientRect();
    const nav = document.querySelector(".shell-nav")!.getBoundingClientRect();
    expect(getComputedStyle(plus.element()).position).toBe("fixed");
    expect(box.bottom).toBeLessThanOrEqual(nav.top);
    if (width <= 560) expect(window.innerWidth - box.right).toBeLessThanOrEqual(32);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    const hit = () => { const rect = plus.element().getBoundingClientRect(); return plus.element().contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); };
    expect(hit()).toBe(true);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    await expect.poll(() => plus.element().getBoundingClientRect().bottom).toBe(box.bottom);
    expect(hit()).toBe(true);
    await plus.click();
    await expect.element(screen.getByRole("dialog", { name: "LOG", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.poll(() => document.activeElement === plus.element()).toBe(true);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  it("keeps the floating LOG on TODAY only and behind the native modal", async () => {
    await startDay(); const screen = await render(<App />);
    const sheet = await openLog(screen);
    const plus = document.querySelector<HTMLButtonElement>(".cc-fab")!;
    const rect = plus.getBoundingClientRect();
    expect(plus.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))).toBe(false);
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    expect(screen.getByRole("button", { name: "Open LOG" }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open LOG" })).toBeVisible();
  });

  it("log a meal: + → MEAL opens with NEW MEAL first, before the list", async () => {
    await startDay();
    const screen = await render(<App />);
    const sheet = await openLog(screen);
    await sheet.getByRole("button", { name: "MEAL", exact: true }).click();
    const meal = screen.getByRole("dialog", { name: "MEAL" });
    await expect.element(meal.getByRole("button", { name: "NEW MEAL", exact: true })).toBeVisible();
    const buttons = [...meal.element().querySelectorAll("button, input")].map((el) => el.textContent || el.getAttribute("aria-label"));
    expect(buttons.indexOf("NEW MEAL")).toBeLessThan(buttons.indexOf("Search your meals"));
    await meal.getByRole("button", { name: "NEW MEAL", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toBeVisible();
  });

  it("log weight: + → BODYWEIGHT", async () => {
    await startDay();
    const screen = await render(<App />);
    const sheet = await openLog(screen);
    await sheet.getByRole("button", { name: "BODYWEIGHT", exact: true }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Weight (lbs)", exact: true })).toBeVisible();
  });

  it("why: the suggestion shows 'See the reasoning', which opens the plain answer", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 });
    const screen = await render(<App />);
    const why = screen.getByText("See the reasoning", { exact: true });
    await expect.element(why).toBeVisible();
    await why.click();
    await expect.poll(() => document.querySelector("[data-why-plain]")?.getClientRects().length ?? 0).toBeGreaterThan(0);
  });

  it("start a workout: TRAIN is a primary tab", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.poll(() => document.querySelector('.shell-nav [aria-current="page"]')?.textContent ?? "").toContain("TRAIN");
  });

  it("back up: MORE → Back up my data exports a valid backup in two taps without changing records", async () => {
    await startDay(); const screen = await render(<App />);
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    const backup = screen.getByRole("button", { name: "Back up my data", exact: true });
    await expect.element(backup).toBeVisible();
    expect(backup.element().getBoundingClientRect().top).toBeLessThan(document.querySelector(".command-search")!.getBoundingClientRect().top);
    expect(document.querySelector<HTMLDetailsElement>("#command-backup-panel")!.open).toBe(false);
    const before = await db.events.toArray(); let file: File | undefined;
    const create = URL.createObjectURL.bind(URL);
    const capture = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { file = blob as File; return create(blob); });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      await backup.click();
      await expect.element(screen.getByRole("status")).toHaveTextContent("Backup file downloaded.");
      expect(file?.type).toBe("application/json"); expect(click).toHaveBeenCalledTimes(1);
      expect((await previewAnyRestore(file!)).format).toBe("NATIVE");
      expect(await db.events.toArray()).toEqual(before);
    } finally { capture.mockRestore(); click.mockRestore(); }
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "DATA", exact: true })).toBeVisible();
  });
  it("review sleep: TODAY’s sleep tile or DATA → Sleep opens on this week", async () => {
    await startDay(); const screen = await render(<App />);
    await screen.getByRole("button", { name: "Main sleep not logged, explore records", exact: true }).click();
    let sheet = screen.getByRole("dialog", { name: "SLEEP", exact: true });
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await screen.getByRole("button", { name: "main sleep history", exact: true }).click();
    sheet = screen.getByRole("dialog", { name: "SLEEP", exact: true });
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
  it("last run of shifts: DATA → Your rotation opens the existing rotation view", async () => {
    await startDay(); const screen = await render(<App />);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "WHOLE PICTURE", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "YOUR ROTATION", exact: true }).click();
    await expect.element(screen.getByRole("tab", { name: "Rotation", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect.element(screen.getByText("The way you actually live.", { exact: true })).toBeVisible();
    await screen.getByRole("tab", { name: "The picture", exact: true }).click();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await expect.element(screen.getByRole("tab", { name: "The picture", exact: true })).toHaveAttribute("aria-selected", "true");
  });
  it("whole picture: DATA opens the existing overview without an intermediate menu", async () => {
    await startDay(); const screen = await render(<App />);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await screen.getByRole("button", { name: "WHOLE PICTURE", exact: true }).click();
    await expect.element(screen.getByRole("tab", { name: "The picture", exact: true })).toHaveAttribute("aria-selected", "true");
  });
  it("sync Garmin: TODAY's measured numbers expose the existing helper link", async () => {
    await startDay();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36");
    const start = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
    await db.externalActivityHours.put({ id: start.toISOString(), startTime: start.toISOString(), endTime: new Date(start.getTime() + 3_600_000).toISOString(), zoneOffsetSeconds: null, steps: 1200, heartRateMinBpm: 60, heartRateAvgBpm: 70, heartRateMaxBpm: 80, totalCaloriesKcal: 180, activeCaloriesKcal: 100, exportedAt: new Date().toISOString(), receiptId: "nav-garmin" });
    const screen = await render(<App />);
    const numbers = screen.getByRole("group", { name: /protein.*water/i });
    await expect.element(numbers).toBeVisible();
    const sync = screen.getByRole("link", { name: "SYNC GARMIN", exact: true });
    await expect.element(sync).toBeVisible();
    expect(sync.element().closest(".cc-numbers-head")).not.toBeNull();
  });
});
