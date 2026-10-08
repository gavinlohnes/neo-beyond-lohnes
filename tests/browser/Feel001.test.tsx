import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { useState } from "react";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { HoldButton } from "../../src/ui/components/HoldButton";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { TickNumber } from "../../src/ui/feel/TickNumber";
import { App } from "../../src/app/App";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";
import { holdToConfirm } from "./helpers/hold";

/** FEEL-001: haptics on state changes, press states, ticking numbers, tab transitions. */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function cssRules(): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) if (rule instanceof CSSStyleRule) rules.push(rule);
  }
  return rules;
}

describe("FEEL-001", () => {
  it("a completed hold-to-confirm taps once; a quick tap doesn't", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockReturnValue(true);
    const onConfirm = vi.fn();
    const screen = await render(<HoldButton onConfirm={onConfirm}>FINISH</HoldButton>);
    await screen.getByRole("button", { name: "FINISH" }).click();
    expect(vibrate).not.toHaveBeenCalled();
    await holdToConfirm(screen.getByRole("button", { name: "FINISH" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it("LOG taps once when the set is saved; a refused LOG (no reps) doesn't", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockReturnValue(true);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await screen.getByRole("button", { name: "LOG" }).first().click();
    expect(vibrate).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }), "100");
    await userEvent.type(screen.getByRole("spinbutton", { name: "Set 1 repetitions" }), "8");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 100 lb x 8", { exact: true })).toBeVisible();
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it("without the Vibration API (iPhone), confirming still works and nothing is shown", async () => {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "vibrate");
    Object.defineProperty(Navigator.prototype, "vibrate", { value: undefined, configurable: true });
    try {
      const onConfirm = vi.fn();
      const screen = await render(<HoldButton onConfirm={onConfirm}>FINISH</HoldButton>);
      await holdToConfirm(screen.getByRole("button", { name: "FINISH" }));
      expect(onConfirm).toHaveBeenCalledOnce();
    } finally {
      if (original) Object.defineProperty(Navigator.prototype, "vibrate", original);
    }
  });

  it("every enabled button has a press state", async () => {
    await render(<button type="button">X</button>);
    const press = cssRules().find((r) => r.selectorText === "button:not(:disabled):active");
    expect(press).toBeDefined();
    expect(press!.style.transform).toContain("scale");
    // Brighter face for every button except the red filled ones, which keep their darker press.
    const brighter = cssRules().find((r) => r.selectorText === "button:not(:disabled):not(.btn-primary):not(.btn-danger):active");
    expect(brighter!.style.filter).toContain("brightness(1.35)");
    const red = cssRules().filter((r) => r.selectorText === ".btn-primary:active");
    expect(red.some((r) => r.style.filter.includes("brightness(0.9)"))).toBe(true);
  });

  it("a number counts to its new value and lands exactly on it", async () => {
    function Harness() {
      const [n, setN] = useState(10);
      return (
        <>
          <TickNumber value={n} />
          <button type="button" onClick={() => setN(90)}>ADD</button>
        </>
      );
    }
    const screen = await render(<Harness />);
    await expect.element(screen.getByText("10", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "ADD" }).click();
    await expect.element(screen.getByText("90", { exact: true })).toBeVisible();
  });

  it("tab changes animate in 150–250 ms, and are instant with reduced motion", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    const wrapper = document.querySelector(".tab-enter")!;
    const duration = parseFloat(getComputedStyle(wrapper).animationDuration) * 1000;
    expect(duration).toBeGreaterThanOrEqual(150);
    expect(duration).toBeLessThanOrEqual(250);

    // Reduced motion: the global rule makes every animation and transition instant.
    const reduced = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-reduced-motion: reduce"))
      .flatMap((rule) => Array.from(rule.cssRules) as CSSStyleRule[])
      .find((rule) => rule.selectorText === "*");
    expect(reduced?.style.getPropertyValue("animation-duration")).toBe("0.01ms");
    expect(reduced?.style.getPropertyValue("transition-duration")).toBe("0.01ms");
  });
});
