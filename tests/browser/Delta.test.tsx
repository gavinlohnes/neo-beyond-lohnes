/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { PersonalUnderstanding } from "../../src/ui/screens/review/PersonalUnderstanding";
import { DailyNoteScreen } from "../../src/ui/screens/more/DailyNoteScreen";
import { DeltaNewsLine } from "../../src/ui/components/DeltaViews";
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
    await expect.element(screen.getByText("I know 0 of 5 things so far. I learn from what you log; I never guess.")).toBeVisible();
    await expect.element(screen.getByText(/Nothing learned yet\./)).toBeVisible();
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

  it("TODAY's DELTA line stays silent when nothing new was learned", async () => {
    await startDay();
    const screen = await render(<DeltaNewsLine active />);
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.container.textContent).toBe("");
  });
});
