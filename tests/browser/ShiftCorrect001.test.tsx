import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { markWorkEnded, markWorkStarted, setWorkContext, startDay } from "../../src/application/commands";
import { getWorkMarks } from "../../src/application/queries";
import { IFTTT_CONFIG_KEY } from "../../src/application/iftttAutomations";

/**
 * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections").
 * His screenshot: WORK ENDED at 04:20, then "Im still working till 0600. Fix my log" at 04:21. The work mark on TODAY's
 * timeline opens a SHIFT sheet (CHANGE TIME, REOPEN SHIFT); the free helper and Alfred make a shift_fix card. Invented
 * data; no real network.
 */
let requests = 0;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try { localStorage.clear(); } catch { /* ignore */ }
  requests = 0;
  vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.anthropic.com/")) requests++;
    throw new Error(`unexpected fetch ${url}`);
  });
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); try { localStorage.clear(); } catch { /* ignore */ } });

async function screenshotNight() {
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 10, 14, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(new Date(2026, 10, 15, 4, 20)); await markWorkEnded(day.id);
  vi.setSystemTime(new Date(2026, 10, 15, 4, 21));
  return day;
}
const sheet = () => page.getByRole("dialog", { name: "SHIFT", exact: true });
async function setTime(label: string, value: string) {
  await sheet().getByRole("textbox", { name: label }).fill(value).catch(async () => {
    const input = sheet().getByLabelText(label).element() as HTMLInputElement;
    input.value = value; input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SHIFT-CORRECT-001", () => {
  it("from TODAY's timeline: moves the end to 03:50, then reopens the shift; HISTORY keeps both, at 320px", async () => {
    const day = await screenshotNight();
    localStorage.setItem(IFTTT_CONFIG_KEY, JSON.stringify({ enabled: true, key: "k", events: ["work_ended"], includeValue: [] }));
    await page.viewport(412, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Worked 18:02–04:20", exact: true }).click();
    await expect.element(sheet()).toBeVisible();
    await expect.element(sheet().getByText(/phone automation already ran/)).toBeVisible();

    await sheet().getByRole("button", { name: /^Change the time of shift end/ }).click();
    await setTime("New time for shift end", "06:00");
    await sheet().getByRole("button", { name: "SAVE TIME", exact: true }).click();
    // Never later than now: refused in plain words, nothing written.
    await expect.element(sheet().getByRole("alert")).toHaveTextContent("A shift end can't be later than now.");
    await setTime("New time for shift end", "03:50");
    await sheet().getByRole("button", { name: "SAVE TIME", exact: true }).click();
    await expect.element(sheet().getByText("Shift end changed. The original stays in HISTORY.", { exact: true })).toBeVisible();
    await expect.element(sheet().getByText("(marked 04:20)")).toBeVisible();
    expect((await getWorkMarks(day.id)).ended!.occurredAt).toBe(new Date(2026, 10, 15, 3, 50).toISOString());

    await page.viewport(320, 900);
    await sheet().getByRole("button", { name: "REOPEN SHIFT", exact: true }).click();
    const confirm = sheet().getByRole("group", { name: "Reopen this shift" });
    await expect.element(confirm.getByText(/this can't take that back/)).toBeVisible();
    const box = sheet().element().querySelector<HTMLElement>(".log-entry")!;
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    for (const el of box.querySelectorAll<HTMLElement>("p, button")) expect(parseFloat(getComputedStyle(el).fontSize), el.textContent!).toBeGreaterThanOrEqual(16);
    expect((await axe.run(sheet().element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    // KEEP IT changes nothing.
    await confirm.getByRole("button", { name: "KEEP IT", exact: true }).click();
    expect((await getWorkMarks(day.id)).ended).toBeDefined();
    await sheet().getByRole("button", { name: "REOPEN SHIFT", exact: true }).click();
    await sheet().getByRole("group", { name: "Reopen this shift" }).getByRole("button", { name: "REOPEN SHIFT", exact: true }).click();
    await expect.element(sheet().getByText("Shift reopened. Tap WORK ENDED on TODAY when you're off.", { exact: true })).toBeVisible();
    expect((await getWorkMarks(day.id)).ended).toBeUndefined();
    await expect.element(sheet().getByText("Shift still open. Tap WORK ENDED on TODAY when you're off.", { exact: true })).toBeVisible();
    // The timeline follows: at work since the start, again.
    await expect.poll(() => document.querySelector("[data-day-map-summary]")?.textContent ?? "").toContain("At work since 18:02");
    expect(requests).toBe(0);
  });

  it("the screenshot words, free and with no key: a Reopen shift card that says what it can't take back", async () => {
    const day = await screenshotNight();
    localStorage.setItem(IFTTT_CONFIG_KEY, JSON.stringify({ enabled: true, key: "k", events: ["work_ended"], includeValue: [] }));
    await page.viewport(320, 800);
    const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
    await screen.getByRole("textbox", { name: "Message Alfred" }).fill("Im still working till 0600. Fix my log");
    await screen.getByRole("button", { name: "SEND", exact: true }).click();
    const card = screen.getByRole("group", { name: "Reopen shift (marked ended 04:20) · working till 06:00" });
    await expect.element(card).toBeVisible();
    await expect.element(card.getByText(/already ran when it was marked; this can't take that back/)).toBeVisible();
    expect((await axe.run(card.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    await card.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getWorkMarks(day.id)).ended).toBeUndefined();
    expect(requests).toBe(0);
  });
});
