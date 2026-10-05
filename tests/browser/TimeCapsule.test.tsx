import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { sealTimeCapsule } from "../../src/application/timeCapsuleCommands";
import { db } from "../../src/persistence/db";

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): write and seal in MORE; the
 * text stays hidden; a due capsule shows above TODAY until GOT IT.
 */

afterEach(() => {
  cleanup();
});

describe("NOTES-CAPSULE-001 — time capsule", () => {
  it("MORE: write, pick when it opens, SEAL; the list shows the date, never the text", async () => {
    await page.viewport(360, 800);
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "WRITE ONE" }).click();
    await screen.getByRole("textbox", { name: "Note to future you" }).fill("Did the 5 a.m. workouts stick?");
    await screen.getByRole("button", { name: "6 months" }).click();
    await screen.getByRole("button", { name: "SEAL" }).click();
    await expect.element(screen.getByText("Sealed. It opens in 6 months.")).toBeVisible();
    await expect.element(screen.getByRole("list", { name: "Sealed capsules" })).toBeVisible();
    expect(document.body.textContent).not.toContain("5 a.m. workouts");
    const [event] = await db.events.where("type").equals("TIME_CAPSULE_SEALED").toArray();
    expect(event?.payload).toMatchObject({ note: "Did the 5 a.m. workouts stick?" });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("TODAY: a due capsule shows until GOT IT; a sealed one doesn't", async () => {
    await startDay();
    await sealTimeCapsule("Three months ago you started this. Keep going.", 3, new Date(2026, 0, 2));
    await sealTimeCapsule("Not yet", 12, new Date());
    const screen = await render(<App />);
    await expect.element(screen.getByText("Three months ago you started this. Keep going.")).toBeVisible();
    await expect.element(screen.getByText(/^TIME CAPSULE · A NOTE FROM /)).toBeVisible();
    expect(document.body.textContent).not.toContain("Not yet");
    await screen.getByRole("button", { name: "GOT IT", exact: true }).click();
    await expect.poll(() => document.body.textContent?.includes("Keep going.")).toBe(false);
    expect(await db.events.where("type").equals("TIME_CAPSULE_OPENED").count()).toBe(1);
  });
});
