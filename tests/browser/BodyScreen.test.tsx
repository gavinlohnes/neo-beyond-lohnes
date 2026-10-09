import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { db } from "../../src/persistence/db";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { logBodyweight, logSleep, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { holdToConfirm } from "./helpers/hold";
import { formatShortDate } from "../../src/application/bodyTrendQueries";

/**
 * BEYOND FIELD ALPHA Phase 3 — first real-browser acceptance layer for
 * BODY. There was no browser-level UI coverage for this screen before
 * this checkpoint (only pure copy tests in tests/ui/bodyScreenCopy.test.ts
 * and application-layer integration tests in tests/integration/
 * bodyAdditions.test.ts / bodyCorrection.test.ts) — this file exercises
 * the actually-rendered screen, driving everything through the real UI
 * controls (never hand-constructed DOM fixtures), so it protects both
 * the presentation contract this checkpoint changed and the underlying
 * logging/correction behavior it didn't. BODY is lazy-day (no explicit
 * "start a day" gate — every log command calls ensureActiveDay()
 * itself), so "empty state" here means no entries yet today, not "no
 * day exists."
 */

/**
 * CORRECT-banner regression guard: the entry-list reads the confirmation
 * banner's CORRECT depends on can be slowed per test (still the real
 * queries). With the delay on, a banner shown before refresh() finished
 * loading the new entry would make CORRECT a silent no-op; the tests that
 * enable it click CORRECT the instant the banner appears.
 */
const listReadDelay = vi.hoisted(() => ({ ms: 0 }));
async function delayListRead() {
  if (listReadDelay.ms > 0) await new Promise((resolve) => setTimeout(resolve, listReadDelay.ms));
}
vi.mock("../../src/application/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/queries")>();
  return {
    ...actual,
    getHydrationEntries: async (...args: Parameters<typeof actual.getHydrationEntries>) => {
      await delayListRead();
      return actual.getHydrationEntries(...args);
    },
  };
});
vi.mock("../../src/application/nutritionQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/nutritionQueries")>();
  return {
    ...actual,
    getMealEntries: async (...args: Parameters<typeof actual.getMealEntries>) => {
      await delayListRead();
      return actual.getMealEntries(...args);
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  listReadDelay.ms = 0;
});

