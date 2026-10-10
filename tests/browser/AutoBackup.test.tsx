import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { getAutoBackupPreference } from "../../src/application/autoBackupQueries";

/**
 * BACKUP-AUTO-001 (owner decision 2A, 2026-10-04): with automatic backup on
 * and a backup due, TODAY shows one line; BACK UP NOW hands the backup to
 * the share menu and the line clears. Off by default.
 */

const PREFERENCE_KEY = "beyond:autoBackupPreference";
const nav = navigator as Navigator & { canShare?: unknown; share?: unknown };
const realCanShare = nav.canShare;
const realShare = nav.share;

afterEach(() => {
  cleanup();
  nav.canShare = realCanShare;
  nav.share = realShare;
});

function fakeShareSheet() {
  const share = vi.fn(async () => {});
  nav.canShare = () => true;
  nav.share = share;
  return share;
}

describe("BACKUP-AUTO-001 — automatic backup", () => {
  it("off by default: TODAY shows no backup line, even with no backup on record", async () => {
    await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toBeVisible();
    expect(document.querySelector('section[aria-label="Backup"]')).toBeNull();
  });

  it("on and due: one line on TODAY; BACK UP NOW shares the backup and the line clears", async () => {
    await page.viewport(360, 780);
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ enabled: true, everyDays: 7 }));
    localStorage.setItem("beyond:lastRestoreCheckAt", new Date().toISOString());
    const share = fakeShareSheet();
    await startDay();
    const screen = await render(<App />);
    const button = screen.getByRole("button", { name: "BACK UP NOW" });
    await expect.element(button).toBeVisible();
    await expect.element(screen.getByText("Backup due", { exact: true })).toBeVisible();
    // The line now sits inside TODAY, whose entrance animation briefly scales it; measure at rest.
    for (const animation of document.getAnimations()) animation.finish();
    expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

    await button.click();
    await expect.element(screen.getByText("Backup sent to the share menu.")).toBeVisible();
    expect(share).toHaveBeenCalledTimes(1);
    const shared = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0]!;
    expect(shared.type).toBe("application/json");
    expect(JSON.parse(await shared.text()).formatName).toBe("dexie");
    expect(document.querySelector('section[aria-label="Backup"] button')).toBeNull();
  });

  it("closing the share menu without picking keeps the line", async () => {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ enabled: true, everyDays: 7 }));
    nav.canShare = () => true;
    nav.share = vi.fn(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "BACK UP NOW" }).click();
    await expect.element(screen.getByRole("status")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "BACK UP NOW" })).toBeVisible();
  });

  it("LATER hides the line", async () => {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ enabled: true, everyDays: 7 }));
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "LATER" }).click();
    await expect.poll(() => document.querySelector('section[aria-label="Backup"]')).toBeNull();
  });

  it("MORE → Data safety turns it on and picks the interval", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByText("Automatic backups & file check", { exact: true }).click();
    await expect.element(screen.getByText("AUTOMATIC BACKUP", { exact: true })).toBeVisible();
    const row = screen.getByText("AUTOMATIC BACKUP", { exact: true }).element().closest(".equipment-row")!;
    (row.querySelector("button") as HTMLButtonElement).click();
    await expect.element(screen.getByRole("combobox", { name: "Back up every" })).toBeVisible();
    await screen.getByRole("combobox", { name: "Back up every" }).selectOptions("14");
    expect(getAutoBackupPreference()).toEqual({ enabled: true, everyDays: 14 });
    await expect.element(screen.getByText("On, every 14 days.")).toBeVisible();
  });
});
