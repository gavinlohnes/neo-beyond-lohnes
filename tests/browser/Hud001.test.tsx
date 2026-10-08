import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * HUD-001 (owner brief 2026-10-04): the HUD visual system. Black ground,
 * one red (#D0141B), text that passes WCAG AA, Weekly left as it was
 * until the F1 field-test review.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const ONE_RED = "208,20,27";

afterEach(() => {
  cleanup();
});

/** Every color an element paints with, as "r,g,b" strings (alpha dropped). */
function paintedColors(el: Element): string[] {
  const s = getComputedStyle(el);
  const values = [
    s.color, s.backgroundColor, s.borderTopColor, s.borderRightColor, s.borderBottomColor,
    s.borderLeftColor, s.outlineColor, s.fill, s.stroke, s.backgroundImage, s.boxShadow,
  ];
  const out: string[] = [];
  for (const v of values) {
    for (const m of v.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) {
      if (m[4] !== undefined && Number(m[4]) === 0) continue;
      out.push(`${m[1]},${m[2]},${m[3]}`);
    }
  }
  return out;
}

function isRed(rgb: string): boolean {
  const [r = 0, g = 0, b = 0] = rgb.split(",").map(Number);
  return r > 90 && r > g * 1.8 && r > b * 1.8;
}

/** Any red on screen other than the one red, with the class it came from. */
function strayReds(root: Element): string[] {
  const stray: string[] = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const rgb of paintedColors(el)) {
      if (isRed(rgb) && rgb !== ONE_RED) stray.push(`${el.tagName}.${el.getAttribute("class") ?? ""}: ${rgb}`);
    }
  }
  return stray;
}

async function contrastViolations(root: Element) {
  // Settle entrance animations first, so axe measures the resting colors.
  for (const animation of document.getAnimations()) animation.finish();
  const results = await axe.run(root, { runOnly: { type: "rule", values: ["color-contrast"] } });
  return results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} ${JSON.stringify(n.any[0]?.data)}`));
}

describe("HUD-001 — HUD design system", () => {
  it("the ground is black and the primary action is the one red", async () => {
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "START DAY", exact: true })).toBeVisible();
    expect(getComputedStyle(document.body).backgroundColor).toBe("rgb(0, 0, 0)");
    const start = screen.getByRole("button", { name: "START DAY", exact: true }).element();
    expect(getComputedStyle(start).backgroundColor).toBe(`rgb(${ONE_RED.replace(/,/g, ", ")})`);
  });

  it("cards and buttons carry cut corners; section frames carry bracket ticks", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    for (const sel of [".btn-secondary", ".btn-primary"]) {
      const el = document.querySelector(sel);
      if (el) expect(getComputedStyle(el).clipPath, sel).toMatch(/^polygon/);
    }
    // TODAY's guidance now has its own region rather than sharing the
    // check-in parent. Verify the same shared frame geometry on MORE's
    // actual consecutive capability rows, not accidental TODAY siblings.
    const system = await render(<MoreScreen />);
    await expect.element(system.getByRole("button", { name: "Open HISTORY" })).toBeVisible();
    const rows = system.container.querySelectorAll(".equipment-row:not(:first-child)");
    const row = rows[0];
    expect(row).toBeDefined();
    expect(getComputedStyle(row!).backgroundImage).toMatch(/linear-gradient/);
    expect(getComputedStyle(row!).borderTopWidth).toBe("1px");
  });

  it("TODAY (GREEN and RED) uses only the one red and passes AA contrast", async () => {
    for (const values of [GREEN, RED]) {
      const day = await startDay();
      await submitCheckIn(day.id, values);
      const screen = await render(<TodayScreen />);
      await expect.element(screen.getByRole("heading", { level: 1 }).first()).toBeInTheDocument();
      await expect.poll(() => document.querySelector(".status-strip")).not.toBeNull();
      expect(strayReds(screen.container)).toEqual([]);
      expect(await contrastViolations(screen.container)).toEqual([]);
      cleanup();
    }
  });

  it("TRAIN uses only the one red and passes AA contrast", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    expect(strayReds(screen.container)).toEqual([]);
    expect(await contrastViolations(screen.container)).toEqual([]);
  });

  it("BODY uses only the one red and passes AA contrast", async () => {
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("HYDRATION", { exact: true })).toBeVisible();
    expect(strayReds(screen.container)).toEqual([]);
    expect(await contrastViolations(screen.container)).toEqual([]);
  });

  it("MORE uses only the one red and passes AA contrast", async () => {
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("button", { name: "Open MISSIONS & OBLIGATIONS" })).toBeVisible();
    expect(strayReds(screen.container)).toEqual([]);
    expect(await contrastViolations(screen.container)).toEqual([]);
  });

  it("Weekly keeps its pre-HUD ground, faces and corners until the F1 review", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open WEEKLY CHECK-IN" }).click();
    await expect.element(screen.getByText("MORE // WEEKLY CHECK-IN", { exact: true })).toBeVisible();
    const weekly = document.querySelector(".hud-legacy")!;
    expect(weekly).not.toBeNull();
    expect(getComputedStyle(weekly).backgroundColor).toBe("rgb(10, 10, 10)");
    expect(getComputedStyle(document.body).backgroundColor).toBe("rgb(10, 10, 10)");
    expect(getComputedStyle(weekly.querySelector(".meta")!).fontFamily).toMatch(/IBM Plex Sans/);
    expect(getComputedStyle(weekly.querySelector(".eyebrow")!).fontFamily).toMatch(/IBM Plex Mono/);
    const back = screen.getByRole("button", { name: "← BACK TO MORE" }).element();
    expect(getComputedStyle(back).clipPath).toBe("none");
    expect(getComputedStyle(back).borderTopLeftRadius).toBe("4px");
  });
});