describe("BodyScreen (real browser) — empty state", () => {
  it("shows Not logged / zero readings with no day and no entries yet", async () => {
    const screen = await render(<BodyScreen />);

    await expect.element(screen.getByText("0 oz", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("0 g", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Not logged", { exact: true }).first()).toBeVisible();
    // DECLUTTER Drop 2: only the STATUS box shows "Not logged" (SLEEP and
    // WEIGHT); the trackers below no longer repeat it.
    expect(screen.getByText("Not logged", { exact: true }).elements()).toHaveLength(3);
  });

  it("presents calories and protein first, with honest separate main-sleep and nap readings", async () => {
    await render(<BodyScreen />);
    await expect.poll(() => document.querySelectorAll(".health-overview .tool-label").length).toBe(6);
    expect([...document.querySelectorAll(".health-overview .tool-label")].map(el => el.textContent)).toEqual(["CALORIES", "PROTEIN", "WATER", "LAST WEIGHT", "MAIN SLEEP", "NAPS"]);
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
  });
});

describe("BodyScreen (real browser) — WATER", () => {
  it("a quick-add button logs the real amount and updates both the instrument cluster and HYDRATION's own reading", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+12 oz" }).click();

    await expect.element(screen.getByText("12 oz added.", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("region", { name: "Your daily health record" }).getByText("12 oz", { exact: true })).toBeVisible();
  });

  it("manual entry is reachable via disclosure and its input is properly labeled", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW MANUAL ENTRY" }).click();

    const input = screen.getByRole("spinbutton", { name: "Custom (oz)" });
    await expect.element(input).toBeVisible();
    await input.fill("20");
    await screen.getByRole("button", { name: "LOG WATER" }).click();
    await expect.element(screen.getByText("20 oz added.", { exact: true })).toBeVisible();
  });

  it("CORRECT preserves history rather than deleting the original entry", async () => {
    const screen = await render(<BodyScreen />);
    listReadDelay.ms = 150;
    await screen.getByRole("button", { name: "+8 oz" }).click();
    // Clicked the moment the banner appears: the banner must only show once
    // the new entry is loaded, or this CORRECT would silently do nothing.
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "CORRECT" }).click();
    const correctionInput = screen.getByRole("spinbutton", { name: "Corrected amount (oz)" });
    await expect.element(correctionInput).toBeVisible();
    await correctionInput.fill("10");
    await screen.getByRole("button", { name: "SAVE" }).click();

    await expect.element(screen.getByText("10 oz", { exact: true }).last()).toBeVisible();
    await expect.element(screen.getByText(/corrected 1x/).last()).toBeVisible();
  });

  // VISUAL-003: manual entry and today's-entries now render as a real
  // <details>/<summary> (FieldDisclosure) rather than a button toggling a
  // conditionally-rendered div — confirms the native element is actually
  // there, not just that the content happens to be reachable.
  it("manual entry and today's entries are real native <details> disclosures", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+8 oz" }).click();
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();

    const waterRow = screen.getByText("HYDRATION", { exact: true }).element().closest(".equipment-row")!;
    // NUTRITION-001: waterConfirmation (checked above) is set BEFORE
    // handleLogWaterAmount's own `await refresh()` — BodyScreen only
    // renders the TODAY'S ENTRIES disclosure once `entries.length > 0`
    // (see BodyScreen.tsx's `{entries.length > 0 && (...)}` gate), so it
    // can genuinely still be absent the instant the confirmation banner
    // itself becomes visible. refresh() now also fetches SavedMeal/meal-
    // entry state, widening that real (pre-existing) gap enough to flake
    // under CI's more contended timing than it did before. Wait for the
    // actual precondition the assertion below depends on — the TODAY'S
    // ENTRIES disclosure's own summary control existing — rather than
    // polling the raw <details> count blindly.
    await expect.element(screen.getByRole("button", { name: /TODAY'S ENTRIES/ })).toBeVisible();
    const disclosures = waterRow.querySelectorAll("details");
    expect(disclosures.length).toBe(2); // manual entry + today's entries
    for (const d of disclosures) expect(d.open).toBe(false);
  });
});

describe("BodyScreen (real browser) — SLEEP", () => {
  it("logs a duration and shows it as the reading, distinct from the machine-metadata line beneath it", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("spinbutton", { name: "Minutes" }).fill("15");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();

    // DECLUTTER Drop 2: the reading shows in the STATUS box only; the open
    // SLEEP form keeps the kind/time line beneath.
    await expect.element(screen.getByText("7 hr 15 min", { exact: true }).last()).toBeVisible();
    await expect.element(screen.getByText(/Main sleep ·/).first()).toBeVisible();
  });

  it("an implausible duration requires LOG ANYWAY rather than silently blocking", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("20");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();

    await expect.element(screen.getByText(/outside the usual range/)).toBeVisible();
    await screen.getByRole("button", { name: "LOG ANYWAY" }).click();
    await expect.element(screen.getByText("20 hr", { exact: true }).last()).toBeVisible();
  });

  it("Drop 3: minutes over 59 are refused in the form, with the message right there, and nothing saved", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("spinbutton", { name: "Minutes" }).fill("450");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();

    await expect.element(screen.getByText("Minutes must be a whole number from 0 to 59.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(0);
  });

  it("Drop 3: a correction outside the usual range asks SAVE ANYWAY, and the tile says which of two entries it shows", async () => {
    const day = await startDay();
    await logSleep(day.id, 435, "PRIMARY");
    await logSleep(day.id, 30, "SUPPLEMENTAL");
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("MAIN SLEEP", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("button", { name: /SHOW TODAY'S SLEEP/ }).click();
    await screen.getByRole("button", { name: "CORRECT" }).first().click();
    const hours = screen.getByRole("spinbutton", { name: "Hours" }).last();
    await hours.fill("14");
    await screen.getByRole("spinbutton", { name: "Minutes" }).last().fill("30");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();

    await expect.element(screen.getByText("14 hr 30 min is outside the usual range — save it anyway?", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("SLEEP_LOG_CORRECTED").count()).toBe(0);
    await screen.getByRole("button", { name: "SAVE ANYWAY" }).click();
    await expect.poll(() => db.events.where("type").equals("SLEEP_LOG_CORRECTED").count()).toBe(1);
  });

  it("NAP does not carry the main-sleep end-day framing", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("button", { name: "NAP", exact: true }).click();
    await expect.element(screen.getByText(/doesn't suggest ending your day/)).toBeVisible();
  });
});

describe("BodyScreen (real browser) — BODYWEIGHT", () => {
  it("first-ever entry has manual entry open by default (no SAME AS LAST without history)", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    expect(screen.getByRole("button", { name: /SAME AS LAST/ }).elements()).toHaveLength(0);

    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).toBeVisible();
  });

  it("SAME AS LAST reuses the prior value once one exists", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "SAME AS LAST (180 lbs)" }).click();
    await expect.element(screen.getByText("180 lbs", { exact: true }).first()).toBeVisible();
  });
});

describe("BodyScreen (real browser) — PROTEIN", () => {
  it("logs grams and reflects the running total, same value-forward pattern as HYDRATION", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open PROTEIN ONLY" }).click();
    await screen.getByRole("spinbutton", { name: "Protein (g)" }).fill("30");
    await screen.getByRole("button", { name: "LOG PROTEIN" }).click();

    await expect.element(screen.getByText("30 g", { exact: true }).first()).toBeVisible();
  });
});

