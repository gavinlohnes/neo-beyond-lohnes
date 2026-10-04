import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { FieldDisclosure } from "../../src/ui/components/FieldDisclosure";
import { positionRevealedSurface } from "../../src/ui/navigationPosition";

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
  afterEach(() => vi.restoreAllMocks());

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

  it("brings a representative BODY-style disclosure surface inside a phone viewport", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ paddingTop: 1200, paddingBottom: 1200 }}>
        <Harness />
      </div>,
    );
    const toggle = screen.getByRole("button", { name: "SHOW THING" }).element();
    window.scrollTo(0, toggle.getBoundingClientRect().top + window.scrollY - 760);
    (toggle as HTMLElement).click();

    const content = screen.getByText("Hidden content").element().parentElement!;
    await expect.element(screen.getByText("Hidden content")).toBeVisible();
    await expect.poll(() => content.getBoundingClientRect().top).toBeLessThan(window.innerHeight - 88);
  });

  it("uses immediate positioning under reduced motion without disabling the reveal", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    const target = document.createElement("div");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 900 } as DOMRect);

    positionRevealedSurface(target);

    expect(scrollBy).toHaveBeenCalledWith({ top: 888, left: 0, behavior: "auto" });
  });
});
