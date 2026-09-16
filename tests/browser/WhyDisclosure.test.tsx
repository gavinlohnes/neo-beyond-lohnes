import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { WhyDisclosure } from "../../src/ui/components/WhyDisclosure";

/**
 * DEPTH-001: the shared WHY/diagnostic disclosure wrapper. The real
 * content's visibility (native <details> semantics) is asserted to be
 * completely independent of the "exposed machinery" reveal — the reveal
 * is a portal-rendered, aria-hidden decoration layered on top, never a
 * gate on what a test or a screen reader can see.
 */
afterEach(() => {
  cleanup();
  document.querySelectorAll(".machinery-reveal-overlay").forEach((el) => el.remove());
});

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

  it("mounts a full-viewport, aria-hidden reveal overlay on open (motion allowed)", async () => {
    const screen = await render(
      <WhyDisclosure summary="Diagnostic detail">
        <p>Days: 214</p>
      </WhyDisclosure>,
    );
    expect(document.querySelector(".machinery-reveal-overlay")).toBeNull();
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    const overlay = document.querySelector(".machinery-reveal-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");
  });

  it("unmounts the reveal overlay when closed again", async () => {
    const screen = await render(
      <WhyDisclosure summary="Exercise detail">
        <p>Bench press</p>
      </WhyDisclosure>,
    );
    const summary = screen.getByText("Exercise detail", { exact: true });
    await summary.click();
    expect(document.querySelector(".machinery-reveal-overlay")).not.toBeNull();
    await summary.click();
    expect(document.querySelector(".machinery-reveal-overlay")).toBeNull();
  });

  it("skips the reveal overlay entirely when prefers-reduced-motion is set, without affecting content visibility", async () => {
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const screen = await render(
      <WhyDisclosure summary="Why this suggestion">
        <p>STANDARD suggested</p>
      </WhyDisclosure>,
    );
    await screen.getByText("Why this suggestion", { exact: true }).click();
    await expect.element(screen.getByText("STANDARD suggested")).toBeVisible();
    expect(document.querySelector(".machinery-reveal-overlay")).toBeNull();
    matchMediaSpy.mockRestore();
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
