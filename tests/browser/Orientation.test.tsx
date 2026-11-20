import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { Orientation, type OrientationRoutes } from "../../src/ui/screens/today/Orientation";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { deriveOrientation, getOrientation, type OrientationInput } from "../../src/application/orientation";
import { logSleep, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getActiveDay } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import "../../src/ui/styles/global.css";

/**
 * GRAYSON C1.1 · Orientation slice 1 (Gavin, 2026-11-20). Sat Nov 14 2026, 15:05, night 2 of 3. The states render at
 * phone widths from the same pure composition the app uses; the flow test runs through TODAY with real records.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves each state's screenshot for the PR.
 */
vi.mock("../../src/application/orientation", async (original) => {
  const mod = await original<typeof import("../../src/application/orientation")>();
  return { ...mod, getOrientation: vi.fn(mod.getOrientation) };
});
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const OPEN_PREP = { FOOD: { id: null, value: "UNCONFIRMED" as const, recordedAt: null }, BOTTLE: { id: null, value: "UNCONFIRMED" as const, recordedAt: null } };
const input = (over: Partial<OrientationInput> = {}): OrientationInput => ({
  now: at(14, 15, 5), day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "WORK" }, contextBySchedule: true, scheduled: "WORK",
  picture: { now: { state: "WORK_RUN", label: "WORK RUN", line: "Shift 2 of 3. Fuel, water and sleep between shifts carry the run.", why: [] }, next: null },
  shift: { start: at(14, 18), end: at(15, 6) }, run: { position: 2, length: 3 },
  plan: { shift: { date: "2026-11-14", start: at(14, 18).toISOString(), end: at(15, 6).toISOString(), overnight: true, firstOfRun: false, lastOfRun: false },
    cards: [], windows: [{ kind: "NAP", start: at(14, 15).toISOString(), end: at(14, 17).toISOString(), basis: "RHYTHM" }], caffeine: { hours: 6, setBy: "DEFAULT" }, caffeineAt: at(15, 1, 30).toISOString() },
  sleep: { minutes: 400, fromGarmin: true, band: { low: 415, high: 470, kind: "WORK" } }, checkIn: null, recommendation: null,
  draft: { kind: "RECOVER", title: "Protect recovery", reason: "Your last two main sleeps were below your usual range for those kinds of day.", nights: [{ livedDayStart: "", minutes: 400, kind: "WORK", low: 415, high: 470 }, { livedDayStart: "", minutes: 395, kind: "WORK", low: 415, high: 470 }] },
  prep: OPEN_PREP, obligations: [{ id: "vet", title: "Call the vet", dueAt: "2026-11-14", remindAt: "16:00", status: "OPEN" }], ...over,
});
const STATES: Record<string, OrientationInput> = {
  "work-draft": input(),
  "after-check-in": input({ checkIn: { energy: 4, stress: 2, mood: 4 }, draft: null, recommendation: { kind: "EXECUTE_PLANNED_WORK", title: "Proceed with planned work — reduced session", rationale: "Capacity is good and there is planned work for today. Your last two main sleeps were below your usual range, so the reduced session is suggested.", suggestedCommand: "START_WORKOUT" } }),
  "unknown-sparse": input({ day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "UNKNOWN" }, picture: { now: null, next: null }, sleep: null, draft: null, plan: null, obligations: [] }),
  "source-failed": input({ sleep: "ERROR", draft: null, prep: "ERROR" }),
};
type MockRoutes = { [K in keyof OrientationRoutes]-?: Mock<NonNullable<OrientationRoutes[K]>> };
const routes = (): MockRoutes => ({
  onEnter: vi.fn(), onCheckIn: vi.fn(), onPrep: vi.fn(), onCapture: vi.fn(), onTrain: vi.fn(), onSleep: vi.fn(), onCommitment: vi.fn(), onSetContext: vi.fn(async (_value: "WORK" | "OFF") => {}),
});
const settle = async () => { await document.fonts.ready; await new Promise((r) => setTimeout(r, 150)); };

