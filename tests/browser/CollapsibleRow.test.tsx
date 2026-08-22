import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { CollapsibleRow } from "../../src/ui/components/CollapsibleRow";

/**
 * Harvest Checkpoint 4: first real-browser acceptance test — actual
 * Chromium via Playwright, not jsdom/happy-dom simulation. Kept small
 * and focused on the two primitives Checkpoint 1 extracted.
 */
describe("CollapsibleRow (real browser)", () => {
  it("renders the name, summary, and an OPEN button with an unambiguous accessible name", async () => {
    const onOpen = vi.fn();
    const screen = await render(<CollapsibleRow name="RESET" summary="Quick reset." onOpen={onOpen} />);

    await expect.element(screen.getByText("RESET", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Quick reset.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open RESET" })).toBeVisible();
  });

  it("calls onOpen exactly once when tapped", async () => {
    const onOpen = vi.fn();
    const screen = await render(<CollapsibleRow name="SHIFT DOWN" summary="Wind down." onOpen={onOpen} />);

    await screen.getByRole("button", { name: "Open SHIFT DOWN" }).click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("meets the 44px minimum interactive target", async () => {
    const screen = await render(<CollapsibleRow name="WORK CONTEXT" summary="Off today." onOpen={() => {}} />);
    const button = screen.getByRole("button", { name: "Open WORK CONTEXT" });
    await expect.element(button).toBeVisible();
    const rect = button.element().getBoundingClientRect();
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });

  it("gives two rows on the same screen distinct accessible names", async () => {
    const screen = await render(
      <>
        <CollapsibleRow name="RESET" summary="Quick reset." onOpen={() => {}} />
        <CollapsibleRow name="SHIFT DOWN" summary="Wind down." onOpen={() => {}} />
      </>,
    );
    await expect.element(screen.getByRole("button", { name: "Open RESET" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open SHIFT DOWN" })).toBeVisible();
  });

  /**
   * FIELD ALPHA Phase 1: the collapsed row itself is now the control —
   * a small rectangular "OPEN" button bolted onto a static row read as
   * a generic web-app pattern, so the whole row became a real <button>
   * styled as .equipment-row (matching every other TOOLS-tier surface),
   * with .tool-label replacing .eyebrow (now reserved for identity/
   * RED-authority text) and a lean disclosure chevron replacing the
   * boxed secondary button.
   */
  it("is a single button covering the whole row (Suit grammar: .equipment-row + .tool-label, not .card + .eyebrow)", async () => {
    const screen = await render(<CollapsibleRow name="RESET" summary="Quick reset." onOpen={() => {}} />);
    const button = screen.getByRole("button", { name: "Open RESET" }).element();

    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("equipment-row");
    expect(button.className).not.toContain("card");
    expect(button.querySelector(".tool-label")).not.toBeNull();
    expect(button.querySelector(".eyebrow")).toBeNull();
  });

  it("opens when the summary text itself is tapped, not only some inner sub-element", async () => {
    const onOpen = vi.fn();
    const screen = await render(<CollapsibleRow name="RESET" summary="Quick reset." onOpen={onOpen} />);
    await screen.getByText("Quick reset.").click();
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
