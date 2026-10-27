import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { WhyDisclosure } from "../../src/ui/components/WhyDisclosure";

/**
 * DEPTH-001: the shared WHY/diagnostic disclosure wrapper — plain native <details>. The full-screen
 * circuit reveal it once mounted was removed 2026-10-27 at the owner's direction; this guards that it
 * stays gone and that the real content opens inline, immediately.
 */
afterEach(() => cleanup());

describe("WhyDisclosure (real browser)", () => {
  it("real content becomes visible immediately on open, same as a plain <details>", async () => {
    const screen = await render(
      <WhyDisclosure summary="How BEYOND decided">
        <p>State input: Yes</p>
      </WhyDisclosure>,
    );
    await screen.getByText("How BEYOND decided", { exact: true }).click();
    await expect.element(screen.getByText("State input: Yes")).toBeVisible();
  });

  it("opens and closes inline with no full-screen overlay", async () => {
    const screen = await render(
      <WhyDisclosure summary="Diagnostic detail">
        <p>Days: 214</p>
      </WhyDisclosure>,
    );
    const summary = screen.getByText("Diagnostic detail", { exact: true });
    await summary.click();
    await expect.element(screen.getByText("Days: 214")).toBeVisible();
    expect(document.querySelector(".machinery-reveal-overlay")).toBeNull();
    expect(document.body.querySelector(":scope > [aria-hidden='true'] svg")).toBeNull();
    await summary.click();
    expect(document.querySelector("details[open]")).toBeNull();
  });

  it("passes the accessible name through to the underlying <details> control unchanged", async () => {
    const screen = await render(
      <WhyDisclosure summary="How BEYOND decided">
        <p>content</p>
      </WhyDisclosure>,
    );
    const summaryEl = screen.getByText("How BEYOND decided", { exact: true }).element();
    expect(summaryEl.tagName).toBe("SUMMARY");
    expect(summaryEl.closest("details")).not.toBeNull();
  });
});
