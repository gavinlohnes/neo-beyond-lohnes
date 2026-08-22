import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, submitCheckIn, startShiftDown, captureItem, logSleep } from "../../src/application/commands";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * Harvest Checkpoint 7 (cohesion + phone hardening). Scoped to what a
 * real browser can automate cheaply and honestly: console-error
 * capture across TODAY's real states, and structural presence of the
 * two CSS mechanisms (:focus-visible, prefers-reduced-motion) that
 * genuinely can't be verified equally well outside a real browser.
 *
 * NOT automated here, and not claimed as verified — reviewed statically
 * instead, per the release report: on-screen-keyboard appearance,
 * offline network behavior, and installed-PWA (standalone display)
 * behavior. None of the available browser-mode APIs expose Playwright's
 * lower-level page/keyboard/network-emulation primitives, and forcing
 * them in would mean fighting the test architecture for marginal value
 * — exactly what this checkpoint says not to do.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

let consoleErrors: unknown[];
let restoreConsoleError: () => void;

beforeEach(() => {
  consoleErrors = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    original(...args);
  };
  restoreConsoleError = () => {
    console.error = original;
  };
});

afterEach(() => {
  cleanup();
  restoreConsoleError();
});

describe("console cleanliness (real browser)", () => {
  it("App shell (bottom nav, all 4 destinations) renders with no console errors", async () => {
    await render(<App />);
    expect(consoleErrors).toEqual([]);
  });

  it("TodayScreen renders with no console errors in the ordinary/quiet state", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("TodayScreen renders with no console errors with an active SHIFT DOWN + unresolved Capture + a logged sleep", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startShiftDown(day.id, 10);
    await captureItem("something captured");
    await logSleep(day.id, 420, "PRIMARY");

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

describe("motion/focus CSS mechanisms are actually present (real browser)", () => {
  function findRule(predicate: (rule: CSSRule) => boolean): CSSRule | undefined {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin sheets throw on access; none are expected here
      }
      for (const rule of Array.from(rules)) {
        if (predicate(rule)) return rule;
        // prefers-reduced-motion lives inside an @media block — check its inner rules too.
        if (rule instanceof CSSMediaRule) {
          for (const inner of Array.from(rule.cssRules)) {
            if (predicate(inner)) return inner;
          }
        }
      }
    }
    return undefined;
  }

  it("declares a prefers-reduced-motion: reduce override", async () => {
    await render(<TodayScreen />);
    const mediaRule = findRule(
      (rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.media.mediaText.includes("prefers-reduced-motion"),
    );
    expect(mediaRule).toBeTruthy();
  });

  it("declares a :focus-visible outline rule", async () => {
    await render(<TodayScreen />);
    const rule = findRule(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === ":focus-visible",
    );
    expect(rule).toBeTruthy();
    expect((rule as CSSStyleRule).style.outlineStyle || (rule as CSSStyleRule).style.outline).toBeTruthy();
  });
});

describe("narrow phone widths — App shell", () => {
  it.each([320, 360, 375])("bottom nav shows all 4 destinations with no horizontal overflow at %ipx", async (width) => {
    await page.viewport(width, 800);
    const screen = await render(<App />);

    for (const label of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await expect.element(screen.getByText(label, { exact: true })).toBeVisible();
    }
    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});
