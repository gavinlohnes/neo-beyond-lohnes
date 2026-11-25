import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { RunDebrief } from "../../src/ui/screens/today/RunDebrief";
import { endDay, logSleep, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getDecisionJournalEntries } from "../../src/application/journalQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { todaySettled } from "./helpers/todaySettled";

/**
 * GRAYSON-RUN-DEBRIEF-001 (C2.5): on RUN OVER (Fri Nov 20 2026, after the Wed and Thu shifts) TODAY asks "How did the
 * run go?" between the post-run report and the recovery contract.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => {
  await page.viewport(360, 800);
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  for (const d of [18, 19]) {
    vi.setSystemTime(new Date(2026, 10, d, 16, 35));
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, d, 16, 40)); await logSleep(day.id, 360);
    vi.setSystemTime(new Date(2026, 10, d + 1, 16, 25)); await endDay(day.id);
  }
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); await page.viewport(1280, 800); });

const runOver = async () => {
  vi.setSystemTime(new Date(2026, 10, 20, 18));
  await startDay();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(screen.getByText("How did the run go?", { exact: true }).first()).toBeVisible();
  return screen;
};
const card = () => document.querySelector("[aria-label='Run debrief']") as HTMLElement;
const checkTargets = () => {
  for (const el of card().querySelectorAll<HTMLElement>("button, input")) {
    expect(Math.round(el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if (el.tagName === "INPUT") expect(parseFloat(getComputedStyle(el).fontSize)).toBeGreaterThanOrEqual(16);
  }
};
const fits = async () => {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  }
  await page.viewport(360, 800);
};
const axeClean = async (root: HTMLElement) =>
  expect((await axe.run(root, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

describe("GRAYSON-RUN-DEBRIEF-001", () => {
  it("one tap saves the debrief; the optional line adds to the same entry; the card then reads the word with CHANGE", async () => {
    const screen = await runOver();
    // Between the post-run report and the recovery contract, inside RUN OVER.
    const after = document.querySelector("[aria-label='After the run']")!;
    const report = after.querySelector(".today-life-state__report")!, contract = after.querySelector("[aria-label='Recovery contract']")!;
    expect(after.contains(card())).toBe(true);
    expect(report.compareDocumentPosition(card()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card().compareDocumentPosition(contract) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect.element(screen.getByText("Run Nov 18 to Nov 19, 2 shifts. Only you see this.")).toBeVisible();
    checkTargets(); await fits(); await axeClean(card());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/question-360.png`, element: card() });
    if (SHOTS) for (const w of [320, 412]) { await page.viewport(w, 800); await page.screenshot({ path: `${SHOTS}/question-${w}.png`, element: card() }); }
    await page.viewport(360, 800);

    await screen.getByRole("button", { name: "OK", exact: true }).click();
    await expect.element(screen.getByText("Run felt ok. Saved.")).toBeVisible();
    expect(await getDecisionJournalEntries()).toHaveLength(1);
    const field = screen.getByLabelText("One thing for next run (optional)");
    await expect.element(field).toHaveAttribute("placeholder", "Bed by 9 on night one");
    checkTargets(); await fits(); await axeClean(card());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/next-line-360.png`, element: card() });
    if (SHOTS) for (const w of [320, 412]) { await page.viewport(w, 800); await page.screenshot({ path: `${SHOTS}/next-line-${w}.png`, element: card() }); }
    await page.viewport(360, 800);

    await field.fill("Bed by 9 on night one");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Next run: Bed by 9 on night one")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Change the run debrief" })).toBeVisible();
    const all = await getDecisionJournalEntries();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Run debrief", context: "Run Nov 18 to Nov 19, 2 shifts", decision: "Run felt ok", expectation: "Next run: Bed by 9 on night one" });
    checkTargets(); await fits(); await axeClean(card());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/saved-360.png`, element: card() });
    if (SHOTS) for (const w of [320, 412]) { await page.viewport(w, 800); await page.screenshot({ path: `${SHOTS}/saved-${w}.png`, element: card() }); }
  });

  it("CHANGE re-picks the word on the same entry, with Undo; keyboard only", async () => {
    const screen = await runOver();
    await screen.getByRole("button", { name: "OK", exact: true }).click();
    await screen.getByRole("button", { name: "DONE" }).click();
    (screen.getByRole("button", { name: "Change the run debrief" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "OK", exact: true })).toHaveAttribute("aria-pressed", "true");
    (screen.getByRole("button", { name: "Rough" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Rough" })).toHaveAttribute("aria-pressed", "true");
    await expect.element(screen.getByText("Changed.")).toBeVisible();
    let all = await getDecisionJournalEntries();
    expect(all).toHaveLength(1);
    expect(all[0]!.decision).toBe("Run felt rough");
    checkTargets(); await fits(); await axeClean(card());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/change-undo-360.png`, element: card() });
    (screen.getByRole("button", { name: "UNDO" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "OK", exact: true })).toHaveAttribute("aria-pressed", "true");
    all = await getDecisionJournalEntries();
    expect(all).toHaveLength(1);
    expect(all[0]!.decision).toBe("Run felt ok");
  });

  it("#726 review: CHANGE edits an existing line with Undo; a cleared line says why it can't save; a failed fix changes nothing", async () => {
    const screen = await runOver();
    await screen.getByRole("button", { name: "OK", exact: true }).click();
    await screen.getByLabelText("One thing for next run (optional)").fill("Nap first");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await screen.getByRole("button", { name: "Change the run debrief" }).click();
    const field = screen.getByLabelText("One thing for next run (optional)");
    await expect.element(field).toHaveValue("Nap first");
    await field.fill("");
    await expect.element(screen.getByText("A saved line can be changed, not cleared.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "SAVE LINE" })).toBeDisabled();
    await field.fill("Nap 90 min first");
    await screen.getByRole("button", { name: "SAVE LINE" }).click();
    await expect.element(screen.getByText("Changed.")).toBeVisible();
    expect((await getDecisionJournalEntries())[0]!.expectation).toBe("Next run: Nap 90 min first");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getDecisionJournalEntries())[0]!.expectation).toBe("Next run: Nap first");
    vi.spyOn(db.decisionJournalEntries, "put").mockRejectedValue(new Error("disk full"));
    await screen.getByRole("button", { name: "Rough" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("That didn't save. Nothing changed.");
    expect((await getDecisionJournalEntries())[0]!.decision).toBe("Run felt ok");
  });

  it("NOT NOW hides it for this run and writes nothing", async () => {
    const screen = await runOver();
    await screen.getByRole("button", { name: "NOT NOW" }).click();
    await expect.poll(() => card()).toBeNull();
    expect(await getDecisionJournalEntries()).toHaveLength(0);
    await cleanup();
    render(<TodayScreen onOpenLife={() => {}} />);
    await expect.element(page.getByRole("region", { name: "Recovery contract" })).toBeVisible();
    expect(card()).toBeNull();
  });

  it("doesn't show outside RUN OVER, or with no post-run report", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 18)); // a work day, mid-run
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await todaySettled();
    expect(screen.getByText("RUN OVER").elements()).toHaveLength(0);
    expect(card()).toBeNull();
    await cleanup();
    let read = false;
    render(<RunDebrief busy={false} readReport={async () => { read = true; return null; }} />);
    await expect.poll(() => read).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(card()).toBeNull();
  });

  it("a failed save says so and writes nothing", async () => {
    const screen = await runOver();
    vi.spyOn(db.decisionJournalEntries, "add").mockRejectedValue(new Error("disk full"));
    await screen.getByRole("button", { name: "Good" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("That didn't save. Nothing changed.");
    expect(await db.decisionJournalEntries.count()).toBe(0);
    await expect.element(screen.getByRole("button", { name: "Good" })).toBeEnabled();
  });
});