/**
 * NUTRITION-003 (Calorie + Protein Targets, High-Risk Drop): calorie
 * target is set directly (no formula); protein target is derived from
 * the most recently logged bodyweight × an adjustable multiplier and
 * must read as "no target"/"log a bodyweight" rather than a guessed
 * number until a bodyweight actually exists.
 */
describe("BodyScreen (real browser) — NUTRITION TARGETS", () => {
  it("shows the honest no-target/no-bodyweight defaults before any settings or bodyweight are logged", async () => {
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText(/no calorie target/)).toBeVisible();
    await expect.element(screen.getByText(/log a bodyweight to see your target/)).toBeVisible();
  });

  it("reads saved targets for calorie progress, but protein stays unresolved until a bodyweight is logged", async () => {
    // DECLUTTER Drop 3: targets are set in MORE → Settings now; BODY only reads them.
    await updateNutritionTargets({ calorieTargetKcal: 2200, proteinMultiplierGPerLb: 0.9 });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW OTHER BODY TOOLS" }).click();
    await expect.element(screen.getByText("Nutrition targets are editable in MORE → Settings.", { exact: true })).toBeVisible();

    await expect.element(screen.getByText(/0 \/ 2200 kcal · 2200 remaining/)).toBeVisible();
    await expect.element(screen.getByText(/log a bodyweight to see your target/)).toBeVisible();

    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).toBeVisible();

    await expect.element(screen.getByText(/0 \/ 162g protein · 162g to go/)).toBeVisible();
  });

  it("logging a meal counts toward calorie progress against the set target", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText(/0 \/ 2200 kcal/)).toBeVisible();
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();

    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Chicken & Rice Bowl");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("600");
    await screen.getByRole("spinbutton", { name: "New meal protein (g)" }).fill("45");
    await screen.getByRole("spinbutton", { name: "New meal carbs (g)" }).fill("60");
    await screen.getByRole("spinbutton", { name: "New meal fat (g)" }).fill("15");
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Chicken & Rice Bowl logged · 600 kcal · 45g", { exact: true })).toBeVisible();

    await expect.element(screen.getByText(/600 \/ 2200 kcal · 1600 remaining/)).toBeVisible();
  });
});

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop): exercised through the
 * real rendered screen (never hand-constructed events), matching every
 * other BODY station's own test convention above.
 */
