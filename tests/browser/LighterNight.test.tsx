import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TodayQuietSettings } from "../../src/ui/screens/more/TodayQuietSettings";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { getPlannedWorkDeclaration } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { todaySettled } from "./helpers/todaySettled";

/**
 * GRAYSON-LIGHTER-NIGHT-001 on TODAY. The default rotation has nights Fri 13 – Sun 15 Nov 2026, shift 18:00 → 06:00,
 * first day off Mon 16. TODAY at Sun 15 17:00: the last night of 3, before the shift. VITE_WALKTHROUGH_SHOTS=<dir>
 * saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const card = () => document.querySelector<HTMLElement>("section.lighter-night");
let dayId = "";

beforeEach(async () => {
  await page.viewport(360, 740);
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  vi.setSystemTime(new Date(2026, 10, 15, 17));
  dayId = (await startDay()).id;
  await createObligation({ title: "Home: Filter change", plannedAt: "2026-11-15" });
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

describe("GRAYSON-LIGHTER-NIGHT-001: TODAY", () => {
  it("the card sits under the Engine's next action, which stays on the first screen at 360 px; 44 px taps, no overflow, axe", async () => {
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await todaySettled();
    await expect.poll(() => card()?.querySelector("h2")?.textContent ?? null).toBe("Lighter last night?");
    const text = card()!.textContent!;
    expect(text).toContain("Last night of 3.");
    expect(text).toContain("Lift: SHORT A");
    expect(text).toContain("Home: Filter change moves to Mon, your first day off");
    const next = document.querySelector<HTMLElement>("[aria-label='Next action']");
    expect(next).not.toBeNull();
    expect(next!.compareDocumentPosition(card()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const b of card()!.querySelectorAll("button")) expect(Math.round(b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const w of [320, 360, 412]) { await page.viewport(w, 740); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 740);
    expect((await axe.run(card()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 740); await page.screenshot({ path: `${SHOTS}/card-${w}.png`, element: card()! }); }
  });

  it("Stop-and-ask check: the card never moves the Engine's next action at 360 px (it renders below it)", async () => {
    const topOfNext = async (cardShown: boolean) => {
      await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
      await todaySettled();
      if (cardShown) await expect.poll(card).not.toBeNull();
      await new Promise((r) => setTimeout(r, 1500));
      window.scrollTo(0, 0);
      const top = Math.round(document.querySelector("[aria-label='Next action']")!.getBoundingClientRect().top);
      expect(card() !== null).toBe(cardShown);
      await cleanup();
      return top;
    };
    const withCard = await topOfNext(true);
    localStorage.setItem(`beyond.lighterNight.day.${dayId}`, JSON.stringify({ dismissed: true }));
    expect(withCard).toBe(await topOfNext(false));
  });

  it("by keyboard: TAKE IT folds the card and moves focus to the line; UNDO one part leaves the others", async () => {
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await todaySettled();
    await expect.poll(card).not.toBeNull();
    const take = [...card()!.querySelectorAll("button")].find((b) => b.textContent === "TAKE IT")!;
    take.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => document.activeElement?.textContent ?? "").toBe("Lighter night: SHORT A · Filter change Mon.");
    expect(await getPlannedWorkDeclaration(dayId)).toBe(true);
    const job = (await db.obligations.toArray()).find((o) => o.title === "Home: Filter change")!;
    expect(job.plannedAt).toBe("2026-11-16");
    const taken = () => document.querySelector<HTMLElement>("section.lighter-night--taken");
    // Each part's words keep a readable width beside its UNDO, at every phone width; no overflow.
    for (const w of [320, 360, 412]) {
      await page.viewport(w, 740);
      for (const row of taken()!.querySelectorAll<HTMLElement>(".lighter-night__part")) {
        expect(row.querySelector<HTMLElement>(".meta")!.getBoundingClientRect().width).toBeGreaterThan(w / 3);
        expect(Math.round(row.querySelector("button")!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w);
    }
    await page.viewport(360, 740);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/taken-360.png`, element: taken()! });
    expect((await axe.run(taken()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    taken()!.querySelector<HTMLButtonElement>("button[aria-label='Undo home']")!.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => taken()?.textContent ?? "").toContain("Home jobs are back on tonight.");
    await expect.poll(() => taken()?.querySelector("[data-lighter-folded]")?.textContent ?? "").toBe("Lighter night: SHORT A.");
    expect((await db.obligations.get(job.id))!.plannedAt).toBe("2026-11-15");
    expect(await getPlannedWorkDeclaration(dayId)).toBe(true);
  });

  it("NOT TONIGHT hides it and writes nothing", async () => {
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await todaySettled();
    await expect.poll(card).not.toBeNull();
    const before = await db.events.count();
    [...card()!.querySelectorAll("button")].find((b) => b.textContent === "NOT TONIGHT")!.click();
    await expect.poll(card).toBeNull();
    expect(await db.events.count()).toBe(before);
  });

  it("switched off in MORE · TODAY, it's gone", async () => {
    const settings = await render(<TodayQuietSettings />);
    const box = settings.getByRole("button", { name: "Lighter last night card", exact: true });
    await expect.element(settings.getByRole("button", { name: /^Home part/ })).toHaveAttribute("aria-pressed", "true");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-360.png`, element: document.querySelector("[aria-label='Lighter last night']") as HTMLElement });
    await expect.element(box).toHaveAttribute("aria-pressed", "true");
    await box.click();
    await expect.element(box).toHaveAttribute("aria-pressed", "false");
    await expect.element(settings.getByRole("button", { name: /^Lift part/ })).not.toBeInTheDocument();
    await cleanup();
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await todaySettled();
    await new Promise((r) => setTimeout(r, 300));
    expect(card()).toBeNull();
  });
});
