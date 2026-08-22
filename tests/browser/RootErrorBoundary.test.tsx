import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { RootErrorBoundary } from "../../src/ui/components/RootErrorBoundary";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";

/**
 * Leverage Implementation 002 — root error containment (2026-08-22).
 * Real-Chromium coverage for the single new component this checkpoint
 * adds. React itself also logs a caught render error to the console by
 * design (independent of RootErrorBoundary's own componentDidCatch) —
 * that output is expected here, not suppressed, since it's genuinely
 * happening and not a signal of test failure.
 */

function Boom(): never {
  throw new Error("deliberate test failure");
}

afterEach(() => {
  cleanup();
});

describe("RootErrorBoundary (real browser)", () => {
  it("renders the BEYOND-styled fallback instead of a blank tree when a child throws during render", async () => {
    const screen = await render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );

    await expect.element(screen.getByText("Something went wrong", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/BEYOND encountered an application error/)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "TRY AGAIN" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RELOAD APP" })).toBeVisible();
  });

  it("does not render its children's real content while the fallback is showing", async () => {
    const screen = await render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );
    // A blank tree is exactly what this checkpoint exists to prevent —
    // confirm something is actually there, not an empty container.
    expect(screen.container.textContent).not.toBe("");
    expect(screen.container.querySelector(".card")).not.toBeNull();
  });

  it("TRY AGAIN resets the boundary and renders children again once they no longer throw", async () => {
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error("deliberate test failure");
      return <p>Recovered</p>;
    }

    const screen = await render(
      <RootErrorBoundary>
        <MaybeBoom />
      </RootErrorBoundary>,
    );
    await expect.element(screen.getByText("Something went wrong", { exact: true })).toBeVisible();

    shouldThrow = false;
    await screen.getByRole("button", { name: "TRY AGAIN" }).click();

    await expect.element(screen.getByText("Recovered", { exact: true })).toBeVisible();
  });

  it("axe finds no violations on the fallback beyond the known color-contrast exception", async () => {
    const screen = await render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );
    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("does not clear persisted BEYOND data when the boundary catches an error or the operator retries", async () => {
    const day = await startDay();
    expect(await db.beyondDays.get(day.id)).toBeDefined();

    const screen = await render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );
    await expect.element(screen.getByText("Something went wrong", { exact: true })).toBeVisible();
    // The crash and its recovery UI are unrelated to persistence —
    // confirm the real BeyondDay written just before the crash survives
    // both the catch itself and the retry action.
    expect(await db.beyondDays.get(day.id)).toBeDefined();

    await screen.getByRole("button", { name: "TRY AGAIN" }).click();
    expect(await db.beyondDays.get(day.id)).toBeDefined();
  });
});
