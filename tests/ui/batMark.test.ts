import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAT_PATH, BAT_RED } from "../../src/ui/components/BatMark";

/** SUIT-ALIVE-001: the in-app bat has one source, docs/brand/suit-mark/suit-mark.svg. */
describe("SUIT-ALIVE S1 — the bat mark", () => {
  it("draws exactly the approved source geometry and color", () => {
    const svg = readFileSync(new URL("../../docs/brand/suit-mark/suit-mark.svg", import.meta.url), "utf8");
    expect(svg).toContain(`viewBox="0 0 100 52"`);
    expect(svg).toContain(`d="${BAT_PATH}"`);
    expect(svg).toContain(`fill="${BAT_RED}"`);
  });

  it("is used in the header, the cave and the cold start only; the app icon is untouched", () => {
    const uses = (file: string) => readFileSync(new URL(`../../src/ui/${file}`, import.meta.url), "utf8").includes("<BatMark");
    expect(uses("components/OperatorHeader.tsx")).toBe(true);
    expect(uses("screens/systems/CaveVitals.tsx")).toBe(true);
    expect(uses("components/BootSequence.tsx")).toBe(true);
    expect(uses("components/StealthOverlay.tsx")).toBe(false); // stealth stays discreet
  });
});
