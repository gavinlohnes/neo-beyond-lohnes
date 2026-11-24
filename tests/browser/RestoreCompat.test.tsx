import { openCommandPanel } from "./helpers/command";
/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { exportDB } from "dexie-export-import";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { exportNativeBackup } from "../../src/persistence/backup";

/**
 * RESTORE-COMPAT through the real restore screen: an older backup previews
 * and is offered for replacement; a newer one is refused with a plain
 * sentence before CONFIRM REPLACE is ever offered.
 */

afterEach(() => {
  cleanup();
});

async function exportWithVersion(version: number): Promise<File> {
  const json = JSON.parse(await (await exportDB(db)).text());
  json.data.databaseVersion = version;
  return new File([JSON.stringify(json)], "backup.json");
}

async function openRestore() {
  const screen = await render(<MoreScreen />);
    await openCommandPanel(screen, "backup");
    await openCommandPanel(screen, "settings");
  await screen.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
  const input = screen.getByLabelText("Choose a backup file to restore").element() as HTMLInputElement;
  const choose = (file: File) => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  return { screen, choose };
}

describe("restore screen — backup versions", () => {
  // A confirmed restore reloads the page, which the browser harness cannot follow;
  // the replacement itself is covered by tests/persistence/restoreCompat.test.ts.
  it("an older backup previews with its version and offers CONFIRM REPLACE", async () => {
    await startDay();
    const { screen, choose } = await openRestore();
    choose(await exportWithVersion(db.verno - 1));
    await expect.element(screen.getByText(`version ${db.verno - 1}.`, { exact: false })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "CONFIRM REPLACE" })).toBeVisible();
  });

  it("a newer backup is refused with a plain message and no CONFIRM REPLACE", async () => {
    await startDay();
    const before = await db.events.toArray();
    const { screen, choose } = await openRestore();
    choose(await exportWithVersion(db.verno + 1));
    await expect.element(screen.getByRole("status")).toHaveTextContent(
      `This backup is from a newer version of BEYOND (data version ${db.verno + 1}; this app reads up to ${db.verno}). Update the app, then restore. Nothing was changed.`,
    );
    expect(screen.getByRole("button", { name: "CONFIRM REPLACE" }).elements()).toHaveLength(0);
    expect(await db.events.toArray()).toEqual(before);
  });

  // GRAYSON C8.1: the preview says what happens to this phone's preferences.
  it("says how many preferences replace this phone's, or that an older backup has none", async () => {
    await startDay();
    localStorage.setItem("beyond.vision", "NIGHT"); localStorage.setItem("beyond.delta.voice.v1", "DROID");
    try {
      const withSettings = new File([await exportNativeBackup(true)], "backup.json");
      const { screen, choose } = await openRestore();
      choose(withSettings);
      await expect.element(screen.getByText("Settings: 2 preferences replace this phone's. Keys and sign-ins stay as they are.", { exact: true })).toBeVisible();
      await screen.getByRole("button", { name: "CANCEL" }).click();
      choose(await exportWithVersion(db.verno));
      await expect.element(screen.getByText("Settings: this backup has none, so this phone keeps its own.", { exact: true })).toBeVisible();
    } finally { localStorage.removeItem("beyond.vision"); localStorage.removeItem("beyond.delta.voice.v1"); }
  });
});