describe("BodyScreen (real browser) — MEAL MEMORY", () => {
  async function addSavedMeal(
    screen: Awaited<ReturnType<typeof render>>,
    { name = "Chicken & Rice Bowl", calories = "600", protein = "45", carbs = "60", fat = "15" } = {},
  ) {
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill(name);
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill(calories);
    await screen.getByRole("spinbutton", { name: "New meal protein (g)" }).fill(protein);
    await screen.getByRole("spinbutton", { name: "New meal carbs (g)" }).fill(carbs);
    await screen.getByRole("spinbutton", { name: "New meal fat (g)" }).fill(fat);
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
  }

  it("empty state is calm and distinguishes no-presets from no-meals-today", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByText("0 meals logged today", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/No saved meals yet/)).toBeVisible();
  });

  it("creates a saved meal via the add-meal form and shows its macro summary", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);

    await expect.element(screen.getByText("Chicken & Rice Bowl", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("600 kcal · 45 g protein", { exact: true })).toBeVisible();
  });

  it("BODY-QUICK-001: orders saved-meal shortcuts by recent use", async () => {
    const used = await createSavedMeal({ name: "Used recently", calories: 500, proteinG: 35, carbsG: 50, fatG: 15 });
    await createSavedMeal({ name: "New but unused", calories: 400, proteinG: 25, carbsG: 45, fatG: 12 });
    const day = await startDay();
    await logMeal(day.id, used.id);

    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByRole("group", { name: "Saved meal Used recently", exact: true }).getByText("Used recently", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("New but unused", { exact: true })).toBeVisible();
    const shortcutNames = Array.from(document.querySelectorAll('[aria-label^="Saved meal "] > .card-title'))
      .map((element) => element.textContent)
      .filter((text) => text === "Used recently" || text === "New but unused");
    expect(shortcutNames).toEqual(["Used recently", "New but unused"]);
  });

  it("LOG snapshots the current macros, shows a confirmation, and updates today's count", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();

    await expect.element(screen.getByText("Chicken & Rice Bowl logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
  });

  it("editing the preset after logging does not change the already-logged entry (past logs never rewritten)", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "EDIT" }).click();
    await screen.getByRole("spinbutton", { name: "Edit meal calories" }).fill("900");
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
    await expect.element(screen.getByText("900 kcal · 45 g protein", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();
    await expect.element(screen.getByText("600 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();
  });

  it("archiving the preset removes it from the active list but keeps its past log", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await screen.getByRole("button", { name: "ARCHIVE" }).click();

    // ARCHIVE/EDIT/LOG only ever render for an active SavedMeal list item —
    // their absence proves the preset left the active list (the meal's
    // own name text isn't a safe check here: it's also present, by
    // design, inside the still-DOM-resident closed TODAY'S MEALS entry).
    // Polled, not a synchronous check: archiveSavedMeal + refresh() settle
    // asynchronously after the click.
    await expect.poll(() => screen.getByRole("button", { name: "ARCHIVE" }).elements().length).toBe(0);
    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
  });

  it("editing a logged meal preserves history rather than deleting the original entry", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Chicken & Rice Bowl logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();
    await screen.getByRole("button", { name: "Edit Chicken & Rice Bowl" }).click();
    await screen.getByRole("spinbutton", { name: "Corrected calories" }).fill("620");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();

    await expect.element(screen.getByText("620 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/corrected 1x/).last()).toBeVisible();
  });

  it("HOTFIX: UNDO on the logged line takes the meal back out of today's totals", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText(/600 \/ 2200 kcal/)).toBeVisible();

    await screen.getByRole("button", { name: "UNDO" }).click();

    await expect.element(screen.getByText("0 meals logged today", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/0 \/ 2200 kcal · 2200 remaining/)).toBeVisible();
    expect(screen.getByRole("button", { name: "UNDO" }).elements()).toHaveLength(0);
    // History keeps both facts: the log and its void.
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(1);
  });

  it("HOTFIX: the logged line and its UNDO clear themselves after about 5 seconds", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "UNDO" })).toBeVisible();
    await expect
      .poll(() => screen.getByRole("button", { name: "UNDO" }).elements().length, { timeout: 7000, interval: 250 })
      .toBe(0);
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
  });

  it("HOTFIX amendment: a meal row has no CORRECT button; tapping it opens SAVE + DELETE, tapping again cancels", async () => {
    const day = await startDay();
    const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 45, carbsG: 50, fatG: 20 });
    await logMeal(day.id, dinner.id);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();

    const row = screen.getByRole("button", { name: "Edit Dinner" });
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
    expect(row.element().querySelector(".disclosure-chevron")).not.toBeNull();
    expect(screen.getByRole("button", { name: "CORRECT" }).elements()).toHaveLength(0);

    await row.click();
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "DELETE" })).toBeVisible();
    // Plain visible labels; the input keeps a unique accessible name.
    const card = row.element().parentElement!;
    expect([...card.querySelectorAll("label")].map((l) => l.textContent)).toEqual(["Calories", "Protein (g)", "Carbs (g)", "Fat (g)"]);
    await expect.element(screen.getByRole("spinbutton", { name: "Corrected calories" })).toHaveValue(650);

    // SAVE with nothing changed writes nothing.
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("No changes.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOG_CORRECTED").count()).toBe(0);

    // Edits in progress are dropped when the row is tapped again.
    await screen.getByRole("spinbutton", { name: "Corrected calories" }).fill("999");
    await row.click();
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("spinbutton", { name: "Corrected calories" }).elements()).toHaveLength(0);
    await row.click();
    await expect.element(screen.getByRole("spinbutton", { name: "Corrected calories" })).toHaveValue(650);
  });

  it("HOTFIX: DELETE needs a hold, then removes the meal from today's calories and protein", async () => {
    const day = await startDay();
    const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 45, carbsG: 50, fatG: 20 });
    await logMeal(day.id, dinner.id);
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByText(/650 \/ 2200 kcal/)).toBeVisible();
    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();
    await screen.getByRole("button", { name: "Edit Dinner" }).click();

    // A quick tap deletes nothing.
    await screen.getByRole("button", { name: "DELETE" }).click();
    await expect.element(screen.getByText("Hold to delete.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(0);

    await holdToConfirm(screen.getByRole("button", { name: "DELETE" }));

    await expect.element(screen.getByText("0 meals logged today", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/0 \/ 2200 kcal · 2200 remaining/)).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(1);
  });
});

