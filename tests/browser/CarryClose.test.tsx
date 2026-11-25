import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import "../../src/ui/screens/more/operator.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import { completeShiftDown, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-CARRY-001: after SHIFT DOWN the close names what he planned and didn't get to, one tap each; PLANS keeps
 * anything planned for a passed day. Sat Nov 14 2026 is a night shift (as CloseGaps); the close is Sunday 06:45.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
let dayId = "";
let vet = "", oil = "";
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
  oil = (await createObligation({ title: "Book the oil change", plannedAt: "2026-11-13" })).id;
  vet = (await createObligation({ title: "Call the vet about Max's shots", plannedAt: "2026-11-14", dueAt: "2026-11-20" })).id;
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); await page.viewport(1280, 800); });
async function shiftDown() {
  vi.setSystemTime(at(15, 6, 5)); await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30)); const started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 40)); await completeShiftDown(dayId, started);
  vi.setSystemTime(at(15, 6, 45));
}
const block = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("group", { name: "Didn't get to (2)" });

describe("GRAYSON-CARRY-001 the close", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: two rows, oldest first, 44 px buttons, no red, no overflow, axe clean`, async () => {
      await page.viewport(width, 800);
      await shiftDown();
      const screen = await render(<TodayScreen onOpenLife={() => {}} />);
      const carry = block(screen);
      await expect.element(carry).toBeVisible();
      const titles = [...carry.element().querySelectorAll(".today-close__carry-title")].map((e) => e.textContent);
      expect(titles).toEqual(["Book the oil change planned Fri", "Call the vet about Max's shots planned Sat"]);
      for (const b of carry.element().querySelectorAll("button")) {
        expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(getComputedStyle(b).color).not.toBe("rgb(208, 20, 27)");
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      const close = screen.getByRole("region", { name: "Close the day" });
      expect((await axe.run(close.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
      close.element().scrollIntoView({ block: "center" });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/close-carry-${width}.png`, element: close.element() as HTMLElement });
    });
  }

  it("NEXT DAY plans Sunday and keeps the due date; UNDO puts Saturday back; NO DAY clears it; DONE asks first", async () => {
    await page.viewport(360, 800);
    await shiftDown();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const vetRow = () => block(screen).getByRole("listitem").filter({ hasText: "Call the vet" });
    await vetRow().getByRole("button", { name: "NEXT DAY" }).click();
    await expect.element(vetRow().getByText("Planned for Sun.")).toBeVisible();
    expect(await db.obligations.get(vet)).toMatchObject({ plannedAt: "2026-11-15", dueAt: "2026-11-20" });
    await vetRow().getByRole("button", { name: /^Undo: / }).click();
    await expect.element(vetRow().getByRole("button", { name: "NEXT DAY" })).toBeVisible();
    expect((await db.obligations.get(vet))!.plannedAt).toBe("2026-11-14");
    await vetRow().getByRole("button", { name: "NO DAY" }).click();
    await expect.element(vetRow().getByText(/^No day now\./)).toBeVisible();
    expect((await db.obligations.get(vet))!.plannedAt).toBeUndefined();
    const oilRow = block(screen).getByRole("listitem").filter({ hasText: "oil change" });
    await oilRow.getByRole("button", { name: "DONE" }).click();
    expect((await db.obligations.get(oil))!.status).toBe("OPEN"); // asked first
    await oilRow.getByRole("button", { name: "NOT YET" }).click();
    await oilRow.getByRole("button", { name: "DONE" }).click();
    await oilRow.getByRole("button", { name: "YES, DONE" }).click();
    await expect.element(oilRow.getByText("Done.")).toBeVisible();
    expect((await db.obligations.get(oil))!.status).toBe("SATISFIED");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/close-carry-after-360.png`, element: screen.getByRole("region", { name: "Close the day" }).element() as HTMLElement });
  });

  it("works from the keyboard alone, and a task changed elsewhere is refused with a plain line", async () => {
    await shiftDown();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const vetRow = block(screen).getByRole("listitem").filter({ hasText: "Call the vet" });
    await expect.element(vetRow).toBeVisible();
    await db.obligations.update(vet, { updatedAt: new Date(at(15, 6, 44)).toISOString() });
    (vetRow.getByRole("button", { name: "NEXT DAY" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(vetRow.getByRole("alert")).toHaveTextContent("This task changed. Open PLANS to see it.");
    expect((await db.obligations.get(vet))!.plannedAt).toBe("2026-11-14");
  });

  it("his switch hides the block; leaving the block alone changes nothing", async () => {
    await shiftDown();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.element(block(screen)).toBeVisible();
    await screen.getByRole("button", { name: "CHANGE QUESTIONS" }).click();
    await screen.getByLabelText(`Show "Didn't get to"`).click();
    await screen.getByRole("button", { name: "DONE", exact: true }).click();
    expect(screen.getByRole("group", { name: /^Didn't get to/ }).elements()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem("beyond.close.carry.v1")!)).toEqual({ enabled: false });
    await screen.getByRole("button", { name: "SKIP" }).click();
    expect((await db.obligations.get(vet))!.plannedAt).toBe("2026-11-14");
  });
});

describe("GRAYSON-CARRY-001 PLANS", () => {
  it("Today shows 'Planned earlier' for open tasks whose planned day has passed", async () => {
    await page.viewport(360, 800);
    vi.setSystemTime(at(15, 9));
    const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
    const earlier = screen.getByRole("group", { name: "PLANNED EARLIER" });
    await expect.element(earlier).toBeVisible();
    await expect.element(earlier.getByText("Book the oil change")).toBeVisible();
    // Due Nov 20, so it's already in Next 7; nothing shows twice.
    expect(earlier.getByText("Call the vet about Max's shots").elements()).toHaveLength(0);
    expect(screen.container.scrollWidth).toBeLessThanOrEqual(360);
    expect((await axe.run(earlier.element())).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/plans-earlier-360.png`, element: earlier.element() as HTMLElement });
  });
});
