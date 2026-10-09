/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { OperatorHeader } from "../../src/ui/components/OperatorHeader";
import { Readout, ReadoutGrid } from "../../src/ui/components/ReadoutGrid";

afterEach(() => {
  cleanup();
});

describe.sequential("shared operator presentation primitives", () => {
  it("keeps the destination identity as one real heading with a reinforcing hidden glyph", async () => {
    const screen = await render(<OperatorHeader destination="body">BODY // DAILY RECORD</OperatorHeader>);
    const heading = screen.getByRole("heading", { level: 1, name: "BODY // DAILY RECORD" }).element();

    expect(heading.className).toContain("eyebrow");
    expect(heading.closest(".field-header")).not.toBeNull();
    expect(heading.previousElementSibling?.getAttribute("aria-hidden")).toBe("true");
  });

  it("retains explicit focus handoff without making every identity heading tabbable", async () => {
    const daily = await render(<OperatorHeader destination="body" headingId="daily-heading" focusable>BODY // DAILY RECORD</OperatorHeader>);
    expect(daily.getByRole("heading", { name: "BODY // DAILY RECORD" }).element().tabIndex).toBe(-1);
    cleanup();
    const today = await render(<OperatorHeader destination="mission">BEYOND // TODAY</OperatorHeader>);
    expect(today.getByRole("heading", { name: "BEYOND // TODAY" }).element().getAttribute("tabindex")).toBeNull();
  });

  it("keeps long truthful readouts readable without horizontal overflow at 320/360/412px", async () => {
    await render(
      <>
        {[320, 360, 412].map((width) => <main className="screen test-width" style={{ width }} key={width}>
          <OperatorHeader destination="body">BODY // DAILY RECORD</OperatorHeader>
          <ReadoutGrid emphasis="primary">
            <Readout label="CALORIES" value={<>2,450<span> kcal</span></>} detail="Logged from meals · no calorie target" />
            <Readout label="PROTEIN" value={<>185<span> g</span></>} detail="185 of 200 g" />
          </ReadoutGrid>
          <ReadoutGrid>
            <Readout label="LAST WEIGHT" value="Not logged" detail="Whenever it suits you" />
            <Readout label="MAIN SLEEP" value="10 hr 59 min" detail="Latest of 12 main-sleep records" />
          </ReadoutGrid>
        </main>)}
      </>,
    );
    await document.fonts.ready;
    for (const surface of document.querySelectorAll<HTMLElement>(".test-width")) {
      expect(surface.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
      const primaryValue = surface.querySelector<HTMLElement>(".readout__value")!;
      expect(primaryValue.className).toContain("readout__value");
      expect(parseFloat(getComputedStyle(primaryValue).fontSize)).toBeGreaterThanOrEqual(24);
    }
    expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });

  it("does not introduce motion when reduced motion is requested", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await render(
      <div className="screen">
        <OperatorHeader destination="train">BEYOND // TRAIN</OperatorHeader>
        <ReadoutGrid><Readout label="STATUS" value="Ready" /></ReadoutGrid>
      </div>,
    );
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    expect(document.getAnimations()).toHaveLength(0);
  });
});
