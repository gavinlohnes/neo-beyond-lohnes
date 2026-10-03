import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { logProtein, startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";
import { holdToConfirm } from "./helpers/hold";

/**
 * DROP 1.5 (owner brief 2026-10-03), the Oct 3 field case: a 49 g
 * protein-only log at 20:43:11 and a 50 g-protein meal at 20:43:26 for the
 * same food. Mon Oct 12 2026 is a Week A work night, so 20:45 is on shift
 * and TODAY shows its FUEL row.
 */
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 12, h, m, s, 0);

function proteinTile(): string {
  const cluster = document.querySelector(".instrument-cluster")!;
  const label = [...cluster.querySelectorAll(".meta")].find((el) => el.textContent === "PROTEIN")!;
  return label.nextElementSibling?.textContent ?? "";
}

async function seedOct3Duplicate() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  vi.setSystemTime(at(16, 30));
  const day = await startDay();
  const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
  vi.setSystemTime(at(20, 43, 11));
  const proteinId = await logProtein(day.id, 49);
  vi.setSystemTime(at(20, 43, 26));
  await logMeal(day.id, dinner.id);
  vi.setSystemTime(at(20, 45));
  return { day, dinner, proteinId };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  await page.viewport(360, 800);
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("one protein total on every screen", () => {
  it("TODAY, BODY's status tile and Nutrition Targets all show 99 g, then all show 50 g after DELETE", async () => {
    await seedOct3Duplicate();

    let today = await render(<TodayScreen />);
    await expect.element(today.getByText("Protein 99 g · Water 0 oz", { exact: true })).toBeVisible();
    await cleanup();

    const body = await render(<BodyScreen />);
    await expect.poll(proteinTile).toBe("99 g");
    await expect.element(body.getByText("99g protein logged today — log a bodyweight to see your target.", { exact: true })).toBeVisible();

    // DELETE the 49 g entry: open its correction, then hold DELETE.
    await body.getByRole("button", { name: "Open PROTEIN" }).click();
    await body.getByRole("button", { name: /SHOW TODAY'S ENTRIES/ }).click();
    await body.getByRole("button", { name: "CORRECT" }).click();
    await body.getByRole("button", { name: "DELETE" }).click();
    await expect.element(body.getByText("Hold to delete.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("PROTEIN_LOG_VOIDED").count()).toBe(0);
    await holdToConfirm(body.getByRole("button", { name: "DELETE" }));

    await expect.element(body.getByText("Deleted 49 g. Protein today: 50 g.", { exact: true })).toBeVisible();
    await expect.poll(proteinTile).toBe("50 g");
    await expect.element(body.getByText("50g protein logged today — log a bodyweight to see your target.", { exact: true })).toBeVisible();
    expect(body.getByRole("button", { name: /SHOW TODAY'S ENTRIES/ }).elements()).toHaveLength(0);
    expect(await db.events.where("type").equals("PROTEIN_LOGGED").count()).toBe(1);
    await cleanup();

    today = await render(<TodayScreen />);
    await expect.element(today.getByText("Protein 50 g · Water 0 oz", { exact: true })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });
});

describe("correcting protein to 0", () => {
  it.each(["0", "00", "0.0"])("%s shows a clear message pointing to DELETE, right in the entry", async (typed) => {
    await seedOct3Duplicate();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "Open PROTEIN" }).click();
    await body.getByRole("button", { name: /SHOW TODAY'S ENTRIES/ }).click();
    await body.getByRole("button", { name: "CORRECT" }).click();
    await body.getByRole("spinbutton", { name: "Corrected amount (g)" }).fill(typed);
    await body.getByRole("button", { name: "SAVE", exact: true }).click();

    await expect.element(body.getByText("0 g can't be saved as a correction. To remove this entry, hold DELETE.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("PROTEIN_LOG_CORRECTED").count()).toBe(0);
    await expect.poll(proteinTile).toBe("99 g");
  });
});

describe("Same food?", () => {
  it("asks after a meal lands 15 s after a similar protein-only log; REMOVE ONE deletes the protein-only entry", async () => {
    const { day } = await seedOct3Duplicate();
    // Start over with only the protein-only log, then log the meal from BODY at 20:43:26.
    await db.events.where("type").equals("MEAL_LOGGED").delete();
    vi.setSystemTime(at(20, 43, 26));
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "LOG", exact: true }).click();

    const prompt = body.getByRole("group", { name: "Same food?" });
    await expect.element(prompt.getByText("Same food? 49 g protein at 20:43 and Dinner (50 g protein) at 20:43.", { exact: true })).toBeVisible();
    await expect.element(prompt.getByText("REMOVE ONE deletes the 49 g protein-only entry; the meal stays.", { exact: true })).toBeVisible();
    // A question, never a block: both logs are saved until the operator chooses.
    expect(await db.events.where("beyondDayId").equals(day.id).and((e) => e.type === "PROTEIN_LOG_VOIDED").count()).toBe(0);

    await prompt.getByRole("button", { name: "REMOVE ONE" }).click();
    await expect.element(body.getByText("Deleted 49 g. Protein today: 50 g.", { exact: true })).toBeVisible();
    await expect.poll(proteinTile).toBe("50 g");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  });

  it("KEEP BOTH keeps both and closes the question", async () => {
    await seedOct3Duplicate();
    await db.events.where("type").equals("PROTEIN_LOGGED").delete();
    vi.setSystemTime(at(20, 43, 40));
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "Open PROTEIN" }).click();
    await body.getByRole("spinbutton", { name: "Protein (g)" }).fill("49");
    await body.getByRole("button", { name: "LOG PROTEIN" }).click();

    const prompt = body.getByRole("group", { name: "Same food?" });
    await expect.element(prompt).toBeVisible();
    await prompt.getByRole("button", { name: "KEEP BOTH" }).click();
    expect(body.getByRole("group", { name: "Same food?" }).elements()).toHaveLength(0);
    await expect.poll(proteinTile).toBe("99 g");
    expect(await db.events.where("type").equals("PROTEIN_LOG_VOIDED").count()).toBe(0);
  });

  it("never appears in normal logging: different protein, or more than 2 minutes apart", async () => {
    await seedOct3Duplicate();
    vi.setSystemTime(at(20, 44, 0));
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "Open PROTEIN" }).click();
    // WATER has its own; PROTEIN is the last station with one.
    await body.getByRole("button", { name: "SHOW MANUAL ENTRY" }).last().click();
    await body.getByRole("spinbutton", { name: "Protein (g)" }).fill("25");
    await body.getByRole("button", { name: "LOG PROTEIN" }).click();
    await expect.poll(proteinTile).toBe("124 g");
    expect(body.getByRole("group", { name: "Same food?" }).elements()).toHaveLength(0);

    vi.setSystemTime(at(20, 50, 0));
    await body.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(proteinTile).toBe("174 g");
    expect(body.getByRole("group", { name: "Same food?" }).elements()).toHaveLength(0);
  });
});