/**
 * BODY-UX-001: manual macro entry starts collapsed inside ADD MEAL — the
 * owner reported the prior always-visible search + full manual form
 * together as confusing clutter on a real phone screen. Search stays the
 * one visible action until the operator actually needs manual entry.
 */
describe("BodyScreen (real browser) — ADD MEAL disclosure (BODY-UX-001)", () => {
  it("opening ADD MEAL with no prior search shows only the search box, not the manual macro fields", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();

    await expect.element(screen.getByRole("textbox", { name: "Search USDA food database" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "New meal name" }).elements()).toHaveLength(0);
    await expect.element(screen.getByRole("button", { name: "SHOW MANUAL MACROS" })).toBeVisible();
  });

  it("the manual macros toggle works independently of search state", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();

    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toBeVisible();
  });

  it("saving a new meal collapses the manual macros disclosure back to closed", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Oatmeal");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("300");
    await screen.getByRole("spinbutton", { name: "New meal protein (g)" }).fill("10");
    await screen.getByRole("spinbutton", { name: "New meal carbs (g)" }).fill("50");
    await screen.getByRole("spinbutton", { name: "New meal fat (g)" }).fill("5");
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
    await expect.element(screen.getByText("Oatmeal", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    expect(screen.getByRole("textbox", { name: "New meal name" }).elements()).toHaveLength(0);
    await expect.element(screen.getByRole("button", { name: "SHOW MANUAL MACROS" })).toBeVisible();
  });
});

