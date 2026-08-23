import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { APP_RELEASE, BUILD_COMMIT, BUILD_TIME } from "../../src/app/buildInfo";
import { ENGINE_VERSION } from "../../src/engine/evaluate";
import { archiveMission, createMission, createObligation } from "../../src/application/intentCommands";

/**
 * BEYOND FIELD ALPHA Phase 4 — first real-browser acceptance layer for
 * MORE. There was no browser-level UI coverage for the MENU/System
 * surface itself before this checkpoint (tests/browser/backupExport.test.tsx
 * renders MoreScreen but only ever checks the restore file input's
 * missing `accept` attribute; tests/browser/IntentScreen.test.tsx covers
 * the nested Intent screen directly, not reached through MORE). This
 * file covers the MENU surface's own composition, navigation into each
 * nested view and back, and that SYSTEM diagnostics reflect live truth
 * rather than any fabricated/hardcoded state.
 */

afterEach(() => {
  cleanup();
});

describe("MoreScreen (real browser) — MENU / SYSTEM surface", () => {
  it("renders the three functional sections with every capability reachable", async () => {
    const screen = await render(<MoreScreen />);

    await expect.element(screen.getByText("Operations", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Records", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("System", { exact: true })).toBeVisible();

    await expect.element(screen.getByRole("button", { name: "Open MISSIONS & OBLIGATIONS" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open WORK SCHEDULE" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open HISTORY" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "EXPORT BACKUP" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "SHARE / ARCHIVE" })).toBeVisible();
    await expect.element(screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true })).toBeVisible();
  });

  it("the ampersand in MISSIONS & OBLIGATIONS renders as a real character, not an escaped entity", async () => {
    // Regression guard: a JS string prop ("MISSIONS &amp; OBLIGATIONS")
    // does not HTML-decode the way JSX children text does — this exact
    // mistake was made and caught while building this checkpoint.
    const screen = await render(<MoreScreen />);
    expect(screen.getByText("MISSIONS &amp; OBLIGATIONS", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByText("MISSIONS & OBLIGATIONS", { exact: true })).toBeVisible();
  });

  it("no dominant .command-surface exists — MORE has no single primary decision, only system access", async () => {
    await render(<MoreScreen />);
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
  });

  it("the SYSTEM instrument cluster reflects live truth, not a fabricated or duplicated reading", async () => {
    const screen = await render(<MoreScreen />);

    await expect.element(screen.getByText("SCHEMA", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(String(db.verno), { exact: true })).toBeVisible();
    // The old screen showed the identical db.verno value twice under two
    // different labels ("Data schema" and "Dexie") — now just once.
    expect(screen.getByText("Dexie", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("Data schema", { exact: true }).elements()).toHaveLength(0);
  });

  it("Factory Drop 02: APP/BUILD/ENGINE come from the shared build-info/engine source, not a second hardcoded literal", async () => {
    // Regression guard for the exact bug this Drop fixed: MoreScreen used
    // to carry its own independent `const APP_VERSION = "0.1.0"` literal,
    // completely disconnected from package.json's `version`. Reads the
    // instrument-cluster's own label→value structure directly (rather
    // than a global text search) since APP_RELEASE and ENGINE_VERSION can
    // coincidentally share the same string value.
    const screen = await render(<MoreScreen />);

    const cells = screen.container.querySelectorAll(".instrument-cluster > div");
    const readings = Array.from(cells).reduce<Record<string, string>>((acc, cell) => {
      const label = cell.querySelector(".meta")?.textContent ?? "";
      const value = cell.querySelector(".status-value")?.textContent ?? "";
      acc[label] = value;
      return acc;
    }, {});

    expect(readings["APP"]).toBe(APP_RELEASE);
    expect(readings["BUILD"]).toBe(BUILD_COMMIT);
    expect(readings["ENGINE"]).toBe(ENGINE_VERSION);

    // The exact build timestamp is technical detail behind the
    // disclosure, not permanently visible in the glance grid.
    await expect.element(screen.getByText(BUILD_TIME, { exact: true })).not.toBeVisible();
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    await expect.element(screen.getByText(BUILD_TIME, { exact: true })).toBeVisible();
  });

  it("database contents (raw counts) are TECHNICAL DETAIL, tucked behind disclosure, not permanently visible", async () => {
    const screen = await render(<MoreScreen />);

    await expect.element(screen.getByText("Diagnostic detail", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Days", { exact: true })).not.toBeVisible();

    await screen.getByText("Diagnostic detail", { exact: true }).click();
    await expect.element(screen.getByText("Days", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Events", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Recommendations", { exact: true })).toBeVisible();
  });

  it("Intelligence Spine I2: no unresolved obligations -> Advisory notes reads 0, no note text rendered", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByText("Diagnostic detail", { exact: true }).click();

    await expect.element(screen.getByText("Advisory notes", { exact: true })).toBeVisible();
    expect(screen.getByText(/—\sOVERDUE|—\sDUE_TODAY|—\sDUE_SOON|—\sPLANNED_TODAY/).elements()).toHaveLength(0);
  });

  it("Intelligence Spine I2: an overdue obligation surfaces a note that is plain text, not a button/command", async () => {
    await createObligation({ title: "Renew passport", dueAt: "2020-01-01" });
    const screen = await render(<MoreScreen />);
    await screen.getByText("Diagnostic detail", { exact: true }).click();

    await expect.element(screen.getByText("Advisory notes", { exact: true })).toBeVisible();
    const noteEl = screen.getByText("Renew passport — OVERDUE", { exact: true });
    await expect.element(noteEl).toBeVisible();
    // Non-commanding, non-interactive: the note itself is a <p>, not a
    // <button>/<a> — nothing to accept/decline/act on here (it must never
    // be reachable as a command surface, only ever informational text).
    expect(noteEl.elements()[0]?.tagName).toBe("P");
    expect(noteEl.elements()[0]?.closest("button")).toBeNull();
  });

  it("Intelligence Spine I2: advisory notes are TECHNICAL DETAIL — tucked behind disclosure, not permanently visible, never in .instrument-cluster or dominant", async () => {
    await createObligation({ title: "Renew passport", dueAt: "2020-01-01" });
    const screen = await render(<MoreScreen />);

    // Collapsed by default, same as every other diagnostic-tier reading.
    await expect.element(screen.getByText("Renew passport — OVERDUE", { exact: true })).not.toBeVisible();
    // Never promoted into the always-visible glance-tier instrument cluster.
    expect(screen.container.querySelector(".instrument-cluster")?.textContent).not.toContain("Renew passport");
    // Never rendered as, or inside, a command surface.
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
  });

  it("Intent Lifecycle Integrity: an OVERDUE obligation linked to an ARCHIVED Mission produces no advisory note", async () => {
    const mission = await createMission({ title: "Old direction" });
    await createObligation({ title: "Do it", missionId: mission.id, dueAt: "2020-01-01" });
    await archiveMission(mission.id);

    const screen = await render(<MoreScreen />);
    await screen.getByText("Diagnostic detail", { exact: true }).click();

    await expect.element(screen.getByText("Advisory notes", { exact: true })).toBeVisible();
    expect(screen.getByText("Do it — OVERDUE", { exact: true }).elements()).toHaveLength(0);
  });

  it("restore's file input still has no accept filter (Android SAF compatibility, unchanged)", async () => {
    const screen = await render(<MoreScreen />);
    const fileInput = screen.container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput!.hasAttribute("accept")).toBe(false);
  });
});

describe("MoreScreen (real browser) — nested navigation", () => {
  it("opens Missions & Obligations and returns to MENU", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open MISSIONS & OBLIGATIONS" }).click();

    await expect.element(screen.getByText("MORE // MISSIONS & OBLIGATIONS", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Missions", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "← BACK TO MORE" }).click();
    await expect.element(screen.getByText("Operations", { exact: true })).toBeVisible();
  });

  it("opens Work Schedule and returns to MENU", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open WORK SCHEDULE" }).click();

    await expect.element(screen.getByText("MORE // WORK SCHEDULE", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/working days/i).first()).toBeVisible();

    await screen.getByRole("button", { name: "← BACK TO MORE" }).click();
    await expect.element(screen.getByText("Operations", { exact: true })).toBeVisible();
  });

  it("opens History and returns to MENU", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open HISTORY" }).click();

    await expect.element(screen.getByText("MORE // HISTORY", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "← BACK TO MORE" }).click();
    await expect.element(screen.getByText("Records", { exact: true })).toBeVisible();
  });
});

describe("MoreScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx", async (width) => {
    await page.viewport(width, 800);
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("button", { name: "Open MISSIONS & OBLIGATIONS" })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("MoreScreen (real browser) — accessibility", () => {
  it("passes real WCAG AA color-contrast beyond the known app-wide exception", async () => {
    const screen = await render(<MoreScreen />);
    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
