import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, endDay, setWorkContext, logProtein } from "../../src/application/commands";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import { getWeeklyReviewState, getWeeklyReviewRecords, type WeeklyReviewState } from "../../src/application/weeklyReviewQueries";
import { WeeklyReviewReadyLine } from "../../src/ui/components/WeeklyReviewReadyLine";
import { HistoryScreen } from "../../src/ui/screens/history/HistoryScreen";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { WeeklyReviewPanel } from "../../src/ui/screens/review/WeeklyReviewPanel";
import { db } from "../../src/persistence/db";
import "../../src/ui/styles/fonts";
vi.mock("../../src/application/weeklyReviewCommands", async (original) => {
  const actual = await original<typeof import("../../src/application/weeklyReviewCommands")>();
  return { ...actual, saveWeeklyReview: vi.fn(actual.saveWeeklyReview) };
});
vi.mock("../../src/application/weeklyReviewQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/weeklyReviewQueries")>();
  return { ...actual, getWeeklyReviewState: vi.fn(actual.getWeeklyReviewState) };
});
function clock(date = new Date(2026, 9, 19, 20)) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(date); }
async function seed() {
  clock(new Date(2026, 9, 13, 20)); const previous = await startDay(); await logProtein(previous.id, 50); await endDay(previous.id);
  clock(); const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); return day;
}
afterEach(async () => { await cleanup(); vi.mocked(saveWeeklyReview).mockClear(); vi.mocked(getWeeklyReviewState).mockClear(); vi.useRealTimers(); await page.viewport(1280, 800); });
for (const width of [320, 360, 412]) it(`saves a note/focus via TODAY→Review, retains a tab-detour draft and reloads at ${width}px`, async () => {
  await page.viewport(width, 800); await seed(); const recommendations = await db.recommendations.toArray();
  let screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "OPEN REVIEW", exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  await screen.getByRole("button", { name: "OPEN REVIEW", exact: true }).click();
  const panel = screen.getByRole("region", { name: "Weekly review", exact: true });
  // The Weekly Review dashboard (2026-10-18) shows the week's logged protein in its headline.
  await expect.element(panel.getByText("Recorded on 1 day", { exact: true })).toBeVisible();
  await panel.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Protein logging was easier on shift.");
  await panel.getByRole("combobox", { name: /Your focus for the week starting/ }).selectOptions('CUSTOM');
  await panel.getByRole("textbox", { name: "Written focus", exact: true }).fill("Eat before I leave for work.");
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await expect.element(panel.getByRole("textbox", { name: "Written focus", exact: true })).toHaveValue("Eat before I leave for work.");
  await panel.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
  await expect.element(panel.getByRole("status")).toHaveTextContent("Weekly review saved on this device");
  expect(await getWeeklyReviewRecords()).toHaveLength(1);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "OPEN REVIEW", exact: true })).not.toBeInTheDocument();
  await cleanup(); screen = await render(<App />);
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await screen.getByRole("button", { name: "Open REVIEW", exact: true }).click();
  const reloaded = screen.getByRole("region", { name: "Weekly review", exact: true });
  await reloaded.getByText(/Saved review · starting/).click();
  await expect.element(reloaded.getByRole("textbox", { name: "What stood out? (optional)", exact: true })).toHaveValue("Protein logging was easier on shift.");
  await expect.element(reloaded.getByRole("textbox", { name: "Written focus", exact: true })).toHaveValue("Eat before I leave for work.");
  await reloaded.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Revised note.");
  await reloaded.getByRole("button", { name: "SAVE REVIEW CHANGES", exact: true }).click();
  await expect.poll(async () => (await getWeeklyReviewRecords()).length).toBe(2);
  expect(await db.recommendations.toArray()).toEqual(recommendations);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.querySelector("main")!)).violations).toEqual([]);
});
it.each(["PRE_WORK", "SCHEDULED_SHIFT", "EXPECTED_POST_WORK"] as const)("keeps the quiet notice out of %s", async (phase) => {
  await seed(); const screen = await render(<WeeklyReviewReadyLine phase={phase} now={new Date()} onOpen={() => {}} />);
  expect(screen.getByRole("button", { name: "OPEN REVIEW", exact: true }).elements()).toHaveLength(0);
});
it("LATER lasts only until the lived-day boundary", async () => {
  await seed(); const screen = await render(<WeeklyReviewReadyLine phase="OFF" now={new Date()} onOpen={() => {}} />);
  await screen.getByRole("button", { name: "LATER", exact: true }).click();
  expect(screen.getByRole("button", { name: "OPEN REVIEW", exact: true }).elements()).toHaveLength(0);
  clock(new Date(2026, 9, 20, 16, 30));
  await screen.rerender(<WeeklyReviewReadyLine phase="OFF" now={new Date()} onOpen={() => {}} />);
  await expect.element(screen.getByRole("button", { name: "OPEN REVIEW", exact: true })).toBeVisible();
});
it("keeps an unfinished old-week draft when the next review week becomes available", async () => {
  await seed(); const screen = await render(<WeeklyReviewPanel />);
  await screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Keep this unfinished note.");
  clock(new Date(2026, 9, 26, 17)); document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(screen.getByRole("button", { name: "OPEN CURRENT WEEK", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true })).toHaveValue("Keep this unfinished note.");
  await expect.element(screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true })).toBeDisabled();
  expect(await getWeeklyReviewRecords()).toHaveLength(0);
});

