import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { logBodyweight, logSleep, logWater, startDay } from "../../src/application/commands";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { db } from "../../src/persistence/db";
import { holdToConfirm } from "./helpers/hold";

/**
 * Field report 2026-10-18: three accidental 16 oz water logs; correcting one
 * to 0 silently did nothing. Water, sleep and bodyweight entries now have the
 * same hold-to-confirm DELETE protein has (a void event, never an erase), and
 * correcting to 0 says so inside the entry and points at DELETE.
 */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });

const count = (type: string) => db.events.where("type").equals(type).count();
const waterEntries = () => document.querySelectorAll("#water-correction").length;

describe("water", () => {
  it.each(["0", "00", "0.0"])("correcting to %s says why, right in the entry, and points at DELETE", async (typed) => {
    const day = await startDay();
    await logWater(day.id, 16);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: /SHOW TODAY'S ENTRIES \(1\)/ }).click();
    await screen.getByRole("button", { name: "CORRECT", exact: true }).click();
    await screen.getByRole("spinbutton", { name: "Corrected amount (oz)" }).fill(typed);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("0 oz can't be saved as a correction. To remove this entry, hold DELETE.", { exact: true })).toBeVisible();
    // The input keeps what was typed; nothing was written.
    await expect.element(screen.getByRole("spinbutton", { name: "Corrected amount (oz)" })).toHaveValue(Number(typed));
    expect(await count("WATER_LOG_CORRECTED")).toBe(0);
    expect(waterEntries()).toBe(1);
  });

  it("holding DELETE removes one accidental log, keeps the original on record, and updates the total", async () => {
    const day = await startDay();
    for (let i = 0; i < 3; i++) await logWater(day.id, 16);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: /SHOW TODAY'S ENTRIES \(3\)/ }).click();
    await screen.getByRole("button", { name: "CORRECT", exact: true }).first().click();
    const remove = screen.getByRole("button", { name: "DELETE", exact: true });
    await expect.element(remove).toBeVisible();
    expect(remove.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    // A quick tap only explains.
    await remove.click();
    await expect.element(screen.getByText("Hold to delete.", { exact: true })).toBeVisible();
    expect(await count("WATER_LOG_VOIDED")).toBe(0);
    await holdToConfirm(remove);
    await expect.element(screen.getByText("Deleted 16 oz. Water today: 32 oz.", { exact: true })).toBeVisible();
    expect(await count("WATER_LOG_VOIDED")).toBe(1);
    expect(await count("WATER_LOGGED")).toBe(3); // nothing erased
    expect(await getEffectiveHydrationTotal(day.id)).toBe(32);
    await expect.element(screen.getByRole("button", { name: /TODAY'S ENTRIES \(2\)/ })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });
});

describe("sleep", () => {
  it("correcting to 0 h 0 min points at DELETE; holding DELETE voids the entry", async () => {
    const day = await startDay();
    await logSleep(day.id, 420, "PRIMARY");
    await logSleep(day.id, 30, "SUPPLEMENTAL");
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("button", { name: /SHOW TODAY'S SLEEP/ }).click();
    await screen.getByRole("button", { name: "CORRECT", exact: true }).last().click();
    await screen.getByRole("spinbutton", { name: "Hours" }).last().fill("0");
    await screen.getByRole("spinbutton", { name: "Minutes" }).last().fill("0");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("0 min can't be saved as a correction. To remove this entry, hold DELETE.", { exact: true })).toBeVisible();
    expect(await count("SLEEP_LOG_CORRECTED")).toBe(0);
    await holdToConfirm(screen.getByRole("button", { name: "DELETE", exact: true }));
    await expect.poll(() => count("SLEEP_LOG_VOIDED")).toBe(1);
    await expect.element(screen.getByText(/^Deleted (30 min|7 hr) of sleep\.$/)).toBeVisible();
    expect(await count("SLEEP_LOGGED")).toBe(2);
  });
});

describe("bodyweight", () => {
  it("correcting to 0 points at DELETE; holding DELETE voids the entry", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 182);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    await screen.getByRole("button", { name: /SHOW TODAY'S ENTRIES \(1\)/ }).last().click();
    await screen.getByRole("button", { name: "CORRECT", exact: true }).last().click();
    await screen.getByRole("spinbutton", { name: "Corrected weight (lbs)" }).fill("0");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("0 lbs can't be saved as a correction. To remove this entry, hold DELETE.", { exact: true })).toBeVisible();
    expect(await count("BODYWEIGHT_LOG_CORRECTED")).toBe(0);
    await holdToConfirm(screen.getByRole("button", { name: "DELETE", exact: true }));
    await expect.element(screen.getByText("Deleted 182 lbs.", { exact: true })).toBeVisible();
    expect(await count("BODYWEIGHT_LOG_VOIDED")).toBe(1);
    expect(await count("BODYWEIGHT_LOGGED")).toBe(1);
  });
});
