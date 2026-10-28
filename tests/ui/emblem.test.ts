import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMBLEM_EYES, EMBLEM_INNER, EMBLEM_OUTER, EMBLEM_PLATE } from "../../src/ui/components/Emblem";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** BRAND-MARK-003: Brand Drop v2. One emblem, locked geometry, palette tokens, no old marks anywhere. */
describe("BRAND-MARK-003 — the emblem", () => {
  it("draws exactly the locked source geometry on the chamfered plate", () => {
    const plate = read("docs/brand/beyond-emblem/beyond-plate.svg");
    for (const d of [EMBLEM_PLATE, EMBLEM_OUTER, EMBLEM_INNER, EMBLEM_EYES]) expect(plate).toContain(`d="${d}"`);
    for (const file of ["beyond-app-icon.svg", "beyond-mono.svg"]) expect(read(`docs/brand/beyond-emblem/${file}`)).toContain(EMBLEM_OUTER);
    expect(read("docs/brand/beyond-emblem/beyond-app-icon.svg")).toContain(`<rect width="512" height="512" fill="#F7C928"/>`);
  });

  it("colors only from the palette: HUD red, HUD black and the brand yellow token", () => {
    const tokens = read("src/ui/styles/tokens.css");
    expect(tokens).toContain("--red: #D0141B;");
    expect(tokens).toContain("--brand-yellow: #F7C928;");
    expect(tokens).toContain("--black: #000000;");
    for (const file of ["beyond-app-icon.svg", "beyond-plate.svg"]) {
      const svg = read(`docs/brand/beyond-emblem/${file}`);
      expect([...new Set(svg.match(/#[0-9A-Fa-f]{6}/g))].sort()).toEqual(["#000000", "#D0141B", "#F7C928"]);
    }
    const emblem = read("src/ui/components/Emblem.tsx");
    expect(emblem).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
  });

  it("is the one in-app logo: header, cave, boot and the shift moments; never a circle container", () => {
    for (const file of ["components/OperatorHeader.tsx", "screens/systems/CaveVitals.tsx", "components/BootSequence.tsx", "screens/today/ShiftChange.tsx"]) {
      expect(read(`src/ui/${file}`)).toContain("<Emblem size=");
    }
    expect(read("src/ui/components/StealthOverlay.tsx")).not.toContain("<Emblem"); // stealth stays discreet
  });

  it("installs v3 icons as maskable, any and monochrome, and references no old mark", () => {
    const config = read("vite.config.ts"), html = read("index.html");
    for (const purpose of ["maskable", "any", "monochrome"]) expect(config).toContain(`purpose: "${purpose}"`);
    expect(config).toContain(`cacheId: "beyond-mark-v3"`);
    expect(config).toMatch(/theme_color: "#000000",\s+background_color: "#000000"/);
    expect(html).toContain(`href="icons/beyond-v3-apple-180.png"`);
    expect(readdirSync(new URL("../../public/icons/", import.meta.url)).every((f) => f.startsWith("beyond-v3-"))).toBe(true);
    for (const text of [config, html]) expect(text).not.toMatch(/beyond-v2|icons\/icon-\d|suit-mark|beyond-mark-(master|micro|icon|hairline)/);
  });
});
