import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { KeyMomentAlerts } from "../../src/ui/screens/more/KeyMomentAlerts";
import { startDay } from "../../src/application/commands";
import { bridgeLinks, markBridgeOutdated } from "../../src/ui/bridgeHandoff";
import { readPlanSent } from "../../src/application/bridgePlan";

/**
 * GRAYSON-PLAN-FRESH-001 (C7.2): on Android, a SAVE in KEY MOMENT ALERTS hands the new plan to Health Bridge in the
 * same tap; the screen says how current the phone is; TODAY's muted line offers UPDATE ALERTS when the plan changed.
 * Tue Nov 24 2026 12:00 is outside the default rotation's 18:00 to 06:00 shifts. Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36";
const q = (sel: string) => document.querySelector(sel);
let opened: string[] = [];

function android(on = true) {
  if (on) vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ANDROID);
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  opened = [];
  vi.spyOn(bridgeLinks, "open").mockImplementation((url: string) => { opened.push(url); });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 12, 0));
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

function fits(root: Element, width: number) {
  const seen = (el: HTMLElement) => el.getClientRects().length > 0;
  for (const b of [...root.querySelectorAll<HTMLElement>("button, a")].filter(seen)) expect(b.getBoundingClientRect().height, `${width} ${b.textContent}`).toBeGreaterThanOrEqual(44);
  for (const el of [...root.querySelectorAll<HTMLElement>("p, button, a, span")].filter(seen)) if (el.textContent?.trim()) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent}`).toBeGreaterThanOrEqual(16);
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}
async function aa(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"], rules: { "color-contrast": { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
const status = () => q("[data-phone-alerts-status]")?.textContent ?? null;

describe("GRAYSON-PLAN-FRESH-001 in KEY MOMENT ALERTS", () => {
  it("before: off Android, none of it shows (the screen as it was)", async () => {
    await page.viewport(360, 900);
    const screen = await render(<KeyMomentAlerts />);
    await expect.element(screen.getByRole("button", { name: "Quiet hours" })).toBeVisible();
    expect(q("[data-phone-alerts]")).toBeNull();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/before-360-key-moment-alerts.png`, element: q('[aria-label="Key-moment alerts"]') as HTMLElement });
    await screen.getByRole("button", { name: "Quiet hours" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saved. Your phone gets it at the next SYNC GARMIN.");
    expect(opened).toEqual([]);
  });

  it("change quiet hours: the update link opens after the save, and the status line says when the phone got it", async () => {
    android();
    await page.viewport(360, 900);
    const screen = await render(<KeyMomentAlerts />);
    await expect.poll(status).toBe("The phone gets your plan at the next SYNC GARMIN or UPDATE ALERTS.");
    await screen.getByRole("button", { name: "Quiet hours" }).click();
    await expect.poll(() => opened.length).toBe(1);
    expect(opened[0]).toMatch(/^intent:\/\/plan\?plan=.+#Intent;scheme=beyond-bridge;package=app\.beyond\.healthbridge;S\.browser_fallback_url=.+;end$/);
    expect(decodeURIComponent(opened[0]!.split("S.browser_fallback_url=")[1]!)).toMatch(/\?bridge=update;end$/);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saved. Sent to your phone.");
    await expect.poll(status).toBe("Phone has your plan from Tue 12:00.");
    expect(Math.floor(readPlanSent()!.at / 60_000)).toBe(new Date(2026, 10, 24, 12, 0).getTime() / 60_000);
    const block = q("[data-phone-alerts]")!;
    for (const width of [320, 360, 412]) { await page.viewport(width, 900); fits(block, width); }
    await page.viewport(360, 900);
    await aa("key moment alerts", q('[aria-label="Key-moment alerts"]')!);
    if (SHOTS) { (block as HTMLElement).scrollIntoView(); await page.screenshot({ path: `${SHOTS}/360-key-moment-alerts-status.png`, element: block as HTMLElement }); }
  });

  it("turning \"Update the phone when I save here\" off stops it; the status says the phone is behind, UPDATE ALERTS sends it", async () => {
    android();
    const screen = await render(<KeyMomentAlerts />);
    await screen.getByRole("button", { name: "Quiet hours" }).click();
    await expect.poll(() => opened.length).toBe(1);
    await screen.getByRole("button", { name: "Update the phone when I save here" }).click();
    expect(JSON.parse(localStorage.getItem("beyond.bridgePlan.settings.v1")!)).toEqual({ updateOnSave: false, showBehind: true });
    await screen.getByRole("button", { name: "Up for the shift alert" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saved. Your phone gets it at the next SYNC GARMIN.");
    expect(opened.length).toBe(1);
    await expect.poll(status).toBe("Phone has your plan from Tue 12:00. Changed since: UPDATE ALERTS");
    // Keyboard only: focus UPDATE ALERTS and press Enter.
    (q(".phone-alerts__update") as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => opened.length).toBe(2);
    await expect.poll(status).toBe("Phone has your plan from Tue 12:00.");
  });

  it("a Bridge too old for the link sent him back: the screen says to update it", async () => {
    android();
    markBridgeOutdated();
    const screen = await render(<KeyMomentAlerts />);
    await expect.element(screen.getByText("Update Health Bridge to send alerts without a sync. SYNC GARMIN still works.")).toBeVisible();
  });
});

async function today(width = 360) {
  await page.viewport(width, 900);
  await startDay(new Date(2026, 10, 23, 16, 30).toISOString());
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => q(".today-quiet-lines")).not.toBeNull();
  return screen;
}

describe("GRAYSON-PLAN-FRESH-001 on TODAY", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: "Phone alerts are behind your plan." shows when behind; UPDATE ALERTS opens the link; fits, axe clean`, async () => {
      android();
      const screen = await today(width);
      await expect.poll(() => q("[data-phone-behind]")?.textContent ?? null).toBe("Phone alerts are behind your plan.UPDATE ALERTS");
      const line = q("[data-phone-behind]")!;
      fits(line, width);
      await aa(`${width} today line`, q(".today-quiet-lines")!);
      if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/360-today-phone-behind.png`, element: q(".today-quiet-lines") as HTMLElement });
      await screen.getByRole("link", { name: "UPDATE ALERTS" }).click();
      expect(opened.length).toBe(1);
      expect(opened[0]!.startsWith("intent://plan?plan=")).toBe(true);
      await expect.poll(() => q("[data-phone-behind]")).toBeNull();
    });
  }

  it("before: off Android, the line never shows", async () => {
    await today();
    await new Promise((r) => setTimeout(r, 300));
    expect(q("[data-phone-behind]")).toBeNull();
    // The quiet-lines block is empty here, so the shot is the screen itself.
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/before-360-today.png` });
  });

  it("its switch off (KEY MOMENT ALERTS or MORE → TODAY, one switch) hides it", async () => {
    android();
    localStorage.setItem("beyond.bridgePlan.settings.v1", JSON.stringify({ updateOnSave: true, showBehind: false }));
    await today();
    await new Promise((r) => setTimeout(r, 300));
    expect(q("[data-phone-behind]")).toBeNull();
  });

  it("once used, it stays away for the rest of the lived day, even if the plan changes again", async () => {
    android();
    localStorage.setItem("beyond.bridgePlan.lineDay.v1", "2026-11-23");
    await today();
    await new Promise((r) => setTimeout(r, 300));
    expect(q("[data-phone-behind]")).toBeNull();
  });
});