describe("Orientation states", () => {
  afterEach(async () => { await cleanup(); vi.mocked(getOrientation).mockReset(); });
  for (const width of [320, 360, 412]) {
    for (const [name, state] of Object.entries(STATES)) {
      it(`${name} at ${width} px: one recommendation at most, no overflow, accessible`, async () => {
        await page.viewport(width, 900);
        vi.mocked(getOrientation).mockResolvedValue(deriveOrientation(state));
        const r = routes();
        const screen = await render(<Orientation active busy={false} refreshKey={0} routes={r} />);
        await expect.element(screen.getByRole("button", { name: "ENTER TODAY" })).toBeVisible();
        expect(document.querySelectorAll("[aria-labelledby='orient-rec']").length).toBeLessThanOrEqual(1);
        expect(document.querySelectorAll(".orientation__row--action").length).toBeLessThanOrEqual(2);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
        if (SHOTS) { await page.viewport(width, Math.ceil(document.documentElement.scrollHeight)); await settle(); await page.screenshot({ path: `${SHOTS}/${width}-${name}.png` }); }
      });
    }
  }

  it("work day before check-in: tonight, your range, Delta, the draft, the runway and the actions route to existing surfaces", async () => {
    await page.viewport(360, 900);
    vi.mocked(getOrientation).mockResolvedValue(deriveOrientation(STATES["work-draft"]!));
    const r = routes();
    const screen = await render(<Orientation active busy={false} refreshKey={0} routes={r} />);
    await expect.element(screen.getByText("on shift · in 2 h 55 min")).toBeVisible();
    await expect.element(screen.getByText("Under your work-day range (6:55–7:50).")).toBeVisible();
    await expect.element(screen.getByText("Protect recovery")).toBeVisible();
    await expect.element(screen.getByText("DRAFT", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/^Two short sleeps going into night 2 of 3\./)).toBeVisible();
    expect([...document.querySelectorAll(".orientation__time")].map((e) => e.textContent)).toEqual(["15:05", "15:05", "16:00", "18:00", "01:30"]);
    await screen.getByRole("button", { name: "CHECK IN" }).click();
    await screen.getByRole("button", { name: "OPEN PREP" }).click();
    await screen.getByRole("button", { name: "+ CAPTURE A THOUGHT" }).click();
    await screen.getByRole("button", { name: "ENTER TODAY" }).click();
    expect([r.onCheckIn, r.onPrep, r.onCapture, r.onEnter].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
  });

  it("unknown day asks WORK or OFF and answers through the existing command", async () => {
    await page.viewport(360, 900);
    vi.mocked(getOrientation).mockResolvedValue(deriveOrientation(STATES["unknown-sparse"]!));
    const r = routes();
    const screen = await render(<Orientation active busy={false} refreshKey={0} routes={r} />);
    await expect.element(screen.getByText("Your saved schedule predicts a work day, but today isn't confirmed.")).toBeVisible();
    await expect.element(screen.getByText("No main sleep is recorded since the shift.")).toBeVisible();
    expect(document.querySelector("[aria-labelledby='orient-delta']")).toBeNull();
    await screen.getByRole("button", { name: "WORK", exact: true }).click();
    expect(r.onSetContext).toHaveBeenCalledWith("WORK");
  });

  it("a failed read says so and offers RETRY; the rest still works", async () => {
    await page.viewport(360, 900);
    const spy = vi.mocked(getOrientation); spy.mockResolvedValue(deriveOrientation(STATES["source-failed"]!));
    const screen = await render(<Orientation active busy={false} refreshKey={0} routes={routes()} />);
    await expect.element(screen.getByText("Sleep couldn't be read. Your records are unchanged.")).toBeVisible();
    await expect.element(screen.getByText("Some records couldn't be read (sleep, preparation). Your records are unchanged.")).toBeVisible();
    await screen.getByRole("button", { name: "RETRY" }).click();
    await expect.poll(() => spy.mock.calls.length).toBe(2);
  });
});

describe("Orientation through TODAY with real records", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(13, 16, 31));
    const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
    await updateSchedulePattern(schedule);
    await startDay(at(13, 16, 30).toISOString());
    vi.setSystemTime(at(14, 14, 50));
    await logSleep((await getActiveDay())!.id, 400, "PRIMARY");
    vi.setSystemTime(at(14, 15, 5));
  });
  afterEach(async () => { await cleanup(); vi.useRealTimers(); });

  it("START DAY opens Orientation without writing anything more; ENTER TODAY returns; ORIENTATION reopens it", async () => {
    await page.viewport(360, 900);
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await screen.getByRole("region", { name: "Start your day" }).getByRole("button", { name: "START DAY" }).click();
    await expect.element(screen.getByText("BEYOND // ORIENT")).toBeVisible();
    await expect.element(screen.getByText("on shift · in 2 h 55 min")).toBeVisible();
    const events = await db.events.count();
    await screen.getByRole("button", { name: "ENTER TODAY" }).click();
    await expect.element(screen.getByText("BEYOND // TODAY")).toBeVisible();
    expect(await db.events.count()).toBe(events);
    // Reviewed on this device: the entry reads ORIENTATION and reopens it.
    await screen.getByRole("button", { name: "ORIENTATION" }).click();
    await expect.element(screen.getByText("BEYOND // ORIENT")).toBeVisible();
  });

  it("CHECK IN from Orientation opens the existing check-in over it", async () => {
    await page.viewport(360, 900);
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await screen.getByRole("region", { name: "Start your day" }).getByRole("button", { name: "START DAY" }).click();
    await expect.element(screen.getByText("BEYOND // ORIENT")).toBeVisible();
    await screen.getByRole("button", { name: "CHECK IN" }).click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
  });

  it("a work day started by the 16:30 roll offers ORIENT TODAY quietly, and it reads ORIENTATION once seen", async () => {
    localStorage.removeItem("beyond.orientation.v1");
    vi.setSystemTime(at(14, 16, 31));
    await startDay(at(14, 16, 30).toISOString());
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await screen.getByRole("button", { name: "ORIENT TODAY" }).click();
    await expect.element(screen.getByText("BEYOND // ORIENT")).toBeVisible();
    await screen.getByRole("button", { name: "ENTER TODAY" }).click();
    await expect.element(screen.getByRole("button", { name: "ORIENTATION" })).toBeVisible();
  });
});
