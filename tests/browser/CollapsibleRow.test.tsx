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
});