describe("BodyScreen (real browser) — Food Lookup (NUTRITION-002, USDA FoodData Central)", () => {
  function mockFetchOnce(body: unknown, ok = true) {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok, json: async () => body } as Response);
  }

  const BANANA_FOOD = {
    fdcId: 1105073,
    description: "Bananas, raw",
    servingSize: 100,
    servingSizeUnit: "g",
    foodNutrients: [
      { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 89 },
      { nutrientId: 1003, nutrientName: "Protein", unitName: "G", value: 1.09 },
      { nutrientId: 1005, nutrientName: "Carbohydrate, by difference", unitName: "G", value: 22.8 },
      { nutrientId: 1004, nutrientName: "Total lipid (fat)", unitName: "G", value: 0.33 },
    ],
  };

  it("selecting a result pre-fills the ADD MEAL form without saving anything", async () => {
    mockFetchOnce({ foods: [BANANA_FOOD] });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();

    await screen.getByRole("textbox", { name: "Search USDA food database" }).fill("banana");
    await screen.getByRole("button", { name: "SEARCH" }).click();

    await expect.element(screen.getByText(/Bananas, raw/)).toBeVisible();
    await screen.getByRole("button", { name: /Bananas, raw/ }).click();

    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Bananas, raw");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(89);
    // Nothing is saved until the operator explicitly clicks SAVE MEAL.
    expect(await db.savedMeals.count()).toBe(0);
  });

  it("shows a plain no-results message rather than an error for a search with no matches", async () => {
    mockFetchOnce({ foods: [] });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();

    await screen.getByRole("textbox", { name: "Search USDA food database" }).fill("zzzznotafood");
    await screen.getByRole("button", { name: "SEARCH" }).click();

    await expect.element(screen.getByText(/No results — enter macros manually below/)).toBeVisible();
    // BODY-UX-001: a genuine miss auto-reveals manual entry — the operator
    // shouldn't have to separately find and tap a disclosure toggle too.
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toBeVisible();
  });

  it("degrades gracefully to manual entry when the search request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();

    await screen.getByRole("textbox", { name: "Search USDA food database" }).fill("banana");
    await screen.getByRole("button", { name: "SEARCH" }).click();

    await expect.element(screen.getByText(/No results — enter macros manually below/)).toBeVisible();
    // Manual entry remains fully available.
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Manual Meal");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("500");
    await screen.getByRole("spinbutton", { name: "New meal protein (g)" }).fill("30");
    await screen.getByRole("spinbutton", { name: "New meal carbs (g)" }).fill("50");
    await screen.getByRole("spinbutton", { name: "New meal fat (g)" }).fill("10");
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
    await expect.element(screen.getByText("Manual Meal", { exact: true })).toBeVisible();
  });
});

