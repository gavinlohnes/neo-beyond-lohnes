import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { db } from "../../src/persistence/db";
import type { Learning } from "../../src/application/delta";
import { deriveLifecycle, projectResponses } from "../../src/application/learningLifecycle";
import { getReasoningKnowledge } from "../../src/application/learningQueries";
import { getWeeklyInterview } from "../../src/application/weeklyInterview";
import { WeeklyInterviewView } from "../../src/ui/screens/weekly/WeeklyInterviewView";
import { DeltaPanel } from "../../src/ui/components/DeltaViews";

/**
 * GRAYSON C6.1/C6.2 through the real UI: Delta's derived learnings are fixed here (deriving them needs weeks of
 * records); his answers go to the real database and the states come from the real lifecycle.
 */
const NOW = new Date();
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const TAG: Learning = { id: "tag-caffeine", kind: "TAG", learnedOn: ago(2), tag: "caffeine", taggedDays: 5,
  comparison: { id: "NEXT_SLEEP", withTag: { value: 360, days: 5 }, without: { value: 420, days: 9 } }, evidence: { days: [{ id: "d1", at: ago(2) }] } };
vi.mock("../../src/application/learningQueries", async (original) => ({ ...await original<typeof import("../../src/application/learningQueries")>(), getReasoningKnowledge: vi.fn() }));
vi.mock("../../src/application/weeklyInterview", async (original) => ({ ...await original<typeof import("../../src/application/weeklyInterview")>(), getWeeklyInterview: vi.fn(), getTimelineEntries: vi.fn(async () => []) }));
beforeEach(async () => {
  await db.events.clear();
  vi.mocked(getReasoningKnowledge).mockImplementation(async () => {
    const items = deriveLifecycle({ learnings: [TAG], responses: projectResponses(await db.events.where("type").equals("LEARNING_RESPONDED").toArray()), runningTags: new Set(), now: NOW });
    const states = new Map(items.map((i) => [i.learningId, i] as const));
    return { topics: [], learnings: [TAG].filter((l) => states.get(l.id)?.state !== "RETIRED"), suggestion: null, needle: { ready: false, judgedWeeks: 0, need: 4 }, states };
  });
  const date = (d: number) => ago(d).slice(0, 10);
  vi.mocked(getWeeklyInterview).mockResolvedValue({ from: date(6), to: date(0), days: [{ date: date(0), dayId: null, tags: [] } as never], questions: [] });
});
afterEach(async () => { await cleanup(); });
const answers = async () => (await db.events.where("type").equals("LEARNING_RESPONDED").toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map((e) => (e.payload as { action: string }).action);

describe("C6.2 weekly: what I think I'm learning", () => {
  it("asks about the pattern; KEEP confirms it, UNDO takes it back, NARROW names when, all readable at 320 px", async () => {
    await page.viewport(320, 900);
    const screen = await render(<WeeklyInterviewView />);
    const section = screen.getByRole("region", { name: "WHAT I THINK I'M LEARNING" });
    await expect.element(section.getByText(/Learned what #caffeine lines up with/)).toBeVisible();
    await expect.element(section.getByText("A possible pattern.")).toBeVisible();
    for (const b of section.element().querySelectorAll<HTMLButtonElement>(".learning-answer__actions button")) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect((await axe.run(section.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

    await section.getByRole("button", { name: "KEEP", exact: true }).click();
    await expect.element(section.getByText("You confirmed it.")).toBeVisible(); // stays on screen with its answer
    expect(await answers()).toEqual(["KEEP"]);
    await section.getByRole("button", { name: "UNDO MY ANSWER" }).click();
    await expect.element(section.getByText("A possible pattern.")).toBeVisible();

    await section.getByRole("button", { name: "NARROW", exact: true }).click();
    const save = section.getByRole("button", { name: "SAVE", exact: true });
    await expect.element(save).toBeDisabled(); // a condition first
    await section.getByRole("button", { name: "Work days", exact: true }).click();
    await section.getByRole("textbox", { name: "In your words (optional)" }).fill("after the 3rd night");
    await save.click();
    await expect.element(section.getByText("Only sometimes: work days — after the 3rd night.")).toBeVisible();
    expect(await answers()).toEqual(["KEEP", "UNDO", "NARROW"]);
  });
});

describe("C6.1 notebook", () => {
  it("DROP takes it out of the notebook into 'Dropped by you', and UNDO brings it back", async () => {
    await page.viewport(360, 900);
    const screen = await render(<DeltaPanel active />);
    const notebook = screen.getByRole("list", { name: "What DELTA learned, newest first" });
    await expect.element(notebook.getByText(/Learned what #caffeine lines up with/)).toBeVisible();
    await notebook.getByRole("button", { name: "DROP", exact: true }).click();
    await expect.element(screen.getByText("Nothing learned yet.", { exact: false })).toBeVisible();
    await screen.getByText("Dropped by you (1)").click();
    await screen.getByRole("list", { name: "Learnings you dropped" }).getByRole("button", { name: "UNDO MY ANSWER" }).click();
    await expect.element(screen.getByRole("list", { name: "What DELTA learned, newest first" }).getByText(/#caffeine/)).toBeVisible();
    expect(await answers()).toEqual(["DROP", "UNDO"]);
  });
});
