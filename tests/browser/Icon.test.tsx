import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Icon, type IconName } from "../../src/ui/icons/Icon";
import { CollapsibleRow } from "../../src/ui/components/CollapsibleRow";

/**
 * GLYPH-002: smoke coverage for the whole locked+additive icon family,
 * plus proof that CollapsibleRow's optional `icon` slot (previously only
 * exercised by ResetCard/ShiftDownCard, never asserted at this level)
 * actually renders what's passed to it.
 */
const ALL_ICON_NAMES: IconName[] = [
  "mission",
  "train",
  "body",
  "reset",
  "shiftDown",
  "success",
  "more",
  "history",
  "search",
  "schedule",
  "backup",
];

describe("Icon (real browser)", () => {
  it.each(ALL_ICON_NAMES)("renders %s as an aria-hidden svg with no crash", async (name) => {
    const screen = await render(<Icon name={name} size={20} />);
    const svg = screen.container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("renders at the requested size", async () => {
    const screen = await render(<Icon name="history" size={32} />);
    const svg = screen.container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });
});

describe("CollapsibleRow icon slot (GLYPH-002)", () => {
  it("renders the passed icon inside the control's tool-label", async () => {
    const screen = await render(
      <CollapsibleRow name="SEARCH" icon={<Icon name="search" size={20} />} summary="Find something." onOpen={() => {}} />,
    );
    const button = screen.getByRole("button", { name: "Open SEARCH" }).element();
    expect(button.querySelector(".tool-label svg")).not.toBeNull();
  });

  it("renders no icon when none is passed", async () => {
    const screen = await render(<CollapsibleRow name="REVIEW" summary="Read-only." onOpen={() => {}} />);
    const button = screen.getByRole("button", { name: "Open REVIEW" }).element();
    expect(button.querySelector(".tool-label svg")).toBeNull();
  });
});
