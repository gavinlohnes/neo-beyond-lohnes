import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { db } from "../../src/persistence/db";
import { exportBackup } from "../../src/persistence/backup";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";

/**
 * Drop 01 acceptance correction (real-device evidence, 2026-08-22):
 * exportBackup() needs `document`/`URL.createObjectURL`, unavailable in
 * the plain-Node test project (see tests/persistence/backupNudge.test.ts's
 * own doc comment) — this is the real-Chromium coverage that gap left
 * for the DOM-triggering path itself.
 *
 * A first fix attempt (re-typing the export Blob as application/json,
 * plus listing several accept MIME variants on the restore input) still
 * failed a real Android round trip: the file appeared in the picker but
 * stayed unselectable. Root cause, confirmed on retest: Android's Storage
 * Access Framework filters candidates by whatever MIME type its
 * DocumentsProvider recorded for the file at download time — which
 * BEYOND cannot reliably predict or control, and which was observed not
 * to match any of the MIME strings tried. No test in this file can
 * observe that OS-level behavior directly (it isn't reproducible outside
 * a real device); what CAN be proven here is the actual code-level fix:
 * exportBackup() still declares an explicit, correct type on its own
 * side (harmless, arguably still best practice), and — the part that
 * actually matters this time — the restore input applies no `accept`
 * filter at all, so no Android MIME mismatch can exclude a candidate
 * file from the picker in the first place. Safety is unaffected: content
 * is still fully validated after selection by previewAnyRestore/
 * applyAnyRestore, untouched by this file.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("exportBackup — download MIME type", () => {
  it("creates the downloaded file with an explicit application/json type, not dexie-export-import's raw text/json", async () => {
    let capturedType: string | undefined;
    const realCreateObjectURL = URL.createObjectURL.bind(URL);

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((obj: Blob | MediaSource) => {
      capturedType = (obj as Blob).type;
      return realCreateObjectURL(obj as Blob);
    });
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    try {
      await exportBackup();
    } finally {
      createElementSpy.mockRestore();
      revokeSpy.mockRestore();
      createObjectURLSpy.mockRestore();
    }

    expect(capturedType).toBe("application/json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe("MoreScreen restore picker — no accept filter (Drop 01 acceptance retest)", () => {
  afterEach(() => {
    cleanup();
  });

  it("applies no accept restriction, so Android's SAF picker cannot exclude a candidate file by MIME", async () => {
    // MoreScreen fires an async refresh() on mount (getDayCount/getActiveDay/
    // etc.) with no exposed "loading" flag; starting a day first and
    // waiting for its own visible effect ("Active day: YES") is a real
    // wait for that in-flight work to settle before the test — and this
    // file's afterEach's Dexie.delete — proceed, rather than an arbitrary
    // sleep. Without it, the global teardown can close the database while
    // MoreScreen's own refresh() is still awaiting a query against it.
    await startDay();
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByText("YES", { exact: true })).toBeVisible();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    expect(fileInput!.accept).toBe("");
    expect(fileInput!.hasAttribute("accept")).toBe(false);
    expect(Number.parseFloat(getComputedStyle(fileInput!).fontSize)).toBeGreaterThanOrEqual(16);
    expect(fileInput!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
