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
 * Root cause of the Android restore failure: dexie-export-import's own
 * Blob is hardcoded to `type: "text/json"` (not application/json), and
 * Android's Storage Access Framework file picker filters strictly by a
 * file's OS-recorded MIME type. This proves exportBackup() now hands the
 * browser a file explicitly typed application/json instead of relying on
 * that library-internal type — the actual fix. It cannot prove Android's
 * own SAF picker then accepts the file; that still requires a real
 * device round-trip (see the completion report's Android retest steps).
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

describe("MoreScreen restore picker — accept filter", () => {
  afterEach(() => {
    cleanup();
  });

  it("accepts application/json, text/json, and the raw .json extension (Android SAF hardening)", async () => {
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

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const accept = (fileInput as HTMLInputElement).accept;
    expect(accept.split(",")).toEqual(expect.arrayContaining(["application/json", "text/json", ".json"]));
  });
});
