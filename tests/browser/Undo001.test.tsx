import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { db } from "../../src/persistence/db";

/**
 * UNDO-001 (owner approval 2026-10-04): every BODY log banner offers UNDO
 * for its first 5 seconds, then goes back to CORRECT. UNDO appends a void
 * event — nothing is erased — and the entry leaves today's totals.
 */

beforeEach(async () => {
  await page.viewport(360, 800);
});

afterEach(async () => {
  await cleanup();
});

async function eventTypes(): Promise<string[]> {
  return (await db.events.toArray()).map((e) => e.type);
}

describe("UNDO on BODY's log banners", () => {
  it("water: UNDO removes the quick-add, records WATER_LOG_VOIDED, and the banner leaves", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+16 oz" }).click();
    await expect.element(screen.getByText("16 oz added.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("16 oz added.", { exact: true })).not.toBeInTheDocument();
    await expect.poll(eventTypes).toContain("WATER_LOG_VOIDED");
    await expect.poll(() => screen.getByRole("button", { name: /SHOW TODAY'S ENTRIES/ }).elements().length).toBe(0);
  });

  it("sleep: UNDO takes the night back out of the SLEEP reading", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("spinbutton", { name: "Minutes" }).fill("15");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();
    await expect.element(screen.getByText("Sleep saved as 7 hr 15 min.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("Sleep saved as 7 hr 15 min.", { exact: true })).not.toBeInTheDocument();
    await expect.element(screen.getByText("7 hr 15 min", { exact: true })).not.toBeInTheDocument();
    expect(await eventTypes()).toContain("SLEEP_LOG_VOIDED");
  });

  it("bodyweight: UNDO removes the weigh-in, so SAME AS LAST has nothing to repeat", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).not.toBeInTheDocument();
    await expect.poll(() => screen.getByRole("button", { name: /SAME AS LAST/ }).elements().length).toBe(0);
    expect(await eventTypes()).toContain("BODYWEIGHT_LOG_VOIDED");
  });

  it("protein: UNDO uses the existing protein DELETE event", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open PROTEIN" }).click();
    await screen.getByRole("spinbutton", { name: "Protein (g)" }).fill("30");
    await screen.getByRole("button", { name: "LOG PROTEIN" }).click();
    await expect.element(screen.getByText("30 g added.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("30 g added.", { exact: true })).not.toBeInTheDocument();
    expect(await eventTypes()).toContain("PROTEIN_LOG_VOIDED");
  });

  it("after 5 seconds the banner's UNDO turns back into CORRECT, which still opens the correction", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+8 oz" }).click();
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "UNDO", exact: true })).toBeVisible();

    await expect.element(screen.getByRole("button", { name: "UNDO", exact: true }), { timeout: 8000 }).not.toBeInTheDocument();
    const banner = screen.getByText("8 oz added.", { exact: true }).element().closest(".confirm-banner")!;
    const action = banner.querySelector("button")!;
    expect(action.textContent).toBe("CORRECT");
    action.click();
    await expect.element(screen.getByRole("spinbutton", { name: "Corrected amount (oz)" })).toBeVisible();
    expect(await eventTypes()).not.toContain("WATER_LOG_VOIDED");
  });
});
