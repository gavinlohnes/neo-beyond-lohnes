import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** REFLECT-001: the reflective views by name, and the daily note leading into the week. Nothing saves without a tap. */
beforeEach(async () => { await page.viewport(390, 844); });
afterEach(async () => { await cleanup(); sessionStorage.clear(); });

async function openByName(screen: Awaited<ReturnType<typeof render>>, query: string, label: string, description: string) {
  const search = screen.getByRole("searchbox", { name: "Find a screen or action" });
  await expect.element(search).toBeVisible();
  await search.fill(query);
  await screen.getByRole("button", { name: `${label} ${description}`, exact: true }).click();
}

it("DELTA and PATTERNS open Personal Understanding straight at that view", async () => {
  await startDay();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "delta", "DELTA", "What BEYOND has learned about you, and its notebook");
  const views = screen.getByRole("group", { name: "Personal understanding views" });
  await expect.element(views.getByRole("button", { name: "DELTA" })).toHaveAttribute("aria-pressed", "true");
  expect((screen.container.querySelector("details.personal-understanding") as HTMLDetailsElement).open).toBe(true);

  await screen.getByRole("button", { name: "BACK TO MORE" }).click();
  await openByName(screen, "patterns", "PATTERNS", "Your usual, your place in a run, sleep timing and tags");
  await expect.element(views.getByRole("button", { name: "Patterns" })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText("YOUR USUAL, NOT A TARGET")).toBeVisible();
});

it("the daily note leads into the weekly interview, which shows what the week taught DELTA", async () => {
  const day = await startDay();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "daily note", "DAILY NOTE", "Write about today, tag it, answer DELTA's question");
  // Calmer: the day's recorded actions fold behind one line, and patterns are one link away.
  await expect.element(screen.getByText(/^Recorded today \(\d+\)$/)).toBeVisible();
  expect(screen.getByText("What your tags line up with").elements()).toHaveLength(0);
  await userEvent.fill(screen.getByRole("textbox", { name: "Your note", exact: true }), "Quiet shift #goodtalk");
  await screen.getByRole("button", { name: "SAVE NOTE", exact: true }).click();
  await expect.element(screen.getByText("1 note in the last 7 days. Each comes back in a weekly interview once its day is done.")).toBeVisible();
  expect((await db.dailyNotes.get(day.id))?.text).toBe("Quiet shift #goodtalk");
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

  const notes = await db.dailyNotes.count(), obligations = await db.obligations.count();
  await screen.getByRole("button", { name: "OPEN WEEKLY INTERVIEW" }).click();
  await expect.element(screen.getByText("WHAT THIS WEEK SHOWED")).toBeVisible();
  expect(screen.container.querySelector("#week-interview-heading")).not.toBeNull();
  await screen.getByRole("button", { name: "SEE ALL OF DELTA" }).click();
  await expect.element(screen.getByRole("group", { name: "Personal understanding views" }).getByRole("button", { name: "DELTA" })).toHaveAttribute("aria-pressed", "true");
  // Getting around wrote nothing.
  expect([await db.dailyNotes.count(), await db.obligations.count()]).toEqual([notes, obligations]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
});

it("Search all records opens WEEKLY INTERVIEW in place too", async () => {
  await startDay();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "search records", "SEARCH RECORDS", "Find your personal records");
  await userEvent.fill(screen.getByRole("textbox", { name: "Search everything" }), "interview");
  await screen.getByRole("button", { name: "Go: WEEKLY INTERVIEW Look back at the week and answer a few questions" }).click();
  await expect.element(screen.getByText("WHAT THIS WEEK SHOWED")).toBeVisible();
});

it("review of #479/#480: an unsaved draft and a confirmed interview both survive SAVE NOTE", async () => {
  const day = await startDay();
  const screen = await render(<MoreScreen />);
  await openByName(screen, "daily note", "DAILY NOTE", "Write about today, tag it, answer DELTA's question");
  const editor = () => screen.getByRole("textbox", { name: "Your note", exact: true });
  await userEvent.fill(editor(), "Morning.");
  await screen.getByRole("button", { name: "SAVE NOTE", exact: true }).click();
  await expect.element(screen.getByText("Daily note saved.")).toBeVisible();
  await userEvent.fill(editor(), "Morning. Then a long shift.");

  await screen.getByRole("button", { name: "OPEN WEEKLY INTERVIEW" }).click();
  await userEvent.fill(screen.getByLabelText("What's one thing to carry into next week?"), "Rest first");
  await screen.getByRole("button", { name: "SAVE TO NOTE" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText(/^Saved to the note for /)).toBeVisible();
  // No second block by accident: SAVE TO NOTE waits for a changed answer.
  await expect.element(screen.getByRole("button", { name: "SAVE TO NOTE" })).toBeDisabled();

  // NAV-REACH-001: BACK returns to the note the interview was opened from.
  await screen.getByRole("button", { name: "BACK TO DAILY NOTE" }).click();
  await expect.element(editor()).toHaveValue("Morning. Then a long shift.");
  await expect.element(screen.getByText(/^This note was saved somewhere else since you started this draft/)).toBeVisible();
  await screen.getByRole("button", { name: "SAVE NOTE", exact: true }).click();
  await expect.element(screen.getByText("Daily note saved. What was added elsewhere is kept at the end.")).toBeVisible();
  const text = (await db.dailyNotes.get(day.id))!.text;
  expect(text.startsWith("Morning. Then a long shift.\n\n#timeline Week ")).toBe(true);
  expect(text).toContain("A: Rest first");
});
