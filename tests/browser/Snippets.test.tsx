import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { saveSnippet } from "../../src/application/snippetCommands";
import { SnippetExpander, announceSnippetsChanged, undoSnippetExpansion } from "../../src/ui/components/SnippetExpander";
import { SnippetsScreen } from "../../src/ui/screens/more/SnippetsScreen";
import { db } from "../../src/persistence/db";
import { createSavedMeal } from "../../src/application/nutritionCommands";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(() => { cleanup(); window.scrollTo(0, 0); });

describe("SNIPPETS-001 browser behavior", () => {
  it("expands in BEYOND text controls and one Backspace restores the trigger", async () => {
    await saveSnippet({ trigger: ";shift", text: "Final shift handoff" });
    const screen = await render(<><SnippetExpander /><label>Message<textarea aria-label="Message" /></label></>);
    announceSnippetsChanged();
    const message = screen.getByRole("textbox", { name: "Message" });
    await message.fill("Before ;shift ");
    await expect.element(message).toHaveValue("Before Final shift handoff ");
    const textarea = message.element() as HTMLTextAreaElement;
    expect(textarea.dataset.beyondSnippetUndo).toBeTruthy();
    textarea.focus(); textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const undo = JSON.parse(textarea.dataset.beyondSnippetUndo!);
    expect(undo.end).toBe(textarea.selectionStart); expect(textarea.value.slice(undo.start, undo.end)).toBe(undo.replacement);
    expect(undoSnippetExpansion(textarea)).toBe(true);
    await expect.element(message).toHaveValue("Before ;shift ");
    expect(await db.events.count()).toBe(0);
  });

  it("saves named card sets only on confirmation and fits an accessible 360px screen", async () => {
    await createSavedMeal({ name: "Protein shake", calories: 240, proteinG: 32, carbsG: 18, fatG: 4 });
    const screen = await render(<SnippetsScreen active />);
    await screen.getByRole("textbox", { name: "Name" }).fill("usual pre-shift");
    await screen.getByRole("textbox", { name: "Cards" }).fill("ate Protein shake\n20 oz water");
    expect(await db.logTemplates.count()).toBe(0);
    await screen.getByRole("button", { name: "SAVE LOG TEMPLATE" }).click();
    await expect.element(screen.getByText("Log 20 oz water", { exact: true })).toBeVisible();
    expect(await db.logTemplates.count()).toBe(1); expect(await db.events.count()).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    for (const control of document.querySelectorAll<HTMLElement>(".snippets-screen button, .snippets-screen input, .snippets-screen textarea")) {
      expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    expect((await axe.run(document.body)).violations).toEqual([]);
  });
});
