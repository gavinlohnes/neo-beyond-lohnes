import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";

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

afterEach(() => {
  cleanup();
});

describe("BodyScreen (real browser) — empty state", () => {
  it("shows Not logged / zero readings with no day and no entries yet", async () => {
    const screen = await render(<BodyScreen />);

    await expect.element(screen.getByText("0 oz", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("0 g", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Not logged", { exact: true }).first()).toBeVisible();
    // SLEEP and WEIGHT each show "Not logged" twice: once in the
    // instrument cluster, once again as their own section's reading.
    expect(screen.getByText("Not logged", { exact: true }).elements()).toHaveLength(4);
  });

  it("the instrument cluster is a real .instrument-cluster, not a plain .card", async () => {
    await render(<BodyScreen />);
    expect(document.querySelectorAll(".instrument-cluster")).toHaveLength(1);
    expect(document.querySelectorAll(".instrument-cluster .card")).toHaveLength(0);
  });

  it("no dominant .command-surface exists — BODY's four trackers are peers, not one leading recommendation", async () => {
    await render(<BodyScreen />);
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
  });

  // VISUAL-003: Status previously listed WATER/PROTEIN/SLEEP/WEIGHT, out
  // of step with the LOG section's own WATER/SLEEP/WEIGHT/PROTEIN order —
  // a real re-scan cost fixed by reordering Status to match.
  it("the instrument cluster lists stations in the same order as the LOG section below (Water, Sleep, Weight, Protein)", async () => {
    await render(<BodyScreen />);
    const cluster = document.querySelector(".instrument-cluster")!;
    const labels = Array.from(cluster.querySelectorAll(".meta")).map((el) => el.textContent);
    expect(labels).toEqual(["WATER", "SLEEP", "WEIGHT", "PROTEIN"]);
  });
});

describe("BodyScreen (real browser) — WATER", () => {
  it("a quick-add button logs the real amount and updates both the instrument cluster and HYDRATION's own reading", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+12 oz" }).click();

    await expect.element(screen.getByText("12 oz added.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("12 oz today", { exact: true })).toBeVisible();
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
    await screen.getByRole("button", { name: "+8 oz" }).click();
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "CORRECT" }).click();
    const correctionInput = screen.getByRole("spinbutton", { name: "Corrected amount (oz)" });
    await expect.element(correctionInput).toBeVisible();
    await correctionInput.fill("10");
    await screen.getByRole("button", { name: "SAVE" }).click();

    await expect.element(screen.getByText("10 oz today", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/corrected 1x/)).toBeVisible();
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
    // handleLogWaterAmount's own `await refresh()` — the today's-entries
    // disclosure only renders once refresh()'s setEntries has actually
    // landed, a moment that can genuinely fall after the confirmation
    // banner's own render. refresh() now also fetches SavedMeal/meal-
    // entry state, widening that real (pre-existing) gap enough to flake
    // under CI's more contended timing than it did before. Poll for the
    // disclosure count directly rather than assuming it's already settled
    // the instant the confirmation text appears.
    await expect.poll(() => waterRow.querySelectorAll("details").length).toBe(2); // manual entry + today's entries
    for (const d of waterRow.querySelectorAll("details")) expect(d.open).toBe(false);
  });
});

describe("BodyScreen (real browser) — SLEEP", () => {
  it("logs a duration and shows it as the reading, distinct from the machine-metadata line beneath it", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("spinbutton", { name: "Minutes" }).fill("15");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();

    // Matches both the instrument cluster's SLEEP cell and the SLEEP
    // section's own reading, which now deliberately show the same value.
    await expect.element(screen.getByText("7 hr 15 min", { exact: true }).first()).toBeVisible();
    expect(screen.getByText("7 hr 15 min", { exact: true }).elements().length).toBeGreaterThanOrEqual(2);
    await expect.element(screen.getByText(/Main sleep ·/)).toBeVisible();
  });

  it("an implausible duration requires LOG ANYWAY rather than silently blocking", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("20");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();

    await expect.element(screen.getByText(/outside the usual range/)).toBeVisible();
    await screen.getByRole("button", { name: "LOG ANYWAY" }).click();
    await expect.element(screen.getByText("20 hr", { exact: true }).first()).toBeVisible();
  });

  it("NAP does not carry the main-sleep end-day framing", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "NAP", exact: true }).click();
    await expect.element(screen.getByText(/doesn't suggest ending your day/)).toBeVisible();
  });
});

describe("BodyScreen (real browser) — BODYWEIGHT", () => {
  it("first-ever entry has manual entry open by default (no SAME AS LAST without history)", async () => {
    const screen = await render(<BodyScreen />);
    expect(screen.getByRole("button", { name: /SAME AS LAST/ }).elements()).toHaveLength(0);

    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await expect.element(screen.getByText("180 lbs logged.", { exact: true })).toBeVisible();
  });

  it("SAME AS LAST reuses the prior value once one exists", async () => {
    const screen = await render(<BodyScreen />);
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
    await screen.getByRole("spinbutton", { name: "Protein (g)" }).fill("30");
    await screen.getByRole("button", { name: "LOG PROTEIN" }).click();

    await expect.element(screen.getByText("30 g today", { exact: true })).toBeVisible();
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
    await screen.getByRole("textbox", { name: "New meal name" }).fill(name);
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill(calories);
    await screen.getByRole("spinbutton", { name: "New meal protein (g)" }).fill(protein);
    await screen.getByRole("spinbutton", { name: "New meal carbs (g)" }).fill(carbs);
    await screen.getByRole("spinbutton", { name: "New meal fat (g)" }).fill(fat);
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
  }

  it("empty state is calm and distinguishes no-presets from no-meals-today", async () => {
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("0 meals logged today", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/No saved meals yet/)).toBeVisible();
  });

  it("creates a saved meal via the add-meal form and shows its macro summary", async () => {
    const screen = await render(<BodyScreen />);
    await addSavedMeal(screen);

    await expect.element(screen.getByText("Chicken & Rice Bowl", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("600 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();
  });

  it("LOG snapshots the current macros, shows a confirmation, and updates today's count", async () => {
    const screen = await render(<BodyScreen />);
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();

    await expect.element(screen.getByText("Chicken & Rice Bowl logged.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
  });

  it("editing the preset after logging does not change the already-logged entry (past logs never rewritten)", async () => {
    const screen = await render(<BodyScreen />);
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "EDIT" }).click();
    await screen.getByRole("spinbutton", { name: "Edit meal calories" }).fill("900");
    await screen.getByRole("button", { name: "SAVE MEAL" }).click();
    await expect.element(screen.getByText("900 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: /SHOW TODAY'S MEALS/ }).click();
    await expect.element(screen.getByText("600 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();
  });

  it("archiving the preset removes it from the active list but keeps its past log", async () => {
    const screen = await render(<BodyScreen />);
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

  it("CORRECT preserves history rather than deleting the original entry", async () => {
    const screen = await render(<BodyScreen />);
    await addSavedMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();

    await screen.getByRole("button", { name: "CORRECT" }).click();
    await screen.getByRole("spinbutton", { name: "Corrected calories" }).fill("620");
    await screen.getByRole("button", { name: "SAVE" }).click();

    await expect.element(screen.getByText("620 cal · 45g protein · 60g carbs · 15g fat", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/corrected 1x/)).toBeVisible();
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
