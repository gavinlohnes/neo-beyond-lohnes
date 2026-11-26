import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { EatingWindowSetup } from "../../src/ui/screens/body/EatingWindowSetup";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { endDay, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { getEatingWindowSettings, markEatingWindow, saveEatingWindowSettings } from "../../src/application/eatingWindow";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-WINDOW-REVIEW-001 (C4.8c) on BODY's Eating Window section: what you actually do (with one offer to move the
 * plan), how it's going (a Try, then the review), and WHY A WINDOW. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m, d, h, min);
const NOV = 10, OCT = 9;
const PLAN = { enabled: true, eatingHours: 10, opensAt: { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" }, safetyCheckedAt: "2026-10-01T12:00:00.000Z" };

/** A finished work lived day starting d 16:30: optionally his OPENED mark the next afternoon, and a check-in. */
async function workDay(m: number, d: number, opts: { openAt?: [number, number]; energy?: 1 | 2 | 3 | 4 | 5 } = {}) {
  vi.setSystemTime(at(m, d, 16, 35));
  const day = await startDay(at(m, d, 16, 30).toISOString());
  await setWorkContext(day.id, "WORK", "MANUAL");
  if (opts.energy) { vi.setSystemTime(at(m, d, 17)); await submitCheckIn(day.id, { energy: opts.energy, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 }); }
  if (opts.openAt) { vi.setSystemTime(at(m, d + 1, ...opts.openAt)); await markEatingWindow("OPENED"); }
  vi.setSystemTime(at(m, d + 1, 16, 25));
  await endDay(day.id);
}
const openSection = async (screen: Awaited<ReturnType<typeof render>>) => {
  await screen.getByText(/^EATING WINDOW · /).click();
};
const section = (name: string) => document.querySelector(`[aria-label="${name}"]`) as HTMLElement | null;
const fits = async () => {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  }
  await page.viewport(360, 900);
};
const targets = (root: HTMLElement) => {
  for (const el of root.querySelectorAll<HTMLElement>("button, input")) {
    expect(Math.round(el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if (el.tagName === "INPUT") expect(parseFloat(getComputedStyle(el).fontSize)).toBeGreaterThanOrEqual(16);
  }
};
const axeClean = async (root: HTMLElement) => expect((await axe.run(root, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
const shot = async (name: string, el: HTMLElement | null, widths = [360]) => {
  if (!SHOTS || !el) return;
  for (const w of widths) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/${name}-${w}.png`, element: el }); }
  await page.viewport(360, 900);
};

beforeEach(async () => {
  await page.viewport(360, 900);
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(NOV, 1, 12));
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); await page.viewport(1280, 800); });

describe("GRAYSON-WINDOW-REVIEW-001", () => {
  it("with the window off, the section shows nothing new", async () => {
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    await expect.element(screen.getByRole("button", { name: "TURN ON" })).toBeVisible();
    expect(section("What you actually do")).toBeNull();
    expect(screen.getByRole("button", { name: "WHY A WINDOW" }).elements()).toHaveLength(0);
  });

  it("on with too few days, it says how many it has", async () => {
    await saveEatingWindowSettings(PLAN);
    await workDay(NOV, 10, { openAt: [15, 30] });
    await workDay(NOV, 11, { openAt: [15, 30] });
    vi.setSystemTime(at(NOV, 12, 18));
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    const block = screen.getByRole("region", { name: "What you actually do" });
    await expect.element(block.getByText("Not enough days yet (2 of 4).").first()).toBeVisible();
    expect(block.getByRole("group", { name: "Move the plan" }).elements()).toHaveLength(0);
  });

  it("his real opening by kind of day, one offer, and MOVE updates the plan and TODAY's card", async () => {
    await saveEatingWindowSettings(PLAN);
    for (const d of [10, 11, 12, 13, 14, 15]) await workDay(NOV, d, { openAt: [15, 30] });
    vi.setSystemTime(at(NOV, 16, 18));
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    const block = screen.getByRole("region", { name: "What you actually do" });
    await expect.element(block.getByText("Opens around 15:30.")).toBeVisible();
    await expect.element(block.getByText("6 work days: 6 marked, 0 from meals.")).toBeVisible();
    const offer = block.getByRole("group", { name: "Move the plan" });
    await expect.element(offer.getByText("On work days you've opened around 15:30, not 14:00. Move the plan to 15:30?")).toBeVisible();
    targets(section("What you actually do")!); await fits(); await axeClean(screen.container as HTMLElement);
    await shot("actual-and-offer", section("What you actually do"), [320, 360, 412]);

    await offer.getByRole("button", { name: "MOVE" }).click();
    await expect.element(screen.getByText("Plan moved: 15:30 on work days.")).toBeVisible();
    const saved = (await getEatingWindowSettings())!;
    expect(saved.opensAt).toEqual({ ...PLAN.opensAt, WORK: "15:30" });
    expect(saved.eatingHours).toBe(10);
    await expect.element(screen.getByLabelText("Work night")).toHaveValue("15:30");
    await expect.poll(() => section("What you actually do")?.querySelector("[aria-label='Move the plan']") ?? null).toBeNull();
    await cleanup();

    // TODAY's card reads the moved plan on a later work night (more than 24 h after his last mark).
    vi.setSystemTime(at(NOV, 17, 16, 40));
    const today = await startDay(at(NOV, 17, 16, 30).toISOString());
    await setWorkContext(today.id, "WORK", "MANUAL");
    localStorage.setItem("beyond.orientation.v1", "seen");
    const t = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.element(t.getByRole("region", { name: "Eating window" }).getByText("Today's plan: eat 15:30–01:30.")).toBeVisible();
  });

  it("KEEP keeps his plan and hides the offer; HIDE THIS and SHOW bring the block back", async () => {
    await saveEatingWindowSettings(PLAN);
    for (const d of [10, 11, 12, 13]) await workDay(NOV, d, { openAt: [16, 0] });
    vi.setSystemTime(at(NOV, 14, 18));
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    const offer = screen.getByRole("group", { name: "Move the plan" });
    await offer.getByRole("button", { name: "KEEP" }).click();
    await expect.element(screen.getByText("Kept your plan. GRAYSON won't ask about this for 14 days.")).toBeVisible();
    expect((await getEatingWindowSettings())!.opensAt.WORK).toBe("14:00");
    await expect.poll(() => document.querySelector("[aria-label='Move the plan']")).toBeNull();
    const block = screen.getByRole("region", { name: "What you actually do" });
    await block.getByRole("button", { name: "HIDE THIS" }).click();
    await expect.poll(() => section("What you actually do")).toBeNull();
    await screen.getByRole("button", { name: "SHOW WHAT YOU ACTUALLY DO" }).click();
    await expect.element(screen.getByRole("region", { name: "What you actually do" })).toBeVisible();
  });

  it("WHY A WINDOW opens a sourced sheet; links open in a new tab; Escape closes it and returns focus (keyboard only)", async () => {
    await saveEatingWindowSettings(PLAN);
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    const why = screen.getByRole("button", { name: "WHY A WINDOW" });
    await expect.element(why).toBeVisible();
    (why.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const sheet = page.getByRole("dialog", { name: "Why a window" });
    await expect.element(sheet).toBeVisible();
    await expect.element(sheet.getByText("General information, not medical advice.")).toBeVisible();
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-why-window] a")];
    expect(links.length).toBe(4);
    for (const a of links) { expect(a.target).toBe("_blank"); expect(a.rel).toContain("noopener"); expect(a.href).toMatch(/^https:\/\//); }
    targets(document.querySelector("[data-why-window]") as HTMLElement); await fits();
    await axeClean(document.querySelector("[data-why-window]") as HTMLElement);
    await shot("why-sheet", document.querySelector("[data-why-window]") as HTMLElement, [320, 360, 412]);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector("[data-why-window]")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(why.element());
  });

  it("CHECK HOW IT'S GOING runs a Try; at the end the review shows its lines, a guardrail, and END turns the window off", async () => {
    await saveEatingWindowSettings(PLAN);
    for (const d of [24, 25, 26, 27]) await workDay(OCT, d, { energy: 4 }); // before
    vi.setSystemTime(at(OCT, 28, 18));
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    const how = screen.getByRole("region", { name: "How it's going" });
    await how.getByRole("button", { name: "14 DAYS" }).click();
    await how.getByRole("button", { name: "CHECK HOW IT'S GOING" }).click();
    await expect.element(screen.getByText("Checking how it's going for 14 days. Nothing changes meanwhile.")).toBeVisible();
    await expect.element(how.getByText("Checking how it's going: day 1 of 14. The review comes at the end.")).toBeVisible();
    await cleanup();

    for (const d of [28, 29, 30, 31]) await workDay(OCT, d, { energy: 2, openAt: [14, 10] }); // during
    vi.setSystemTime(at(NOV, 12, 18));
    const again = await render(<EatingWindowSetup active />);
    await openSection(again);
    const review = again.getByRole("region", { name: "How it's going" });
    await expect.element(review.getByText("Weight trend")).toBeVisible();
    await expect.element(review.getByText(/^Not enough weigh-ins to tell/)).toBeVisible();
    await expect.element(review.getByText(/^2\.0 during \(4 days\), 4\.0 usually \(4 days\)/)).toBeVisible();
    await expect.element(review.getByText("Energy has been lower while you've been on the window. A wider window or more food on work nights may help.")).toBeVisible();
    const lines = [...section("How it's going")!.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(lines.at(-1)).toBe("Window kept");
    targets(section("How it's going")!); await fits(); await axeClean(section("How it's going")!);
    await shot("review-guardrail", section("How it's going"), [320, 360, 412]);

    await review.getByLabelText("One thing you learned (optional)").fill("Work nights need more food");
    await review.getByRole("button", { name: "END" }).click();
    await expect.poll(async () => (await getEatingWindowSettings())?.enabled).toBe(false);
    const entry = (await db.decisionJournalEntries.toArray()).find((e) => e.title === "Try: Eating window 14:10")!;
    expect(entry).toMatchObject({ status: "REVIEWED", outcome: "Ended the window", lesson: "Work nights need more food" });
    await expect.element(again.getByText(/^EATING WINDOW · OFF/)).toBeVisible();
  });

  it("a failed MOVE says so and changes nothing", async () => {
    await saveEatingWindowSettings(PLAN);
    for (const d of [10, 11, 12, 13]) await workDay(NOV, d, { openAt: [16, 0] });
    vi.setSystemTime(at(NOV, 14, 18));
    const screen = await render(<EatingWindowSetup active />);
    await openSection(screen);
    vi.spyOn(db.schedulePatterns, "put").mockRejectedValueOnce(new Error("disk full"));
    await screen.getByRole("group", { name: "Move the plan" }).getByRole("button", { name: "MOVE" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("That didn't save. Nothing changed.");
    expect((await getEatingWindowSettings())!.opensAt.WORK).toBe("14:00");
  });
});
