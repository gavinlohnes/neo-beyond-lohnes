import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** BOOT-001: Android's splash and the page are pure black, so the hand-off to the boot sequence is seamless. */
describe("BOOT-001 manifest and first paint", () => {
  it("manifest background and theme colors are #000000; the page paints black before CSS", () => {
    const config = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
    expect(config).toMatch(/background_color: "#000000"/);
    expect(config).toMatch(/theme_color: "#000000"/);
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    expect(html).toMatch(/html, body \{ background: #000; \}/);
  });
});
