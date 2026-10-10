/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { exportDB } from "dexie-export-import";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { getDayCount } from "../../src/application/queries";
import { getHistoryDays } from "../../src/application/historyQueries";
import { getRecommendationLedger } from "../../src/application/reviewQueries";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { startWorkout, logSet } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { exportBackup } from "../../src/persistence/backup";
import { applyAnyRestore } from "../../src/persistence/restore";

vi.mock("../../src/application/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/queries")>();
  return { ...actual, getDayCount: vi.fn(actual.getDayCount) };
});
vi.mock("../../src/application/historyQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/historyQueries")>();
  return { ...actual, getHistoryDays: vi.fn(actual.getHistoryDays) };
});
vi.mock("../../src/application/reviewQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/reviewQueries")>();
  return { ...actual, getRecommendationLedger: vi.fn(actual.getRecommendationLedger) };
});
vi.mock("../../src/application/weeklyQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/weeklyQueries")>();
  return { ...actual, getWeeklySummary: vi.fn(actual.getWeeklySummary) };
});
vi.mock("../../src/persistence/backup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/persistence/backup")>();
  return { ...actual, exportBackup: vi.fn(actual.exportBackup) };
});
vi.mock("../../src/persistence/restore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/persistence/restore")>();
  return { ...actual, applyAnyRestore: vi.fn(actual.applyAnyRestore) };
});
beforeEach(() => {
  vi.mocked(getDayCount).mockReset();
  vi.mocked(getHistoryDays).mockReset();
  vi.mocked(getRecommendationLedger).mockReset();
  vi.mocked(getWeeklySummary).mockReset();
  vi.mocked(exportBackup).mockReset();
  vi.mocked(applyAnyRestore).mockReset();
});
afterEach(async () => {
  await cleanup();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  await page.viewport(1280, 800);
});

const destinations = [
  ["WEEKLY CHECK-IN", "MORE // WEEKLY CHECK-IN"],
  ["HISTORY", "MORE // HISTORY"],
  ["REVIEW", "MORE // REVIEW"],
  ["SEARCH", "MORE // SEARCH"],
  ["DECISION JOURNAL", "MORE // DECISION JOURNAL"],
  ["MISSIONS & OBLIGATIONS", "MORE // MISSIONS & OBLIGATIONS"],
  ["WORK SCHEDULE", "MORE // WORK SCHEDULE"],
  ["EXERCISE LIBRARY", "MORE // EXERCISE LIBRARY"],
  ["CUSTOM PROGRAMS", "MORE // CUSTOM PROGRAMS"],
] as const;

