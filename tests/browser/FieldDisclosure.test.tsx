/// <reference types="@vitest/browser-playwright" />
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, page } from "vitest/browser";
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

function TallHarness() {
  const [open, setOpen] = useState(false);
  return (
    <FieldDisclosure summary={open ? "HIDE FORM" : "SHOW FORM"} open={open} onToggle={setOpen}>
      <div data-testid="tall-content" style={{ height: 120 }}>Form</div>
    </FieldDisclosure>
  );
}

// Stands in for App's fixed bottom nav as an iPhone home-screen app draws
// it: 64px of buttons plus a 34px home-indicator safe area.
function FakeShellNav() {
  return <nav className="shell-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 98 }} />;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

describe("FieldDisclosure (real browser)", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    window.scrollTo(0, 0);
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  });

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

  it("leaves content that opens fully in view where it is", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ paddingTop: 100, paddingBottom: 2000 }}>
        <Harness />
      </div>,
    );
    (screen.getByRole("button", { name: "SHOW THING" }).element() as HTMLElement).click();
    await expect.element(screen.getByText("Hidden content")).toBeVisible();
    await nextFrame();
    await nextFrame();
    expect(window.scrollY).toBe(0);
  });

  it("shows the whole revealed surface above the bottom nav, safe area included", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ paddingTop: 1200, paddingBottom: 1200 }}>
        <TallHarness />
        <FakeShellNav />
      </div>,
    );
    const toggle = screen.getByRole("button", { name: "SHOW FORM" }).element();
    // Content opens with its top just above where a fixed 88px inset would
    // end, but its body would sit under the taller real nav.
    window.scrollTo(0, toggle.getBoundingClientRect().top + window.scrollY - 640);
    (toggle as HTMLElement).click();

    const content = screen.getByTestId("tall-content").element();
    await expect.element(screen.getByTestId("tall-content")).toBeVisible();
    const navTop = document.querySelector(".shell-nav")!.getBoundingClientRect().top;
    await expect.poll(() => content.getBoundingClientRect().bottom).toBeLessThanOrEqual(navTop + 1);
    expect(content.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
  });

  it("under a real reduced-motion preference, positions immediately instead of animating", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    await page.viewport(390, 844);
    const scrollBy = vi.spyOn(window, "scrollBy");
    const screen = await render(
      <div style={{ paddingTop: 1200, paddingBottom: 1200 }}>
        <TallHarness />
        <FakeShellNav />
      </div>,
    );
    const toggle = screen.getByRole("button", { name: "SHOW FORM" }).element();
    window.scrollTo(0, toggle.getBoundingClientRect().top + window.scrollY - 760);
    (toggle as HTMLElement).click();
    await expect.element(screen.getByTestId("tall-content")).toBeVisible();
    await expect.poll(() => scrollBy.mock.calls.length).toBe(1);

    // No polling for the final position: an instant scroll is already done.
    const content = screen.getByTestId("tall-content").element();
    const navTop = document.querySelector(".shell-nav")!.getBoundingClientRect().top;
    expect(scrollBy.mock.calls[0]![0]).toMatchObject({ behavior: "auto" });
    expect(content.getBoundingClientRect().bottom).toBeLessThanOrEqual(navTop + 1);
    expect(content.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
  });
});
