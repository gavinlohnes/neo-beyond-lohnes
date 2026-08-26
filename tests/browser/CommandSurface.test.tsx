import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { CommandSurface } from "../../src/ui/components/CommandSurface";

/**
 * VISUAL-002 (Semantic Component Grammar): CommandSurface formalizes the
 * PRIMARY DECISION/EXECUTION `className="command-surface fade-in"`
 * convention that TodayScreen and TrainScreen previously wrote by hand at
 * every call site. Deliberately dumb — no variant/tone prop, no
 * className escape hatch — so this test only covers what the component
 * actually promises: the exact class pair every real caller depended on,
 * with children rendered as-is inside it.
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
    expect(surface!.className).toBe("command-surface fade-in");
  });
});
