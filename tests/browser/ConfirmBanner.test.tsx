import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { ConfirmBanner } from "../../src/ui/components/ConfirmBanner";

describe("ConfirmBanner (real browser)", () => {
  it("renders the message and an action button, and fires onAction when tapped", async () => {
    const onAction = vi.fn();
    const screen = await render(
      <ConfirmBanner message="17 oz added." actionLabel="CORRECT" onAction={onAction} />,
    );

    await expect.element(screen.getByText("17 oz added.")).toBeVisible();
    const button = screen.getByRole("button", { name: "CORRECT" });
    await expect.element(button).toBeVisible();

    await button.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("disables the action button when disabled is true", async () => {
    const onAction = vi.fn();
    const screen = await render(
      <ConfirmBanner message="Resolved &quot;test&quot;" actionLabel="UNDO" onAction={onAction} disabled divider />,
    );
    const button = screen.getByRole("button", { name: "UNDO" });
    await expect.element(button).toBeDisabled();
  });

  it("meets the 44px minimum interactive target", async () => {
    const screen = await render(
      <ConfirmBanner message="Sleep saved as 7 hr 15 min." actionLabel="CORRECT" onAction={() => {}} />,
    );
    const button = screen.getByRole("button", { name: "CORRECT" });
    const rect = button.element().getBoundingClientRect();
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });
});
