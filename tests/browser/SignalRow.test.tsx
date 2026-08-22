import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { SignalRow } from "../../src/ui/components/SignalRow";

/**
 * FIELD ALPHA Phase 1: SignalRow promoted from a TodayScreen-local
 * function to a shared component now that TRAIN/BODY/MORE are about to
 * need an ATTENTION-tier surface of their own. Pure extraction — this
 * covers the primitive directly rather than only indirectly through
 * TodayScreen's own tests (SuitLayer01VisualGrammar.test.tsx).
 */
describe("SignalRow (real browser)", () => {
  it("renders the label as .tool-label and its children inside a .signal-row surface", async () => {
    const screen = await render(
      <SignalRow label="OUTCOME">
        <p className="card-body">Was REDUCED helpful?</p>
      </SignalRow>,
    );

    const label = screen.getByText("OUTCOME", { exact: true }).element();
    expect(label.className).toContain("tool-label");
    await expect.element(screen.getByText("Was REDUCED helpful?")).toBeVisible();

    const surface = label.closest(".signal-row");
    expect(surface).not.toBeNull();
    expect(surface!.className).not.toContain("command-surface");
  });
});
