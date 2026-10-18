/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { exportDB } from "dexie-export-import";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

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
});
