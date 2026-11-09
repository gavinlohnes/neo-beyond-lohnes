/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { PersonalUnderstanding } from "../../src/ui/screens/review/PersonalUnderstanding";
import { DailyNoteScreen } from "../../src/ui/screens/more/DailyNoteScreen";
import { DeltaNewsLine, DeltaWeek, ExperimentOffer } from "../../src/ui/components/DeltaViews";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** DELTA-GROWS-001: DELTA's map, its daily question, and TODAY's line staying silent when nothing is new. */
afterEach(async () => { await cleanup(); sessionStorage.clear(); localStorage.clear(); });

describe("DELTA-GROWS-001", () => {
  it("opens Personal Understanding on DELTA: what it knows, still learning, and an honest empty notebook", async () => {
    await startDay();
    const screen = await render(<PersonalUnderstanding active />);
    await screen.getByText("PERSONAL UNDERSTANDING").click();
    await expect.element(screen.getByText("DELTA · WHAT I KNOW ABOUT YOU", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("I know 0 of 7 things so far. I learn from what you log; I never guess.")).toBeVisible();
    await expect.element(screen.getByText(/Nothing learned yet\./)).toBeVisible();
    await expect.element(screen.getByText("DELTA · LOOKING AHEAD")).toBeVisible();
    await expect.element(screen.getByText("A forecast from your schedule and your own records. I suggest; I never book anything or change advice.")).toBeVisible();
  });

  it("asks one question in the daily note; ANSWER IN NOTE puts it in the draft without saving", async () => {
    const day = await startDay();
    const screen = await render(<DailyNoteScreen active />);
    const q = screen.getByRole("group", { name: "DELTA's question" });
    await expect.element(q.getByText(/DELTA ASKS/)).toBeVisible();
    await q.getByRole("button", { name: "ANSWER IN NOTE" }).click();
    await expect.poll(() => (screen.container.querySelector("textarea") as HTMLTextAreaElement | null)?.value ?? "").toMatch(/^(What|How)[^\n]+\n$/);
    expect(await db.dailyNotes.get(day.id)).toBeUndefined();
  });

  it("answers DELTA's question in one tap, drafted with the question, not saved", async () => {
    const day = await startDay();
    const screen = await render(<DailyNoteScreen active />);
    const q = screen.getByRole("group", { name: "DELTA's question" });
    await q.getByRole("button", { name: "GOOD" }).click();
    await expect.poll(() => (screen.container.querySelector("textarea") as HTMLTextAreaElement | null)?.value ?? "").toMatch(/^(What|How)[^\n]+ Good\.\n$/);
    expect(await db.dailyNotes.get(day.id)).toBeUndefined();
  });

  it("DELTA's experiment offer starts a real 14-day experiment only on the tap", async () => {
    await startDay();
    const before = await db.decisionJournalEntries.count();
    const screen = await render(<ExperimentOffer suggestion={{ tag: "latecoffee", what: "Skip #latecoffee", days: 14, minutesLess: 70, taggedDays: 5, withDays: 5, withoutDays: 9 }} />);
    await expect.element(screen.getByText(/After 5 days with #latecoffee, the sleep you logged the next day was 1h 10m shorter than after 9 other noted days\./)).toBeVisible();
    expect(await db.decisionJournalEntries.count()).toBe(before);
    await screen.getByRole("button", { name: "START 14-DAY TEST" }).click();
    await expect.element(screen.getByText(/Started: "Skip #latecoffee" for 14 days/)).toBeVisible();
    const entries = await db.decisionJournalEntries.toArray();
    expect(entries.filter((e) => e.title === "Try: Skip #latecoffee")).toHaveLength(1);
  });

  it("the weekly review's DELTA panel says plainly when nothing changed that week", async () => {
    await startDay();
    const screen = await render(<DeltaWeek active week={{ start: "2026-10-05T21:30:00.000Z", end: "2026-10-12T21:30:00.000Z" }} />);
    await expect.element(screen.getByText("DELTA · WHAT CHANGED THIS WEEK")).toBeVisible();
    await expect.element(screen.getByText("Nothing new this week. DELTA only speaks when your records show something.")).toBeVisible();
  });

  it("TODAY's DELTA line stays silent when nothing new was learned", async () => {
    await startDay();
    const screen = await render(<DeltaNewsLine active />);
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.container.textContent).toBe("");
  });
});
