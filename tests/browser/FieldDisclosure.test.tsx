import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { FieldDisclosure } from "../../src/ui/components/FieldDisclosure";

/**
 * VISUAL-003 (BODY Field Instrument): FieldDisclosure formalizes the
 * "SHOW X / HIDE X" toggle-a-boolean-plus-conditionally-render pattern
 * that BODY's manual-entry and today's-entries sections each hand-rolled
 * seven times before this component existed. Covered directly, the way
 * SignalRow/CollapsibleRow are covered outside their own screen's tests.
 */
function Harness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <FieldDisclosure summary={open ? "HIDE THING" : "SHOW THING"} open={open} onToggle={setOpen}>
      <p>Hidden content</p>
    </FieldDisclosure>
  );
}

describe("FieldDisclosure (real browser)", () => {
  it("is closed by default, opens on click, and exposes a real button-role toggle", async () => {
    const screen = await render(<Harness />);

    await expect.element(screen.getByText("Hidden content")).not.toBeVisible();
    const toggle = screen.getByRole("button", { name: "SHOW THING" });
    expect(toggle.element().tagName).toBe("SUMMARY");

    await toggle.click();
    await expect.element(screen.getByText("Hidden content")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "HIDE THING" })).toBeVisible();
  });

  it("is a real, tab-reachable focusable control (native <summary> keyboard operability, not a div-with-onClick)", async () => {
    const screen = await render(<Harness />);
    const toggle = screen.getByRole("button", { name: "SHOW THING" }).element() as HTMLElement;
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it("can be forced open externally via the open prop (e.g. a just-logged CORRECT action)", async () => {
    const screen = await render(<Harness initialOpen={true} />);
    await expect.element(screen.getByText("Hidden content")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "HIDE THING" })).toBeVisible();
  });
});
