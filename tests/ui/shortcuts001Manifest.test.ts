import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseShortcut } from "../../src/ui/shortcuts";

/** SHORTCUTS-001: the manifest offers exactly START WORKOUT, +WATER and LOG MEAL. */
describe("SHORTCUTS-001 manifest", () => {
  it("lists exactly the three shortcuts, in order", () => {
    const config = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
    const urls = [...config.matchAll(/url: "\.\/\?go=(\w+)"/g)].map((m) => m[1]);
    expect(urls).toEqual(["workout", "water", "meal"]);
    const names = [...config.matchAll(/short_name: "([^"]+)", url:/g)].map((m) => m[1]);
    expect(names).toEqual(["START WORKOUT", "+WATER", "LOG MEAL"]);
  });

  it("old pinned shortcuts still parse", () => {
    expect(parseShortcut("?go=workout")).toBe("workout");
    expect(parseShortcut("?go=weight")).toBe("weight");
    expect(parseShortcut("?go=urge")).toBe("urge");
  });
});
