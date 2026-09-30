import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { HoldButton } from "../../src/ui/components/HoldButton";
import { holdToConfirm } from "./helpers/hold";

/** Drop 4: hold-to-confirm for big moments (ROADMAP 1.0 design rule). */
describe("HoldButton (real browser)", () => {
  afterEach(() => {
    cleanup();
  });

  it("confirms after a full press-and-hold", async () => {
    const onConfirm = vi.fn();
    const screen = await render(<HoldButton onConfirm={onConfirm}>FINISH</HoldButton>);
    await holdToConfirm(screen.getByRole("button", { name: "FINISH" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("a quick tap confirms nothing and shows the hint", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <HoldButton onConfirm={onConfirm} hint="Hold to finish.">
        FINISH
      </HoldButton>,
    );
    await screen.getByRole("button", { name: "FINISH" }).click();
    await expect.element(screen.getByText("Hold to finish.", { exact: true })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("letting go early cancels", async () => {
    const onConfirm = vi.fn();
    const screen = await render(<HoldButton onConfirm={onConfirm}>FINISH</HoldButton>);
    await holdToConfirm(screen.getByRole("button", { name: "FINISH" }), 300);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("holding Space from the keyboard confirms", async () => {
    const onConfirm = vi.fn();
    const screen = await render(<HoldButton onConfirm={onConfirm}>FINISH</HoldButton>);
    (screen.getByRole("button", { name: "FINISH" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{ >5}");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await userEvent.keyboard("{/ }");
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("tells assistive tech to press and hold, and does nothing while disabled", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <HoldButton onConfirm={onConfirm} disabled>
        FINISH
      </HoldButton>,
    );
    await expect.element(screen.getByRole("button", { name: "FINISH" })).toHaveAccessibleDescription("Press and hold to confirm.");
    const el = screen.getByRole("button", { name: "FINISH" }).element() as HTMLElement;
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
