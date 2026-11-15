import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { getTodayBriefing, type TodayBriefing } from "../../src/application/todayBriefing";
import { TodayBriefingPreview } from "../../src/ui/screens/today/TodayBriefingPreview";
import "../../src/ui/styles/global.css";

vi.mock("../../src/application/todayBriefing", async (original) => ({ ...await original<typeof import("../../src/application/todayBriefing")>(), getTodayBriefing: vi.fn() }));
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });

const briefing: TodayBriefing = {
  started: true,
  now: {
    label: "WORK RUN",
    line: "Shift 1 of 3. Fuel, water and sleep between shifts carry the run.",
    why: ["Today: a work day, set from your saved schedule when the day started."],
    guidance: { title: "Train after your shift", rationale: "You checked in GREEN." },
  },
  next: { line: "Next day off: Sat, Nov 21 · forecast", why: "Next: a day off on Sat, Nov 21, from your saved schedule (a forecast, not a record).", confirmed: 0 },
  handled: [{
    id: "garmin-sleep",
    line: "Garmin sleep synced: 7h 30m",
    detail: "Imported from Garmin. Review it in BODY; nothing was applied as advice.",
    open: "BODY_SLEEP",
  }],
};

it("shows NOW, NEXT and handled at phone width, and opens existing destinations without writing", async () => {
  await page.viewport(320, 850);
  vi.mocked(getTodayBriefing).mockResolvedValue(briefing);
  const onOpen = vi.fn();
  const onBack = vi.fn();
  const screen = await render(<TodayBriefingPreview active onBack={onBack} onOpen={onOpen} />);
  const region = screen.getByRole("region", { name: "TODAY briefing preview" });
  await expect.element(region).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "NOW" })).toBeVisible();
  await expect.element(screen.getByText(briefing.now.guidance!.title, { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "NEXT" })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "WHAT BEYOND HANDLED" })).toBeVisible();
  expect(screen.container.textContent).toContain("Preview only");
  expect(screen.container.textContent).not.toMatch(/\b(ACCEPT|DECLINE|CHECK IN)\b/);
  expect(screen.container.scrollWidth).toBeLessThanOrEqual(320);
  expect((await axe.run(screen.container)).violations).toEqual([]);
  await screen.getByRole("button", { name: "OPEN WEEK AHEAD" }).click();
  await screen.getByRole("button", { name: "REVIEW SLEEP" }).click();
  await screen.getByRole("button", { name: "BACK TO TODAY" }).click();
  expect(onOpen).toHaveBeenCalledWith("PLAN");
  expect(onOpen).toHaveBeenCalledWith("BODY_SLEEP");
  expect(onBack).toHaveBeenCalledOnce();
});

it("stays honest when empty, and a failed read offers retry instead of stale briefing", async () => {
  vi.mocked(getTodayBriefing).mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue({
    started: false,
    now: { label: "TODAY", line: "Start your day on TODAY to open a briefing from your records.", why: ["No lived day is started yet. The briefing does not invent a state."], guidance: null },
    next: null,
    handled: [],
  });
  const screen = await render(<TodayBriefingPreview active onBack={vi.fn()} />);
  await screen.getByRole("button", { name: "RETRY BRIEFING" }).click();
  await expect.element(screen.getByText("Start your day on TODAY to open a briefing from your records.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Nothing next is known yet.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Nothing BEYOND has imported to show here yet.", { exact: true })).toBeVisible();
});

it("opens from TODAY below Engine guidance and returns without writing or replacing TODAY", async () => {
  const { App } = await import("../../src/app/App");
  const { startDay, submitCheckIn, updateSchedulePattern } = await import("../../src/application/commands");
  const { DEFAULT_SCHEDULE_PATTERN } = await import("../../src/engine/scheduledContext");
  const { db } = await import("../../src/persistence/db");
  const { id: _id, createdAt: _c, updatedAt: _u, ...rotation } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(rotation);
  const day = await startDay("2026-11-18T20:00:00");
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  vi.mocked(getTodayBriefing).mockResolvedValue(briefing);
  const screen = await render(<App />);
  const entry = screen.getByRole("button", { name: "PREVIEW BRIEFING" });
  await expect.element(entry).toBeVisible();
  const guidance = entry.element().closest('[aria-label="Next action"], [aria-label="Current recommendation"]');
  const headline = guidance?.querySelector("h2");
  expect(guidance).not.toBeNull();
  expect(Boolean(headline && (headline.compareDocumentPosition(entry.element()) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const before = await db.events.count();
  await entry.click();
  await expect.element(screen.getByRole("region", { name: "TODAY briefing preview" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "PREVIEW BRIEFING" })).not.toBeInTheDocument();
  expect(await db.events.count()).toBe(before);
  await screen.getByRole("button", { name: "BACK TO TODAY" }).click();
  await expect.element(screen.getByRole("button", { name: "PREVIEW BRIEFING" })).toBeVisible();
  await expect.element(screen.getByRole("region", { name: "TODAY briefing preview" })).not.toBeInTheDocument();
  expect(await db.events.count()).toBe(before);
});
