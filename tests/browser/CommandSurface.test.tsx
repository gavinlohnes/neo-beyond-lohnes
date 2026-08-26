import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { CommandSurface } from "../../src/ui/components/CommandSurface";

/**
 * VISUAL-002 (Semantic Component Grammar): CommandSurface formalizes the
 * PRIMARY DECISION/EXECUTION `className="command-surface fade-in"`
 * convention that TodayScreen and TrainScreen previously wrote by hand at
 * every call site. Deliberately dumb — no variant/tone prop — so this
 * test only covers what the component actually promises: the exact class
 * pair every real caller depended on, an optional caller-supplied class
 * merged alongside it (never replacing it), and children rendered as-is.
 */
describe("CommandSurface (real browser)", () => {
  it("renders children inside a command-surface fade-in wrapper", async () => {
    const screen = await render(
      <CommandSurface>
        <p className="command-title">Recovery session</p>
      </CommandSurface>,
    );

    const title = screen.getByText("Recovery session").element();
    const surface = title.closest(".command-surface");
    expect(surface).not.toBeNull();
    expect(surface!.className).toContain("command-surface");
    expect(surface!.className).toContain("fade-in");
  });

  it("merges an optional className alongside command-surface fade-in, never replacing it", async () => {
    const screen = await render(
      <CommandSurface className="extra-class">
        <p className="command-title">Standard workout</p>
      </CommandSurface>,
    );

    const surface = screen.getByText("Standard workout").element().closest(".command-surface");
    expect(surface).not.toBeNull();
    expect(surface!.className).toContain("command-surface");
    expect(surface!.className).toContain("fade-in");
    expect(surface!.className).toContain("extra-class");
  });
});
