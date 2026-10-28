import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bandAccent } from "../../src/ui/screens/today/SuitLines";

/** SUIT-VOLUME-001: flashy on action, calm at rest. */
describe("SUIT-VOLUME-001", () => {
  it("lets one suit band on TODAY carry the accent: late preflight, then a point just passed, then off-normal", () => {
    expect(bandAccent({ briefLate: true, callout: true, commsOff: true })).toBe("brief");
    expect(bandAccent({ briefLate: false, callout: true, commsOff: true })).toBe("callout");
    expect(bandAccent({ briefLate: false, callout: false, commsOff: true })).toBe("comms");
    expect(bandAccent({ briefLate: false, callout: false, commsOff: false })).toBeNull();
  });

  it("keeps idle silent: every animation in the app plays once, never loops", () => {
    const root = new URL("../../src/", import.meta.url);
    const css = (readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(new URL(f, root), "utf8")).join("\n");
    expect(css).not.toMatch(/\binfinite\b/);
  });

  it("acknowledges the cave brief's saved records with commit feedback", () => {
    const brief = readFileSync(new URL("../../src/ui/screens/systems/CaveBrief.tsx", import.meta.url), "utf8");
    expect(brief).toContain("captureCommitFeedback()");
    expect(brief).toMatch(/await run\(\); acknowledge\("LIGHT"\)/);
  });
});
