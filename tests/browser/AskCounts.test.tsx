/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { resetAskCountSession } from "../../src/application/askCounts";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import type { AskCount } from "../../src/domain/askCounts";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { db } from "../../src/persistence/db";
import { App } from "../../src/app/App";
import { useNoteAsk } from "../../src/ui/hooks/useNoteAsk";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { AskingLessPanel } from "../../src/ui/screens/review/AskingLessPanel";
import { AskHowItWent } from "../../src/ui/screens/today/AskHowItWent";
import { CheckInSheet } from "../../src/ui/screens/today/CheckInSheet";
import { CloseCard } from "../../src/ui/screens/today/CloseCard";
import { RecoveryContractOffer } from "../../src/ui/screens/today/RecoveryContract";
import { ReflectOnDecline } from "../../src/ui/screens/today/ReflectOnDecline";
import { commandResult, openCommandPanel } from "./helpers/command";
import { openDetailedReviews } from "./helpers/review";

/**
 * GRAYSON-ASKS-COUNT-001: asks counted when shown (once per key per lived day), the monthly review's ASKING LESS
 * panel, and his controls in MORE. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms));
const keys = async () => (await db.askCounts.toArray()).map((r) => `${r.area}|${r.kind}|${r.key}`).sort();
const panel = () => document.querySelector("[data-asking-less]") as HTMLElement | null;
async function press(locator: { element: () => Element }) { (locator.element() as HTMLElement).focus(); await userEvent.keyboard("{Enter}"); }
async function fits(label: string, root: () => Element | null, shotName?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900); await settle(150);
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    const r = await axe.run(root()!, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${label} at ${width}`).toEqual([]);
    if (SHOTS && shotName) await page.screenshot({ path: `${SHOTS}/${width}-${shotName}.png`, element: root() as HTMLElement });
  }
  await page.viewport(360, 900);
}
const row = (date: string, area: AskCount["area"], key: string): AskCount =>
  ({ id: `${date}|${area}|FIELD|${key}`, date, area, kind: "FIELD", key, count: 1, firstAt: `${date}T23:00:00.000Z` });
function dateBack(from: Date, days: number): string {
  const d = new Date(from); d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); resetAskCountSession(); await db.askCounts.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-ASKS-COUNT-001 call sites", { timeout: 60_000 }, () => {
  it("each ask counts once when shown, with its area, kind and key; re-rendering doesn't count again", async () => {
    const day = await startDay();
    const noop = () => {};
    const entry = { id: "j1", createdAt: new Date().toISOString(), decision: "Skip the late workout" } as Parameters<typeof AskHowItWent>[0]["entry"];
    function Harness({ tick }: { tick: number }) {
      return <div data-tick={tick}>
        <CheckInSheet open close={noop} values={{}} setValues={noop} busy={false} isInFlight={() => false} submit={noop} />
        <CloseCard dayId={day.id} busy={false} onClosed={noop} />
        <AskHowItWent entry={entry} />
        <ReflectOnDecline recommendationId="rec-1" title="Train today" why="You slept well" />
        <RecoveryContractOffer dayLabel="Sat" planned={false} busy={false} onSave={async () => {}} onSaved={noop} />
      </div>;
    }
    const screen = await render(<Harness tick={0} />);
    await expect.poll(keys).toEqual(expect.arrayContaining([
      "TODAY|FIELD|checkin.energy", "TODAY|FIELD|checkin.stress", "TODAY|FIELD|checkin.mood", "TODAY|FIELD|checkin.soreness", "TODAY|FIELD|checkin.alcoholUrge",
      "TODAY|CHOICE|journal.howItWent", "TODAY|CHOICE|reflect.whyNot", "PLANS|CHOICE|recovery.contract",
    ]));
    await expect.poll(async () => (await keys()).some((k) => k.startsWith("TODAY|FIELD|close.prompt."))).toBe(true);
    const before = await db.askCounts.count();
    for (let i = 1; i <= 3; i += 1) await screen.rerender(<Harness tick={i} />);
    await settle(300);
    await cleanup();
    resetAskCountSession(); // a reload on the same lived day
    await render(<Harness tick={0} />);
    await settle(500);
    expect(await db.askCounts.count()).toBe(before);
  });

  it("an ask not shown counts nothing; counting off writes nothing", async () => {
    function Shown({ visible }: { visible: boolean }) { useNoteAsk("WORK", "CONFIRM", "schedule.exception.confirm", visible); return null; }
    await render(<Shown visible={false} />);
    await settle();
    expect(await db.askCounts.count()).toBe(0);
    localStorage.setItem("beyond.askCounts.settings.v1", JSON.stringify({ on: false, showPanel: true }));
    await cleanup();
    await render(<Shown visible />);
    await settle();
    expect(await db.askCounts.count()).toBe(0);
  });
});

describe("GRAYSON-ASKS-COUNT-001 panel and settings", { timeout: 90_000 }, () => {
  it("in the monthly review, under body composition: asks by area with words, and the three asked most", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const clock = (at: Date) => vi.setSystemTime(at);
    const day = async (start: Date, weight?: number) => {
      clock(start); const d = await startDay(); if (weight !== undefined) await logBodyweight(d.id, weight);
      clock(new Date(start.getTime() + 3_600_000)); await endDay(d.id);
    };
    await day(new Date(2026, 9, 13, 18));
    clock(new Date(2026, 9, 19, 20));
    const reviewDay = await startDay();
    const week = latestReviewWeek(new Date());
    await saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "First review", focus: null, expectedPreviousId: null });
    clock(new Date(2026, 9, 19, 21)); await endDay(reviewDay.id);
    await day(new Date(2026, 9, 20, 18), 199.5);
    await day(new Date(2026, 10, 14, 18), 197);
    const now = new Date(2026, 10, 16, 20);
    clock(now);
    await startDay();
    // Nine weeks of counts: TODAY asked less lately, FOOD a little more.
    await db.askCounts.bulkAdd([
      ...Array.from({ length: 20 }, (_, i) => row(dateBack(now, i), "TODAY", i % 2 ? "checkin.energy" : "checkin.mood")),
      ...Array.from({ length: 30 }, (_, i) => row(dateBack(now, 28 + (i % 28)), "TODAY", `checkin.k${i}`)),
      ...Array.from({ length: 4 }, (_, i) => row(dateBack(now, i), "FOOD", "catchup.meal")),
      row(dateBack(now, 62), "SLEEP", "old"),
    ]);
    const screen = await render(<App />);
    await (await commandResult(screen, "REVIEW")).click();
    await openDetailedReviews(screen);
    const asking = screen.getByRole("region", { name: "ASKING LESS · LAST 4 WEEKS" });
    await expect.element(asking).toBeVisible();
    // Under BODY COMPOSITION, so it never pushes that down.
    const body = screen.getByRole("region", { name: "BODY COMPOSITION · LAST 4 WEEKS" }).element();
    expect(body.compareDocumentPosition(asking.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect.element(asking.getByText("Questions GRAYSON put to you. This measures the app, not you.")).toBeVisible();
    expect([...asking.element().querySelectorAll("[data-area]")].map((r) => r.textContent)).toEqual([
      "TODAY20 in the last 4 weeks · 30 the 4 before · 10 fewer", "FOOD4 in the last 4 weeks · 0 the 4 before · 4 more",
    ]);
    await expect.element(asking.getByText("Energy in the check-in, 10 times")).toBeVisible();
    expect(asking.element().textContent).not.toMatch(/%|score|total/i);
    // Words, not colours: nothing in the panel takes BEYOND's red.
    expect([...asking.element().querySelectorAll("*")].some((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor].includes("rgb(208, 20, 27)"))).toBe(false);
    await fits("panel", () => asking.element(), "panel");
  });

  it("under 8 weeks says when counting started; MORE turns it off, clears with UNDO and hides the panel, by keyboard", async () => {
    await startDay();
    const now = new Date();
    await db.askCounts.bulkAdd([row(dateBack(now, 3), "TODAY", "checkin.energy"), row(dateBack(now, 1), "TODAY", "checkin.energy")]);
    let shown = await render(<AskingLessPanel />);
    await expect.element(shown.getByText(/^Counting started [A-Z][a-z]{2} \d{1,2}\. A comparison needs 8 weeks\.$/)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-under-8-weeks.png`, element: panel()! });
    await cleanup();

    const more = await render(<MoreScreen />);
    await openCommandPanel(more, "settings");
    const setting = () => document.querySelector("[data-ask-count-setting]") as HTMLElement;
    await expect.element(more.getByRole("button", { name: "Count questions: turn off" })).toBeVisible();
    await fits("settings", setting, "settings");
    await press(more.getByRole("button", { name: "Count questions: turn off" }));
    await expect.element(more.getByRole("button", { name: "Count questions: turn on" })).toBeVisible();
    await press(more.getByRole("button", { name: "CLEAR COUNTS" }));
    await press(more.getByRole("button", { name: "CLEAR", exact: true }));
    await expect.poll(() => db.askCounts.count()).toBe(0);
    await press(more.getByRole("button", { name: "UNDO" }));
    await expect.poll(() => db.askCounts.count()).toBe(2);
    await cleanup();
    shown = await render(<AskingLessPanel />);
    await expect.element(shown.getByText("Counting is off.")).toBeVisible();
    await cleanup();

    const again = await render(<MoreScreen />);
    await openCommandPanel(again, "settings");
    await press(again.getByRole("button", { name: "Monthly review panel: hide" }));
    await cleanup();
    await render(<AskingLessPanel />);
    await settle(400);
    expect(panel()).toBeNull();
  });
});