describe("BodyScreen (real browser) — cross-cutting", () => {
  it("LOG WATER logs exactly once per tap and reflects a single entry in today's list", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW MANUAL ENTRY" }).click();
    await screen.getByRole("spinbutton", { name: "Custom (oz)" }).fill("20");
    await screen.getByRole("button", { name: "LOG WATER" }).click();
    await expect.element(screen.getByText("20 oz added.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: /SHOW TODAY'S ENTRIES/ }).click();
    const waterRow = screen.getByText("HYDRATION", { exact: true }).element().closest(".equipment-row")!;
    const entryTitles = Array.from(waterRow.querySelectorAll(".card-title")).filter((el) => el.textContent === "20 oz");
    expect(entryTitles.length).toBe(1);
  });
});

describe("BodyScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375, 412])("has no horizontal overflow at %ipx", async (width) => {
    await page.viewport(width, 800);
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("WATER", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("BodyScreen (real browser) — accessibility", () => {
  it("every text input has a real accessible name (the RECOVERY-Minutes-style gap, checked across all of BODY)", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW MANUAL ENTRY" }).click(); // reveals water's custom-oz input too
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click(); // reveals the meal form's five inputs

    const results = await axe.run(screen.container, { runOnly: ["label"] });
    expect(results.violations).toEqual([]);
  });

  it("passes real WCAG AA color-contrast beyond the known app-wide exception", async () => {
    const screen = await render(<BodyScreen />);
    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

/**
 * LAUNCH-VISION-002: LAUNCH-VISION-001 made .btn-primary red app-wide.
 * BODY renders one primary log action per tracker on a single
 * long-scrolling screen, so that read as several solid red buttons at
 * once — a real second-order consequence a live visual pass caught that
 * source-only review didn't. BODY already carries a deliberately lower
 * red budget than TODAY/TRAIN (see the STATUS instrument-cluster tests
 * above); this carve-out extends that same rule to BODY's LOG buttons.
 */
describe("BodyScreen (real browser) — LAUNCH-VISION-002 BODY red-budget carve-out", () => {
  it("a BODY primary action (LOG WATER) is filled with the neutral tokens, not the app-wide red accent", async () => {
    const screen = await render(<BodyScreen />);
    // LOG WATER only renders once manual entry is revealed — same
    // disclosure the accessibility test above already opens.
    await screen.getByRole("button", { name: "SHOW MANUAL ENTRY" }).click();
    await expect.element(screen.getByRole("button", { name: "LOG WATER" })).toBeVisible();
    const el = screen.getByRole("button", { name: "LOG WATER" }).element();
    const bg = getComputedStyle(el).backgroundColor;
    // --text-1 = #f2f2f2 = rgb(242, 242, 242). var(--accent), the
    // app-wide default since LAUNCH-VISION-001, is HUD-001's one red rgb(208, 20, 27).
    expect(bg).not.toBe("rgb(208, 20, 27)");
    expect(bg).toBe("rgb(242, 242, 242)");
  });
});

describe("BodyScreen (real browser) — Drop 5 weight trend and same-as-yesterday meals", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  async function seedWeighIns(entries: [string, number][]) {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const [iso, lbs] of entries) {
      vi.setSystemTime(new Date(iso));
      const day = await startDay();
      await logBodyweight(day.id, lbs);
    }
    vi.useRealTimers();
  }

  it("shows the trend, best-since, milestone and projected goal date", async () => {
    await seedWeighIns([
      ["2026-07-01T12:00:00Z", 200],
      ["2026-08-20T12:00:00Z", 192],
      ["2026-08-25T12:00:00Z", 191],
      ["2026-08-30T12:00:00Z", 189.5],
      ["2026-09-04T12:00:00Z", 188],
      ["2026-09-09T12:00:00Z", 186],
    ]);
    await updateNutritionTargets({ goalWeightLbs: 176 });
    const screen = await render(<BodyScreen />);

    await expect.element(screen.getByText("186 lbs", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "YOUR PROGRESS" }).click();
    await expect.element(screen.getByRole("img", { name: /Weight over the last 60 days/ })).toBeVisible();
    await expect.element(screen.getByText("Lowest yet", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Down 10 lb since Jul 1", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/^Goal 176 lb — at this pace, about /)).toBeVisible();
  });

  it("shows no projection and no warning when the trend heads away from the goal", async () => {
    await seedWeighIns([
      ["2026-08-20T12:00:00Z", 186],
      ["2026-08-25T12:00:00Z", 187],
      ["2026-08-30T12:00:00Z", 188],
      ["2026-09-04T12:00:00Z", 189],
      ["2026-09-09T12:00:00Z", 190],
    ]);
    await updateNutritionTargets({ goalWeightLbs: 176 });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "YOUR PROGRESS" }).click();
    await expect.element(screen.getByRole("img", { name: /Weight over the last 60 days/ })).toBeVisible();
    expect(screen.getByText(/at this pace/).elements()).toHaveLength(0);
    expect(screen.getByText(/off track|behind|missed/i).elements()).toHaveLength(0);
  });

  it("SAME AS YESTERDAY logs the previous day's saved meals, then steps aside", async () => {
    const oats = await createSavedMeal({ name: "Oats", calories: 300, proteinG: 10, carbsG: 50, fatG: 5 });
    const bowl = await createSavedMeal({ name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    const yesterday = await startDay();
    await logMeal(yesterday.id, oats.id);
    await logMeal(yesterday.id, bowl.id);
    vi.useRealTimers();
    await startDay();

    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByText("From Sep 28: Oats, Bowl", { exact: true })).toBeVisible();
    // Sep 28 is days before today's real date, so BODY must not call it yesterday.
    expect(screen.getByRole("button", { name: /SAME AS YESTERDAY/ }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "REPEAT SEP 28 MEALS (2 meals)" }).click();

    await expect.element(screen.getByText("2 meals from Sep 28 logged · 900 kcal · 55g", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("2 meals logged today", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /REPEAT SEP 28 MEALS/ }).elements()).toHaveLength(0);
  });

  it("POST-QA: an actual yesterday keeps SAME AS YESTERDAY, and repeating logs each meal once", async () => {
    const oats = await createSavedMeal({ name: "Oats", calories: 300, proteinG: 10, carbsG: 50, fatG: 5 });
    const bowl = await createSavedMeal({ name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterday = await startDay(yesterdayStart.toISOString());
    await logMeal(yesterday.id, oats.id);
    await logMeal(yesterday.id, bowl.id);
    await startDay();

    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SAME AS YESTERDAY (2 meals)" }).click();

    await expect.element(screen.getByText("2 meals logged today", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(4);
    expect(screen.getByRole("button", { name: /SAME AS YESTERDAY/ }).elements()).toHaveLength(0);
  });

  it("POST-QA: past an empty day, the button names the source date instead of 'yesterday'", async () => {
    const oats = await createSavedMeal({ name: "Oats", calories: 300, proteinG: 10, carbsG: 50, fatG: 5 });
    const DAY = 24 * 60 * 60 * 1000;
    const sourceStart = new Date(Date.now() - 2 * DAY);
    const source = await startDay(sourceStart.toISOString());
    await logMeal(source.id, oats.id);
    await startDay(new Date(Date.now() - DAY).toISOString()); // a day with no meals
    await startDay();

    const screen = await render(<BodyScreen />);
    const date = formatShortDate(sourceStart);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByText(`From ${date}: Oats`, { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /SAME AS YESTERDAY/ }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: `REPEAT ${date.toUpperCase()} MEALS (1 meal)` }).click();

    await expect.element(screen.getByText(`1 meal from ${date} logged · 300 kcal · 10g`, { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(2);
  });
});

describe("BodyScreen (real browser) — Drop 6 quit tracker", () => {
  afterEach(() => {
    cleanup();
  });

  it("before setup, the row points to MORE → Settings", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW OTHER BODY TOOLS" }).click();
    await expect.element(screen.getByText("Set it up in MORE → Settings", { exact: true })).toBeVisible();
  });

  it("hold logs a clean day, taps log urges with undo, and money saved adds up", async () => {
    await saveQuitHabit({ name: "Drinking", dailyCostUsd: 7 });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW OTHER BODY TOOLS" }).click();
    await expect.element(screen.getByText("0 clean days this month · $0 saved", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Open QUIT: DRINKING" }).click();

    await screen.getByRole("button", { name: "LOG A CLEAN DAY" }).click();
    await expect.element(screen.getByText("Hold to log.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("CLEAN_DAY_LOGGED").count()).toBe(0);

    await holdToConfirm(screen.getByRole("button", { name: "LOG A CLEAN DAY" }));
    await expect.element(screen.getByText("Today is logged as clean.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 clean day this month", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("$7 saved this month · $7 total", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Log urge: Stress" }).click();
    await expect.element(screen.getByText("Urge logged — Stress.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 urge logged today", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByText("1 urge logged today", { exact: true })).not.toBeInTheDocument();
  });

  it("Drop 4: after an urge, the owner's own plan for that trigger shows with one optional tap", async () => {
    await saveQuitHabit({ name: "Drinking", ifThenPlans: { AFTER_SHIFT: "Shower and eat first" } });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW OTHER BODY TOOLS" }).click();
    await screen.getByRole("button", { name: "Open QUIT: DRINKING" }).click();

    // No plan for Stress: nothing extra appears.
    await screen.getByRole("button", { name: "Log urge: Stress" }).click();
    await expect.element(screen.getByText("Urge logged — Stress.", { exact: true })).toBeVisible();
    expect(screen.getByRole("group", { name: "Your plan" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "Log urge: After shift" }).click();
    const plan = screen.getByRole("group", { name: "Your plan" });
    await expect.element(plan.getByText("Your plan for After shift: Shower and eat first", { exact: true })).toBeVisible();
    await plan.getByRole("button", { name: "PLAN USED" }).click();
    await expect.element(plan.getByText("Noted — plan used.", { exact: true })).toBeVisible();
    expect(plan.getByRole("button").elements()).toHaveLength(0);
    const [event] = await db.events.where("type").equals("URGE_PLAN_RESPONDED").toArray();
    expect(event!.payload).toMatchObject({ trigger: "AFTER_SHIFT", used: true });
  });

  it("never mentions a streak, a reset, or a slip", async () => {
    await saveQuitHabit({ name: "Drinking" });
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "SHOW OTHER BODY TOOLS" }).click();
    await screen.getByRole("button", { name: "Open QUIT: DRINKING" }).click();
    await expect.element(screen.getByRole("button", { name: "LOG A CLEAN DAY" })).toBeVisible();
    expect(screen.getByText(/streak|relapse|slip|reset|failed/i).elements()).toHaveLength(0);
  });
});
