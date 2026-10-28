import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAT_MARKS, BAT_RED, BAT_VIEWBOX } from "../../src/ui/components/BatMark";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** BRAND-MARK-002: one split bat, from docs/brand/suit-mark/, in the HUD red. */
describe("BRAND-MARK-002 — the split bat", () => {
  it("draws exactly the source geometry in the HUD red, for both cuts and the app icon", () => {
    const tokens = read("src/ui/styles/tokens.css");
    expect(tokens).toContain(`--red: ${BAT_RED};`);
    for (const cut of ["icon", "hairline"] as const) {
      const svg = read(`docs/brand/suit-mark/beyond-mark-${cut}.svg`);
      expect(svg).toContain(`viewBox="${BAT_VIEWBOX}"`);
      for (const points of BAT_MARKS[cut]) expect(svg).toContain(`<polygon fill="${BAT_RED}" points="${points}"/>`);
    }
    const app = read("docs/brand/suit-mark/beyond-app-icon.svg");
    expect(app).toContain(`<rect width="512" height="512" fill="#000000"/>`);
    for (const points of BAT_MARKS.icon) expect(app).toContain(`points="${points}"`);
  });

  it("uses the hairline cut only at boot; small marks use the icon cut", () => {
    const src = (file: string) => read(`src/ui/${file}`);
    expect(src("components/BootSequence.tsx")).toContain(`<BatMark width={156} cut="hairline"`);
    expect(src("components/OperatorHeader.tsx")).toMatch(/<BatMark width=\{30\} \/>/);
    expect(src("screens/systems/CaveVitals.tsx")).toMatch(/<BatMark width=\{24\} className="cave__bat" \/>/);
    expect(src("components/StealthOverlay.tsx")).not.toContain("<BatMark"); // stealth stays discreet
  });

  it("installs the new icons under new names, with any and maskable, and references no old icon", () => {
    const config = read("vite.config.ts"), html = read("index.html");
    expect(config).toContain(`{ src: "icons/beyond-v2-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }`);
    expect(config).toContain(`{ src: "icons/beyond-v2-512.png", sizes: "512x512", type: "image/png", purpose: "any" }`);
    expect(config).toContain(`cacheId: "beyond-mark-v2"`);
    expect(html).toContain(`href="icons/beyond-v2-apple-180.png"`);
    expect(html).toContain(`href="icons/beyond-v2-favicon.svg"`);
    for (const text of [config, html]) expect(text).not.toMatch(/icons\/icon-\d+\.png/);
  });
});
