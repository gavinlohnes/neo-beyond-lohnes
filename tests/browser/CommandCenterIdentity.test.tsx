import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { ModeHeader } from "../../src/ui/screens/today/ModeHeader";
import { SuitMode } from "../../src/ui/screens/today/ModeIdentity";
import { deriveLivedDayStrip, MODE_ORDER } from "../../src/ui/screens/today/shiftClock";

const start = new Date(2026, 9, 12, 16, 30);
const now = new Date(2026, 9, 12, 22);
const strip = deriveLivedDayStrip({ dayStart: start, dayEnd: new Date(2026, 9, 13, 16, 30), now, workContext: "WORK", shiftWindow: { start: new Date(2026, 9, 12, 18), end: new Date(2026, 9, 13, 6) }, workEndedAt: null, mainSleepRecordedAt: [] });
afterEach(cleanup);

describe("Command Center identity", () => {
  it("holds contrast and layout in every suit at each phone width; pins do not move the sky", async () => {
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      for (const mode of MODE_ORDER) {
        const screen = await render(<div className="screen"><SuitMode mode={mode} /><ModeHeader now={now} hasAction={false} scheduledPhase="SCHEDULED_SHIFT" pin={mode} strip={strip} dayStart={start} dayOff={false} busy={false} onPin={() => {}} /></div>);
        await expect.poll(() => document.documentElement.dataset.suitMode).toBe(mode);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        // The real clock (22:00) sets the sky; the pin only changes the suit around it.
        expect(getComputedStyle(screen.container.querySelector(".cc-sky")!).opacity).toBe("1");
        expect(screen.container.querySelector(".cc-beam")).toBeNull();
        const target = screen.getByRole("button", { name: /Change mode/ }).element().getBoundingClientRect();
        expect(target.height).toBeGreaterThanOrEqual(44);
        const result = await axe.run(screen.container, { runOnly: { type: "rule", values: ["color-contrast", "button-name"] } });
        expect(result.violations).toEqual([]);
        await screen.unmount();
      }
    }
  });
});
