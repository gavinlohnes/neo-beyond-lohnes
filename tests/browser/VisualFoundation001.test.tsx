import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { Droplet, Scale } from "lucide-react";
import "../../src/ui/styles/fonts";
import { CommandBar, Meter, Panel, SourceTag, Sparkline } from "../../src/ui/foundation/primitives";

/**
 * VISUAL-FOUNDATION-001 (Gavin, 2026-11-14): BEYOND's shared primitives work on their own, outside BODY: the panel
 * names itself and keeps its controls reachable, source tags tell your logs from Garmin's, a meter shows a track only
 * against a target you set, a sparkline needs two readings, and the command bar has one labelled action. BODY's own
 * pixels are proven unchanged by BodyDash001's screenshots.
 */
afterEach(async () => { await cleanup(); });

function Sheet({ onOpen, onAdd, onLog }: { onOpen: () => void; onAdd: () => void; onLog: () => void }) {
  return (
    <div className="bf" style={{ background: "#000", padding: 16, width: 360, display: "grid", gap: 8 }}>
      <CommandBar eyebrow="TEST // FOUNDATION" context={<p className="bf-bar__day"><span className="bf-bar__date">SAT, NOV 14</span></p>}
        action={{ text: "LOG", label: "Log a record", onClick: onLog }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <Panel headingId="t-water" primary wide icon={<Droplet size={18} />} label="HYDRATION" source={<SourceTag>LOGGED</SourceTag>} onOpen={onOpen} openLabel="Open water history">
          <p className="bf-value bf-value--xl">32<small> oz</small></p>
          <Sparkline values={[1, 3, null, 2, 5]} tone="own" />
        </Panel>
        <Panel headingId="t-weight" icon={<Scale size={18} />} label="WEIGHT" source={<SourceTag garmin>GARMIN</SourceTag>} action={{ label: "Log weight", onClick: onAdd }} data={{ "data-t": "weight" }}>
          <Meter label="Eaten" value={1200} of={2400} unit="kcal" />
          <Meter label="Protein" value={80} unit="g" />
          <Sparkline values={[4]} tone="garmin" />
        </Panel>
      </div>
    </div>
  );
}

it("the foundation's primitives render, name themselves and stay accessible on their own", async () => {
  const onOpen = vi.fn(), onAdd = vi.fn(), onLog = vi.fn();
  const screen = await render(<Sheet onOpen={onOpen} onAdd={onAdd} onLog={onLog} />);
  await expect.element(page.getByRole("article", { name: "HYDRATION" })).toBeVisible();
  const weight = document.querySelector<HTMLElement>('[data-t="weight"]')!;
  expect(weight.getAttribute("aria-labelledby")).toBe("t-weight");
  // Narrow panels give source and action their own line; wide ones keep them in the header.
  expect(weight.querySelector(".bf-panel__srcline .bf-src--garmin")).not.toBeNull();
  expect(document.querySelector(".bf-panel--wide .bf-panel__head .bf-src")).not.toBeNull();
  // A track only against a target you set; a sparkline only with two readings.
  expect(weight.querySelectorAll(".bf-meter__track")).toHaveLength(1);
  expect(weight.querySelector(".bf-spark")).toBeNull();
  expect(document.querySelector(".bf-spark--own .bf-spark__line")).not.toBeNull();
  // Garmin blue and the red structure come from the tokens.
  expect(getComputedStyle(weight.querySelector(".bf-src--garmin")!).color).toBe("rgb(57, 135, 229)");
  expect(getComputedStyle(document.querySelector(".bf-bar")!).borderLeftColor).toBe("rgb(208, 20, 27)");

  await page.getByRole("button", { name: "Open water history" }).click();
  await page.getByRole("button", { name: "Log weight" }).click();
  await page.getByRole("button", { name: "Log a record" }).click();
  expect([onOpen, onAdd, onLog].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  for (const b of screen.container.querySelectorAll<HTMLButtonElement>("button")) {
    const r = b.getBoundingClientRect();
    expect(Math.min(r.width, r.height), b.getAttribute("aria-label") ?? b.textContent ?? "").toBeGreaterThanOrEqual(32);
  }
  expect((await axe.run(screen.container, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
});
