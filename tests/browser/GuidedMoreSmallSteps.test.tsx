import { beforeEach as optionalToolFixture } from "vitest";
import { setHiddenFeature } from "../../src/ui/hiddenFeatures";
optionalToolFixture(() => { for (const feature of ["minimumDay", "smallSteps", "foodLookup"] as const) setHiddenFeature(feature, true); });
/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { DailyControls as TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { getGuidedMoreStarts, GENERIC_MORE_STARTS } from "../../src/application/guidedMoreQueries";
import { startDay, setWorkContext, submitCheckIn, logWater, captureItem } from "../../src/application/commands";
import { getMinimumDayStatus, getEffectiveHydrationTotal, getOpenCaptureItems } from "../../src/application/queries";
import { startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { deriveCapacity } from "../../src/engine/capacity";
import { JournalScreen } from "../../src/ui/screens/more/JournalScreen";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { getDecisionJournalEntries } from "../../src/application/journalQueries";
import { createDecisionJournalEntry } from "../../src/application/journalCommands";
import { getMissions } from "../../src/application/intentQueries";
import { App } from "../../src/app/App";
import { mealButton, openMealInBody } from "./helpers/mealSheet";
import { searchCommand } from "./helpers/todayTools";

vi.mock("../../src/application/guidedMoreQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/guidedMoreQueries")>();
  return { ...actual, getGuidedMoreStarts: vi.fn(actual.getGuidedMoreStarts) };
});
vi.mock("../../src/application/journalQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/journalQueries")>();
  return { ...actual, getDecisionJournalEntries: vi.fn(actual.getDecisionJournalEntries) };
});
vi.mock("../../src/application/intentQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/intentQueries")>();
  return { ...actual, getMissions: vi.fn(actual.getMissions) };
});
vi.mock("../../src/application/commands", async (original) => {
  const actual = await original<typeof import("../../src/application/commands")>();
  return { ...actual, captureItem: vi.fn(actual.captureItem) };
});
vi.mock("../../src/application/queries", async (original) => {
  const actual = await original<typeof import("../../src/application/queries")>();
  return { ...actual, getOpenCaptureItems: vi.fn(actual.getOpenCaptureItems) };
});
beforeEach(() => { vi.mocked(getGuidedMoreStarts).mockReset(); vi.mocked(getDecisionJournalEntries).mockReset(); vi.mocked(getMissions).mockReset(); vi.mocked(captureItem).mockReset(); vi.mocked(getOpenCaptureItems).mockReset(); });
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });

describe("Guided MORE + Low-Energy TODAY", () => {
  it("Capture navigation retains an unsaved MORE writing draft without a discard dialog", async () => {
    const onCapture = vi.fn();
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      const screen = await render(<MoreScreen onOpenCapture={onCapture} />);
    await screen.getByText("A place to start", { exact: true }).first().click();
      await screen.getByRole("button", { name: "OPEN JOURNAL", exact: true }).click();
      await screen.getByText("Need a starting point?", { exact: true }).click();
      await screen.getByRole("button", { name: "GUIDE A DECISION" }).click();
      const title = screen.getByRole("textbox", { name: "Decision title", exact: true });
      await title.fill("Keep this unfinished choice");
      await screen.getByRole("button", { name: "WRITE A FREE NOTE" }).click();
      expect(confirmation).not.toHaveBeenCalled();
      expect(onCapture).toHaveBeenCalledOnce();
      await expect.element(title).toHaveValue("Keep this unfinished choice");
      expect(await db.decisionJournalEntries.count()).toBe(0);
    } finally { confirmation.mockRestore(); }
  });

  it("Capture failures keep text; a committed save with failed refresh is never blindly repeated", async () => {
    const day = await startDay();
    // TONIGHT-001: Small Steps sits in TOOLS opened from COMMAND → Today tools.
    const screen = await render(<TodayScreen openToolsOnMount />);
    await screen.getByRole("button", { name: "USE SMALL STEPS" }).click();
    await screen.getByRole("button", { name: "Put a thought down", exact: false }).click();
    const input = screen.getByRole("textbox", { name: "Capture a thought" });
    await input.fill("Preserve this note");
    vi.mocked(captureItem).mockRejectedValueOnce(new Error("Write interrupted"));
    await screen.getByRole("button", { name: "CAPTURE", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Your text is kept");
    await expect.element(input).toHaveValue("Preserve this note");
    expect(await db.captureItems.count()).toBe(0);
    vi.mocked(getOpenCaptureItems).mockRejectedValueOnce(new Error("Refresh interrupted"));
    await screen.getByRole("button", { name: "CAPTURE", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Note saved.");
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Do not save it again");
    await expect.element(input).toHaveValue("");
    await expect.element(screen.getByRole("button", { name: "CAPTURE", exact: true })).toBeDisabled();
    expect(await db.captureItems.count()).toBe(1);
    expect((await db.beyondDays.get(day.id))?.status).toBe("ACTIVE");
    expect(captureItem).toHaveBeenCalledTimes(2);
  });
  it.each(["DECISIONS", "PLANS"] as const)("%s read failure does not block manual starts, keeps drafts and retries without writes", async (kind) => {
    const query = kind === "DECISIONS" ? vi.mocked(getDecisionJournalEntries) : vi.mocked(getMissions);
    query.mockRejectedValueOnce(new Error("Read interrupted"));
    const screen = await render(kind === "DECISIONS" ? <JournalScreen /> : <IntentScreen />);
    await expect.element(screen.getByRole("alert")).toHaveTextContent("unavailable, not empty");
    if (kind === "DECISIONS") {
      await screen.getByText("Need a starting point?", { exact: true }).click();
      await screen.getByRole("button", { name: "GUIDE A DECISION" }).click();
    } else {
      await screen.getByText("Start a plan or a task", { exact: true }).click();
      await screen.getByRole("button", { name: "GUIDE A TASK" }).click();
    }
    const title = screen.getByRole("textbox", { name: kind === "DECISIONS" ? "Decision title" : "New obligation title", exact: true });
    await title.fill("Unsaved manual draft");
    await screen.getByRole("button", { name: `RETRY ${kind}` }).click();
    await expect.poll(() => screen.getByRole("alert").elements().length).toBe(0);
    await expect.element(title).toHaveValue("Unsaved manual draft");
    expect(await db.events.count()).toBe(0);
  });

  it("guided choices only write on explicit existing saves and free notes remain Capture", async () => {
    const onCapture = vi.fn();
    const screen = await render(<MoreScreen onOpenCapture={onCapture} />);
    await screen.getByText("A place to start", { exact: true }).first().click();
    await screen.getByRole("button", { name: "OPEN JOURNAL", exact: true }).click();
    await screen.getByText("Need a starting point?", { exact: true }).click();
    await screen.getByRole("button", { name: "WRITE A FREE NOTE" }).click();
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(await db.events.count()).toBe(0);
    await screen.getByRole("button", { name: "GUIDE A DECISION" }).click();
    await screen.getByRole("textbox", { name: "Decision title", exact: true }).fill("A real choice");
    await expect.element(screen.getByRole("button", { name: "RECORD DECISION", exact: true })).toBeDisabled();
    await screen.getByRole("textbox", { name: "Decision", exact: true }).fill("Choose a smaller next step");
    expect(await db.events.count()).toBe(0);
    await screen.getByRole("button", { name: "RECORD DECISION", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open A real choice" })).toBeVisible();
    expect(await db.events.where("type").equals("DECISION_JOURNAL_CREATED").count()).toBe(1);
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByRole("button", { name: "OPEN PLANS", exact: true }).click();
    await screen.getByText("Start a plan or a task", { exact: true }).click();
    await screen.getByRole("button", { name: "GUIDE A TASK" }).click();
    await screen.getByRole("textbox", { name: "New obligation title" }).fill("One deliberate commitment");
    expect(await db.obligations.count()).toBe(0);
    await screen.getByRole("button", { name: "CREATE OBLIGATION", exact: true }).last().click();
    await expect.element(screen.getByRole("button", { name: "Open One deliberate commitment" })).toBeVisible();
    expect(await db.events.where("type").equals("OBLIGATION_CREATED").count()).toBe(1);
    const obligation = (await db.obligations.toArray())[0]!;
    expect(obligation.dueAt).toBeUndefined();
    expect(obligation.plannedAt).toBeUndefined();
    expect(obligation.recurrence).toBeUndefined();
    expect(obligation.missionId).toBeUndefined();
  });
  it("re-entering a clean Journal starts at its list; Search opens the exact recorded decision", async () => {
    await createDecisionJournalEntry({ title: "Alpha decision", decision: "Pick alpha" });
    await createDecisionJournalEntry({ title: "Bravo decision", decision: "Pick bravo" });
    const screen = await render(<MoreScreen />);
    await screen.getByText("A place to start", { exact: true }).first().click();
    const alphaDetail = screen.getByRole("heading", { name: "Alpha decision", exact: true });
    const decisionsList = screen.getByRole("heading", { name: "Decisions", exact: true });
    await screen.getByRole("button", { name: "Open DECISION JOURNAL", exact: true }).click();
    await screen.getByRole("button", { name: "Open Alpha decision", exact: true }).click();
    await expect.element(alphaDetail).toBeVisible();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByRole("button", { name: "Open DECISION JOURNAL", exact: true }).click();
    await expect.element(decisionsList).toBeVisible();
    expect(alphaDetail.elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Open Alpha decision", exact: true }).click();
    await expect.element(alphaDetail).toBeVisible();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByRole("button", { name: "Open SEARCH", exact: true }).click();
    await screen.getByRole("textbox", { name: "Search everything" }).fill("Bravo");
    await screen.getByRole("button", { name: /: Bravo decision$/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Bravo decision", exact: true })).toBeVisible();
    expect(alphaDetail.elements()).toHaveLength(0);
    expect(await db.decisionJournalEntries.count()).toBe(2);
  });

  it.each([320, 360, 412])("keeps exactly two starts, free/manual writing, drafts and accessible navigation at %ipx", async (width) => {
    await page.viewport(width, 800);
    const before = await db.events.toArray();
    const onCapture = vi.fn();
    const screen = await render(<MoreScreen onOpenCapture={onCapture} />);
    await screen.getByText("A place to start", { exact: true }).first().click();
    await expect.poll(() => screen.getByRole("status").elements().length).toBe(0);
    expect(screen.container.querySelectorAll(".guided-starts li")).toHaveLength(2);
    const journal = screen.getByRole("button", { name: "OPEN JOURNAL", exact: true });
    journal.element().focus();
    await userEvent.keyboard("{Enter}");
    await screen.getByText("Need a starting point?", { exact: true }).click();
    await screen.getByRole("button", { name: "GUIDE A DECISION", exact: true }).click();
    const title = screen.getByRole("textbox", { name: "Decision title", exact: true });
    expect(document.activeElement).toBe(title.element());
    await title.fill("My unsaved choice");
    await screen.getByRole("textbox", { name: "Decision", exact: true }).fill("Try the smaller option");
    await screen.getByRole("button", { name: "WRITE WITHOUT GUIDANCE", exact: true }).click();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    expect(document.activeElement).toBe(journal.element());
    await journal.click();
    await expect.element(title).toHaveValue("My unsaved choice");
    await expect.element(screen.getByRole("textbox", { name: "Decision", exact: true })).toHaveValue("Try the smaller option");
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByRole("button", { name: "OPEN PLANS", exact: true }).click();
    await screen.getByText("Start a plan or a task", { exact: true }).click();
    await screen.getByRole("button", { name: "GUIDE A MISSION", exact: true }).click();
    await screen.getByRole("textbox", { name: "New mission title" }).fill("My direction draft");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.getByRole("button", { name: "GUIDE A TASK", exact: true }).click();
    const task = screen.getByRole("textbox", { name: "New obligation title" });
    expect(document.activeElement).toBe(task.element());
    await task.fill("A concrete step");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByRole("button", { name: "OPEN PLANS", exact: true }).click();
    await expect.element(task).toHaveValue("A concrete step");
    expect(await db.events.toArray()).toEqual(before);
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByText("Find the right destination", { exact: true }).click();
    await expect.element(screen.getByText("The full chronological event trail", { exact: false })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });

  it("clears contextual figures for failed refresh and pending retry, retains two truthful generic paths and recovers", async () => {
    const real = [{ ...GENERIC_MORE_STARTS[0], basis: "9 decisions await review." }, GENERIC_MORE_STARTS[1]] as const;
    let fail!: (reason: Error) => void;
    let recover!: (value: typeof real) => void;
    vi.mocked(getGuidedMoreStarts).mockResolvedValueOnce(real)
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { recover = resolve; }));
    const screen = await render(<MoreScreen />);
    await screen.getByText("A place to start", { exact: true }).first().click();
    await expect.element(screen.getByText("9 decisions await review.")).toBeVisible();
    await screen.getByRole("button", { name: "Open HISTORY", exact: true }).click();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await expect.element(screen.getByText("Reading context…", { exact: false })).toBeVisible();
    expect(screen.getByText("9 decisions await review.").elements()).toHaveLength(0);
    fail(new Error("Context interrupted"));
    await expect.element(screen.getByRole("alert")).toHaveTextContent("generic starts, not findings");
    expect(screen.container.querySelectorAll(".guided-starts li")).toHaveLength(2);
    await screen.getByRole("button", { name: "RETRY STARTING CONTEXT" }).click();
    await expect.element(screen.getByText("Reading context…", { exact: false })).toBeVisible();
    expect(screen.getByText("9 decisions await review.").elements()).toHaveLength(0);
    recover(real);
    await expect.element(screen.getByText("9 decisions await review.")).toBeVisible();
    expect(await db.events.count()).toBe(0);
  });

  it.each(["GREEN", "YELLOW", "RED"] as const)("Small Steps never changes %s capacity, Engine guidance or Minimum Day and preserves Capture drafts", async (capacity) => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    const issued = await submitCheckIn(day.id, capacity === "RED" ? { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 0 } : capacity === "YELLOW" ? { energy: 2, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } : { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    expect(deriveCapacity(issued.checkIn).capacity).toBe(capacity);
    const before = await db.events.toArray();
    const rec = await db.recommendations.toArray();
    // TONIGHT-001: Small Steps sits in TOOLS opened from COMMAND → Today tools.
    const screen = await render(<TodayScreen openToolsOnMount />);
    await expect.element(screen.getByRole("button", { name: "USE SMALL STEPS" })).toBeVisible();
    const system = screen.container.querySelector("[data-system-status]")?.textContent;
    const guidance = screen.container.querySelector(".console-guidance")?.textContent;
    await screen.getByRole("button", { name: "USE SMALL STEPS" }).click();
    await screen.getByRole("button", { name: "Put a thought down", exact: false }).click();
    const input = screen.getByRole("textbox", { name: "Capture a thought", exact: true });
    await expect.element(input).toBeVisible();
    expect(document.activeElement).toBe(input.element());
    await input.fill("An interrupted free thought");
    await screen.getByRole("button", { name: "BACK TO SMALL STEPS" }).click();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "USE FULL VIEW" }).element());
    await screen.getByRole("button", { name: "Inspect Minimum Day", exact: false }).click();
    // TONIGHT-001: TODAY no longer lifts a RED day's Minimum Day offer; it's the same TOOLS row at every capacity.
    await expect.element(screen.getByRole("button", { name: "ENABLE MINIMUM DAY", exact: true })).toBeVisible();
    expect((await getMinimumDayStatus(day.id)).enabled).toBe(false);
    await screen.getByRole("button", { name: "USE FULL VIEW" }).click();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "USE SMALL STEPS", exact: true }).element());
    await expect.element(input).toHaveValue("An interrupted free thought");
    expect(screen.container.querySelector("[data-system-status]")?.textContent).toBe(system);
    expect(screen.container.querySelector(".console-guidance")?.textContent).toBe(guidance);
    expect(screen.container.querySelectorAll(".console-guidance")).toHaveLength(1);
    expect(await db.recommendations.toArray()).toEqual(rec);
    expect(await db.events.toArray()).toEqual(before);
  });

  it("Small Steps survives the existing meal round trip with draft, focus and position retained", async () => {
    await page.viewport(360, 800);
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<App />);
    // TONIGHT-001: Small Steps is reached through COMMAND → Today tools.
    await searchCommand(screen, "today tools");
    await screen.getByRole("button", { name: /^TODAY TOOLS / }).click();
    await screen.getByRole("button", { name: "USE SMALL STEPS", exact: true }).click();
    await screen.getByRole("button", { name: "Put a thought down", exact: false }).click();
    await screen.getByRole("textbox", { name: "Capture a thought" }).fill("Keep my unfinished thought");
    const meal = mealButton(screen).element() as HTMLButtonElement;
    meal.focus();
    meal.scrollIntoView({ block: "center" });
    const origin = window.scrollY;
    await openMealInBody(screen);
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished meal");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await expect.poll(() => document.activeElement).toBe(meal);
    await expect.poll(() => Math.abs(window.scrollY - origin)).toBeLessThanOrEqual(2);
    await expect.element(screen.getByRole("button", { name: "USE FULL VIEW" })).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought" })).toHaveValue("Keep my unfinished thought");
    expect(await db.savedMeals.count()).toBe(0);
    expect(await db.captureItems.count()).toBe(0);
  });

  it("keeps explicit Minimum Day enable, foreground hydration and canonical undo intact", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    await logWater(day.id, 8);
    const rec = await db.recommendations.toArray();
    // TONIGHT-001: Small Steps sits in TOOLS opened from COMMAND → Today tools.
    const screen = await render(<TodayScreen openToolsOnMount />);
    await screen.getByRole("button", { name: "USE SMALL STEPS" }).click();
    await screen.getByRole("button", { name: "Inspect Minimum Day", exact: false }).click();
    expect((await getMinimumDayStatus(day.id)).enabled).toBe(false);
    await screen.getByRole("button", { name: "ENABLE MINIMUM DAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Open MINIMUM DAY", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Record what you drank" })).toBeVisible();
    await expect.poll(() => screen.getByRole("button", { name: "SHOW ALL TOOLS", exact: true }).elements().length).toBe(0);
    await screen.getByRole("button", { name: "+8 OZ", exact: true }).click();
    await expect.element(screen.getByText("8 oz recorded.", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(8);
    expect((await getMinimumDayStatus(day.id)).enabled).toBe(true);
    expect(await db.recommendations.toArray()).toEqual(rec);
    expect(await db.events.where("type").equals("MINIMUM_DAY_ENABLED").count()).toBe(1);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(2);
    expect(await db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);
  });

  it.each([320, 360, 412])("retains an active workout, unknown/manual paths and reduced-motion operation at %ipx", async (width) => {
    await page.viewport(width, 800);
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const before = await db.events.toArray();
    // TONIGHT-001: Small Steps sits in TOOLS opened from COMMAND → Today tools.
    const screen = await render(<TodayScreen openToolsOnMount onOpenTrain={vi.fn()} />);
    await expect.element(screen.getByRole("button", { name: "USE SMALL STEPS" })).toBeVisible();
    await screen.getByRole("button", { name: "USE SMALL STEPS" }).click();
    await expect.element(screen.getByRole("button", { name: /RESUME WORKOUT/ })).toBeVisible();
    await screen.getByRole("button", { name: "Put a thought down", exact: false }).click();
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought" })).toBeVisible();
    await screen.getByRole("button", { name: "SHOW ALL TOOLS" }).click();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(await db.events.toArray()).toEqual(before);
    expect((await db.workoutSessions.get(session.id))?.status).toBe("ACTIVE");
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });
});
