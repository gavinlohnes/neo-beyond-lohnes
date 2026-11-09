/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { SavedInboxScreen } from "../../src/ui/screens/more/SavedInboxScreen";
import { saveInboxItem } from "../../src/application/savedInbox";
import { db } from "../../src/persistence/db";

/** INBOX-ZERO-001: sort the Saved inbox one item at a time through existing commands. Invented items only. */
afterEach(async () => { await cleanup(); });

describe("INBOX-ZERO-001", () => {
  it("sorts one at a time: task then remove, keep for later, remove needs a second tap", async () => {
    await saveInboxItem({ title: "Book the dentist", text: "Call before Friday" });
    await saveInboxItem({ title: "Article to read", text: "Long read on sleep" });
    await saveInboxItem({ title: "Old link", text: "Not needed" });
    const tasksBefore = await db.obligations.count();
    const screen = await render(<SavedInboxScreen active />);
    await screen.getByRole("button", { name: "SORT INBOX · 3" }).click();
    const card = screen.getByRole("region", { name: "Sort inbox" });
    await expect.element(card.getByText("1 of 3")).toBeVisible();

    await card.getByRole("button", { name: "MAKE TASK" }).click();
    await expect.element(card.getByText("Task created. Remove it from the inbox?")).toBeVisible();
    await card.getByRole("button", { name: "REMOVE FROM INBOX" }).click();
    await expect.element(card.getByText("2 of 3")).toBeVisible();
    expect(await db.obligations.count()).toBe(tasksBefore + 1);

    await card.getByRole("button", { name: "KEEP FOR LATER" }).click();
    await expect.element(card.getByText("3 of 3")).toBeVisible();
    await card.getByRole("button", { name: "REMOVE", exact: true }).click();
    expect(await db.savedInboxItems.count()).toBe(2);
    await card.getByRole("button", { name: "CONFIRM REMOVE" }).click();
    await expect.element(card.getByText("All sorted.")).toBeVisible();
    await expect.element(card.getByText("1 kept for later.")).toBeVisible();
    expect(await db.savedInboxItems.count()).toBe(1);
  });
});