it("keeps the draft after a failed save and saves once on an explicit retry", async () => {
  await seed(); vi.mocked(saveWeeklyReview).mockRejectedValueOnce(new Error("Storage unavailable"));
  const screen = await render(<WeeklyReviewPanel />);
  await screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Keep this note after a failure.");
  await screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Storage unavailable");
  await expect.element(screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true })).toHaveValue("Keep this note after a failure.");
  expect(await getWeeklyReviewRecords()).toHaveLength(0);
  await screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
  await expect.poll(async () => (await getWeeklyReviewRecords()).length).toBe(1);
});

it("starts a clean new week without carrying saved notes forward as a new draft", async () => {
  await seed(); const screen = await render(<WeeklyReviewPanel />);
  await screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Last week's saved note.");
  await screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("Weekly review saved");
  clock(new Date(2026, 9, 26, 17)); document.dispatchEvent(new Event("visibilitychange"));
  await screen.getByText(/Review week · starting Oct 19, 2026/).click();
  await expect.element(screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true })).toHaveValue("");
  await expect.element(screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true })).toBeEnabled();
  expect((await getWeeklyReviewRecords())[0]!.note).toBe("Last week's saved note.");
});
it("keeps a maximum-length unbroken saved note readable inside narrow History", async () => {
  await page.viewport(320, 800); const day = await seed(); const week = latestReviewWeek(new Date());
  const note = "A".repeat(4000);
  await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note, focus: null, expectedPreviousId: null });
  const screen = await render(<HistoryScreen focusDayId={day.id} />);
  await expect.element(screen.getByText(/Weekly review saved for/)).toHaveTextContent(note);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
});

it("ignores an old post-save read after a newer week read has completed", async () => {
  await seed(); const old = await getWeeklyReviewState();
  const screen = await render(<WeeklyReviewPanel />);
  await screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Persist this before the boundary.");
  let finish!: (state: WeeklyReviewState) => void;
  const delayed = new Promise<WeeklyReviewState>((resolve) => { finish = resolve; });
  vi.mocked(getWeeklyReviewState).mockReturnValueOnce(delayed);
  await screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
  await expect.poll(async () => (await getWeeklyReviewRecords()).length).toBe(1);
  clock(new Date(2026, 9, 26, 17)); document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(screen.getByRole("button", { name: "OPEN CURRENT WEEK", exact: true })).toBeVisible();
  finish(old);
  await expect.element(screen.getByRole("button", { name: "OPEN CURRENT WEEK", exact: true })).toBeEnabled();
  await screen.getByRole("button", { name: "OPEN CURRENT WEEK", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true })).toHaveValue("");
  expect((await getWeeklyReviewRecords())[0]!.note).toBe("Persist this before the boundary.");
});

// A refresh must consult the live form, not the clean state captured before typing.
it("keeps a draft typed while a new-week refresh is pending", async () => {
  await seed(); const screen = await render(<WeeklyReviewPanel />);
  const note = screen.getByRole("textbox", { name: "What stood out? (optional)", exact: true });
  await expect.element(note).toHaveValue("");
  let finish!: (state: WeeklyReviewState) => void;
  const delayed = new Promise<WeeklyReviewState>((resolve) => { finish = resolve; });
  vi.mocked(getWeeklyReviewState).mockReturnValueOnce(delayed);
  clock(new Date(2026, 9, 26, 17)); document.dispatchEvent(new Event("visibilitychange"));
  await expect.poll(() => vi.mocked(getWeeklyReviewState).mock.results.some((result) => result.value === delayed)).toBe(true);
  await note.fill("Typed during refresh; keep this draft.");
  const next = await vi.mocked(getWeeklyReviewState).getMockImplementation()!();
  finish(next);
  await expect.element(screen.getByRole("button", { name: "OPEN CURRENT WEEK", exact: true })).toBeVisible();
  await expect.element(note).toHaveValue("Typed during refresh; keep this draft.");
  await expect.element(screen.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true })).toBeDisabled();
  expect(await getWeeklyReviewRecords()).toHaveLength(0);
});
