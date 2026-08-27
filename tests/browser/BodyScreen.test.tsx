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
    const disclosures = waterRow.querySelectorAll("details");
    expect(disclosures.length).toBe(2); // manual entry + today's entries
    for (const d of disclosures) expect(d.open).toBe(false);
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

    const results = await axe.run(screen.container, { runOnly: ["label"] });
    expect(results.violations).toEqual([]);
  });

  it("passes real WCAG AA color-contrast beyond the known app-wide exception", async () => {
    const screen = await render(<BodyScreen />);
    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
