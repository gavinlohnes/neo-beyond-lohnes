import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { AdvisorySection } from "../../src/ui/screens/today/AdvisorySection";
import { composeAdvisoryNoteFromShiftProtection } from "../../src/engine/advisory";
import type { AdvisoryNote } from "../../src/domain/intelligence/types";

/**
 * TODAY-QUICKACTIONS-001 (item 2): AdvisorySection's new PROTECT quick
 * actions, in isolation. AdvisorySection is a pure presentational
 * component (`notes` is a caller-supplied prop — see its own doc
 * comment); real end-to-end triggering of a shiftProtection note depends
 * on wall-clock "now" landing inside a real PRE_WORK window on a real
 * scheduled work day (TodayScreen calls `getAdvisoryNotes()` with no
 * override), which a real-Chromium test cannot deterministically force
 * without a fake system clock this codebase doesn't wire up here. That
 * end-to-end trigger condition, and the concern clearing once real
 * water/protein is logged, are already covered at the application layer
 * by tests/integration/foundationContinuity.test.ts's Scenario B — this
 * file proves the actual UI surface this Drop adds: given a real
 * shiftProtection-shaped note (built via the same composer
 * advisoryQueries.ts uses, not a hand-typed fixture), the right quick
 * actions render and call the right handler with the right amount.
 */
const protectNote: AdvisoryNote = composeAdvisoryNoteFromShiftProtection({ unmetItems: ["HYDRATE", "PROTEIN"] });
const hydrateOnlyNote: AdvisoryNote = composeAdvisoryNoteFromShiftProtection({ unmetItems: ["HYDRATE"] });
const proteinOnlyNote: AdvisoryNote = composeAdvisoryNoteFromShiftProtection({ unmetItems: ["PROTEIN"] });

describe("AdvisorySection (real browser) — PROTECT quick actions", () => {
  it("renders a PROTECT label and the message for an INTERRUPT-tier shiftProtection note", async () => {
    const screen = await render(<AdvisorySection notes={[protectNote]} />);

    await expect.element(screen.getByText("PROTECT", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(protectNote.message)).toBeVisible();
  });

  it("renders one +OZ quick-add button per WATER_QUICK_ADD_OZ amount for an unmet HYDRATE item, and tapping one calls onLogWater with that exact amount", async () => {
    const onLogWater = vi.fn();
    const screen = await render(<AdvisorySection notes={[hydrateOnlyNote]} onLogWater={onLogWater} />);

    await expect.element(screen.getByRole("button", { name: "+8 OZ" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "+12 OZ" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "+16 OZ" })).toBeVisible();
    // No protein action for a HYDRATE-only concern.
    expect(screen.getByRole("button", { name: "LOG PROTEIN" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "+12 OZ" }).click();
    expect(onLogWater).toHaveBeenCalledExactlyOnceWith(12);
  });

  it("renders a LOG PROTEIN action for an unmet PROTEIN item, and tapping it calls onOpenMinimumDay (never a fabricated gram amount)", async () => {
    const onOpenMinimumDay = vi.fn();
    const screen = await render(<AdvisorySection notes={[proteinOnlyNote]} onOpenMinimumDay={onOpenMinimumDay} />);

    // No water quick-adds for a PROTEIN-only concern.
    expect(screen.getByRole("button", { name: "+8 OZ" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "LOG PROTEIN" }).click();
    expect(onOpenMinimumDay).toHaveBeenCalledOnce();
  });

  it("renders both HYDRATE and PROTEIN actions together when both are unmet", async () => {
    const onLogWater = vi.fn();
    const onOpenMinimumDay = vi.fn();
    const screen = await render(<AdvisorySection notes={[protectNote]} onLogWater={onLogWater} onOpenMinimumDay={onOpenMinimumDay} />);

    await expect.element(screen.getByRole("button", { name: "+8 OZ" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "LOG PROTEIN" })).toBeVisible();
  });

  it("renders no quick actions when no handler is supplied, even though the note has unmet items", async () => {
    const screen = await render(<AdvisorySection notes={[protectNote]} />);

    expect(screen.getByRole("button", { name: "+8 OZ" }).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "LOG PROTEIN" }).elements()).toHaveLength(0);
  });

  it("disables quick actions while busy", async () => {
    const screen = await render(<AdvisorySection notes={[protectNote]} busy onLogWater={() => {}} onOpenMinimumDay={() => {}} />);

    await expect.element(screen.getByRole("button", { name: "+8 OZ" })).toBeDisabled();
    await expect.element(screen.getByRole("button", { name: "LOG PROTEIN" })).toBeDisabled();
  });

  it("a non-shiftProtection note never renders HYDRATE/PROTEIN quick actions", async () => {
    const journalNote: AdvisoryNote = {
      id: "note-1",
      sourceModule: "decisionJournal",
      message: "A related past decision may be relevant.",
      basis: [],
      attentionLevel: "QUIET",
    };
    const screen = await render(<AdvisorySection notes={[journalNote]} onLogWater={() => {}} onOpenMinimumDay={() => {}} />);

    await expect.element(screen.getByText(journalNote.message)).toBeVisible();
    expect(screen.getByRole("button", { name: "+8 OZ" }).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "LOG PROTEIN" }).elements()).toHaveLength(0);
  });
});