describe("MORE-OPERATOR-001", () => {
  it("Weekly hides a previous successful summary throughout failed refresh, pending retry and recovery", async () => {
    const now = new Date(2026, 9, 10, 12);
    const initial = await getWeeklySummary(now);
    const first = { ...initial, weight: { ...initial.weight, avgLbs: 183.5, weighIns: 1 } };
    const recovered = { ...initial, weight: { ...initial.weight, avgLbs: 184.5, weighIns: 1 } };
    let failRefresh!: (error: Error) => void;
    let finishRetry!: (summary: Awaited<ReturnType<typeof getWeeklySummary>>) => void;
    vi.mocked(getWeeklySummary)
      .mockResolvedValueOnce(first)
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { failRefresh = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishRetry = resolve; }));
    const before = await db.events.toArray();
    const screen = await render(<WeeklyCheckInScreen now={now} />);
    await expect.element(screen.getByText("Avg 183.5 lb", { exact: true })).toBeVisible();

    await screen.rerender(<WeeklyCheckInScreen now={new Date(2026, 9, 11, 12)} />);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByText("Avg 183.5 lb", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("FINDINGS", { exact: true }).elements()).toHaveLength(0);
    failRefresh(new Error("Refresh interrupted"));
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Refresh interrupted");
    await expect.element(screen.getByRole("button", { name: "RETRY WEEKLY" })).toBeVisible();
    expect(screen.getByRole("status").elements()).toHaveLength(0);
    expect(screen.getByText("Avg 183.5 lb", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("FINDINGS", { exact: true }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "RETRY WEEKLY" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("alert").elements()).toHaveLength(0);
    expect(screen.getByText("Avg 183.5 lb", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("FINDINGS", { exact: true }).elements()).toHaveLength(0);
    finishRetry(recovered);
    await expect.element(screen.getByText("Avg 184.5 lb", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("FINDINGS", { exact: true })).toBeVisible();
    expect(screen.getByText("Avg 183.5 lb", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByRole("status").elements()).toHaveLength(0);
    expect(screen.getByRole("alert").elements()).toHaveLength(0);
    expect(await db.events.toArray()).toEqual(before);
  });
  it.each(["HISTORY", "REVIEW", "WEEKLY"] as const)("%s read failure stays distinct from empty, supports retry and leaves records unchanged", async (view) => {
    await startDay();
    const before = await db.events.toArray();
    const query = view === "HISTORY" ? vi.mocked(getHistoryDays) : view === "REVIEW" ? vi.mocked(getRecommendationLedger) : vi.mocked(getWeeklySummary);
    query.mockRejectedValueOnce(new Error("Evidence read interrupted"));
    const screen = await render(<MoreScreen initialView={view} />);
    await expect.element(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.getByText(/No days yet|No recommendations yet/).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: `RETRY ${view}` }).click();
    await expect.poll(() => screen.getByRole("alert").elements().length).toBe(0);
    if (view === "HISTORY") await expect.element(screen.getByRole("button", { name: "SHOW", exact: true })).toBeVisible();
    if (view === "REVIEW") await expect.element(screen.getByText(/No recommendations yet/)).toBeVisible();
    if (view === "WEEKLY") await expect.element(screen.getByText("FINDINGS", { exact: true })).toBeVisible();
    expect(await db.events.toArray()).toEqual(before);
  });
  it.each(destinations)("%s remains reachable with explicit keyboard return and no domain writes", async (name, heading) => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 8);
    const before = await db.events.toArray();
    const screen = await render(<MoreScreen />);
    const trigger = screen.getByRole("button", { name: `Open ${name}` });
    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    const back = screen.getByRole("button", { name: "← BACK TO MORE" });
    expect(document.activeElement).toBe(back.element());
    expect(screen.getByRole("button", { name: "Open HISTORY" }).elements()).toHaveLength(0);
    await userEvent.keyboard("{Enter}");
    await expect.element(trigger).toBeVisible();
    expect(document.activeElement).toBe(trigger.element());
    expect(await db.events.toArray()).toEqual(before);
    expect((await db.workoutSessions.get(session.id))?.status).toBe("ACTIVE");
    expect(await db.performedSets.where("sessionId").equals(session.id).count()).toBe(1);
  });

  it("retains unsaved settings/capsule text, disclosure and scroll on inspection/return", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open NUTRITION TARGETS" }).click();
    await screen.getByRole("spinbutton", { name: "Calorie target (kcal/day)" }).fill("2345");
    await screen.getByText("Time capsule", { exact: true }).click();
    await screen.getByRole("button", { name: "WRITE ONE" }).click();
    await screen.getByRole("textbox", { name: "Note to future you" }).fill("Unsaved private draft");
    const trigger = screen.getByRole("button", { name: "Open HISTORY" });
    trigger.element().scrollIntoView();
    trigger.element().focus();
    const origin = window.scrollY;
    await userEvent.keyboard("{Enter}");
    expect(window.scrollY).toBe(0);
    await screen.getByRole("button", { name: "← BACK TO MORE" }).click();
    expect(window.scrollY).toBe(origin);
    expect(document.activeElement).toBe(trigger.element());
    await expect.element(screen.getByRole("textbox", { name: "Note to future you" })).toHaveValue("Unsaved private draft");
    await expect.element(screen.getByRole("spinbutton", { name: "Calorie target (kcal/day)" })).toHaveValue(2345);
    expect(await db.events.where("type").equals("TIME_CAPSULE_SEALED").count()).toBe(0);
    expect(await db.nutritionTargets.get("current")).toBeUndefined();
  });

  it.each([320, 360, 412])("provides immediate recovery access and usable controls at %ipx", async (width) => {
    await page.viewport(width, 800);
    const screen = await render(<MoreScreen />);
    const link = screen.getByRole("link", { name: "BACKUP & RECOVERY ↓" });
    expect(link.element().getBoundingClientRect().bottom).toBeLessThan(400);
    link.element().focus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Data safety", exact: true }).element());
    for (const name of ["EXPORT BACKUP", "SHARE BACKUP"]) {
      const box = screen.getByRole("button", { name }).element().getBoundingClientRect();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThan(800);
    }
    await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    await expect.element(screen.getByLabelText("Choose a backup file to restore")).toBeVisible();
    await screen.getByText("Automatic backups & file check", { exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "CHECK A BACKUP" })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    const smallText = Array.from(screen.container.querySelectorAll<HTMLElement>("p, h1, h2, button, summary, a, select"))
      .filter((element) => element.checkVisibility() && Number.parseFloat(getComputedStyle(element).fontSize) < 16)
      .map((element) => element.textContent);
    expect(smallText).toEqual([]);
  });

  it("loading/unavailable diagnostics never report an unverified zero or inactive day; retry is read-only", async () => {
    await startDay();
    const before = await db.events.toArray();
    let reject!: (error: Error) => void;
    vi.mocked(getDayCount).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const screen = await render(<MoreScreen />);
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Reading diagnostic information…");
    await expect.element(screen.getByText("UNKNOWN", { exact: true })).toBeVisible();
    expect(screen.getByText("Days", { exact: true }).elements()).toHaveLength(0);
    reject(new Error("Read interrupted"));
    await expect.element(screen.getByRole("alert")).toHaveTextContent("These readings are unavailable.");
    await expect.element(screen.getByRole("button", { name: "EXPORT BACKUP" })).toBeEnabled();
    await screen.getByRole("button", { name: "RETRY READINGS" }).click();
    await expect.element(screen.getByText("YES", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Days", { exact: true })).toBeVisible();
    expect(await db.events.toArray()).toEqual(before);
  });

  it("export failure is actionable, releases controls and retries the original backup path once", async () => {
    await startDay();
    const before = await db.events.toArray();
    vi.mocked(exportBackup).mockRejectedValueOnce(new Error("Export interrupted"));
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "EXPORT BACKUP" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Export interrupted");
    await expect.element(screen.getByRole("button", { name: "EXPORT BACKUP" })).toBeEnabled();
    await screen.getByRole("button", { name: "EXPORT BACKUP" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Backup file downloaded.");
    expect(exportBackup).toHaveBeenCalledTimes(2);
    expect(await db.events.toArray()).toEqual(before);
  });

  it("same-tick backup controls cannot initiate a second operation while export is unresolved", async () => {
    let release!: () => void;
    vi.mocked(exportBackup).mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const screen = await render(<MoreScreen />);
    const button = screen.getByRole("button", { name: "EXPORT BACKUP" }).element();
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(exportBackup).toHaveBeenCalledTimes(1);
    release();
    await expect.element(screen.getByRole("button", { name: "EXPORT BACKUP" })).toBeEnabled();
  });

  it("valid restore is preview-only until confirmation; cancel and invalid files never replace records", async () => {
    await startDay();
    const before = await db.events.toArray();
    const blob = await exportDB(db);
    const screen = await render(<MoreScreen />);
    await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    const input = screen.getByLabelText("Choose a backup file to restore").element() as HTMLInputElement;
    const choose = (file: File) => {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    choose(new File([blob], "existing-backup.json"));
    await expect.element(screen.getByRole("button", { name: "CONFIRM REPLACE" })).toBeVisible();
    expect(applyAnyRestore).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
    expect(input.value).toBe("");
    choose(new File(["not a backup"], "invalid.txt"));
    await expect.element(screen.getByRole("status")).toBeVisible();
    expect(screen.getByRole("button", { name: "CONFIRM REPLACE" }).elements()).toHaveLength(0);
    expect(applyAnyRestore).not.toHaveBeenCalled();
    expect(await db.events.toArray()).toEqual(before);
  });

  it("SYSTEM/top-bar entry and primary MORE reset retain their original navigation authority", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await screen.getByRole("button", { name: "Open HISTORY" }).click();
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEM" })).toBeVisible();
    await screen.getByRole("button", { name: "Search everything", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Search everything" })).toBeVisible();
    await screen.getByRole("button", { name: "← BACK TO MORE" }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEM" })).toBeVisible();
    for (const name of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await expect.element(screen.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  it("restore confirmation keeps backup-before-replace and reports either failure without pretending success", async () => {
    await startDay();
    const before = await db.events.toArray();
    const file = new File([await exportDB(db)], "confirmed-backup.json");
    const screen = await render(<MoreScreen />);
    await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    const input = screen.getByLabelText("Choose a backup file to restore").element() as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const confirm = screen.getByRole("button", { name: "CONFIRM REPLACE" });
    await expect.element(confirm).toBeVisible();
    vi.mocked(exportBackup).mockRejectedValueOnce(new Error("Safety backup interrupted"));
    await confirm.click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Restore failed: Safety backup interrupted");
    expect(applyAnyRestore).not.toHaveBeenCalled();
    await expect.element(confirm).toBeEnabled();
    vi.mocked(applyAnyRestore).mockRejectedValueOnce(new Error("Replacement interrupted"));
    await confirm.click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Restore failed: Replacement interrupted");
    expect(exportBackup).toHaveBeenCalledTimes(2);
    expect(applyAnyRestore).toHaveBeenCalledTimes(1);
    expect(applyAnyRestore).toHaveBeenCalledWith(file);
    expect(await db.events.toArray()).toEqual(before);
    await expect.element(confirm).toBeEnabled();
  });

  it("has no decorative/recommendation surface; settled and expanded controls pass full axe contrast", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    await screen.getByText("Automatic backups & file check", { exact: true }).click();
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    await expect.element(screen.getByText("Days", { exact: true })).toBeVisible();
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    expect(document.querySelector(".command-surface")).toBeNull();
    expect(document.querySelector(".machinery-reveal-overlay")).toBeNull();
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });

  it("reduced motion suppresses inherited animation during disclosure and navigation", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const screen = await render(<MoreScreen />);
    await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    expect(document.getAnimations()).toHaveLength(0);
    await screen.getByRole("button", { name: "Open SEARCH" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Search everything" })).toBeVisible();
    expect(document.getAnimations()).toHaveLength(0);
  });
});
