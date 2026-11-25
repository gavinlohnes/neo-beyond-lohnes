import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { WorkRecordScreen } from "../../src/ui/screens/more/WorkRecordScreen";
import { WorkDatesOnSchedule } from "../../src/ui/screens/more/WorkDatesOnSchedule";
import { WorkDueLine } from "../../src/ui/screens/today/WorkDueLine";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { addWorkRecord, getWorkRecords, readWorkRecordSettings } from "../../src/application/workRecords";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { OPEN_RECORD_EVENT, type OpenRecordTarget } from "../../src/ui/openRecordEvent";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-WORK-RECORD-001: MORE · Work record, TODAY's WORK_DUE line and the Work schedule marker, against the brief's
 * acceptance. Mon Nov 16 2026, Gavin's 2-2-3 rotation (Sat Nov 21 is a day off). Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const NOW = new Date(2026, 10, 16, 12);
const q = (sel: string) => document.querySelector(sel);

async function rotation() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  vi.setSystemTime(NOW);
}
function fits(root: Element, width: number) {
  const seen = (el: HTMLElement) => el.getClientRects().length > 0;
  for (const b of [...root.querySelectorAll<HTMLElement>("button, input, select")].filter(seen)) expect(b.getBoundingClientRect().height, `${width} ${b.textContent || b.getAttribute("aria-label")}`).toBeGreaterThanOrEqual(44);
  for (const el of [...root.querySelectorAll<HTMLElement>("p, button, summary, label, li")].filter(seen)) if (el.textContent?.trim()) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent}`).toBeGreaterThanOrEqual(16);
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}
async function aa(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"], rules: { "color-contrast": { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

beforeEach(async () => { localStorage.clear(); await page.viewport(360, 900); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("MORE · Work record", () => {
  it("offers the two-year mark once and saves it only on ADD", async () => {
    await rotation();
    const first = await render(<WorkRecordScreen now={NOW} />);
    const offer = first.getByRole("group", { name: "Two-year mark" });
    await expect.element(offer.getByText("Add your two-year mark, Jan 9, 2027?")).toBeVisible();
    expect(await db.workRecords.count()).toBe(0);
    expect(readWorkRecordSettings().twoYearOfferShown).toBe(true);
    await cleanup();
    // Opened again without tapping ADD: not offered again, nothing saved.
    const again = await render(<WorkRecordScreen now={NOW} />);
    await expect.element(again.getByText("Coming up")).toBeVisible();
    expect(q('[aria-label="Two-year mark"][role="group"]')).toBeNull();
    expect(await db.workRecords.count()).toBe(0);
    await cleanup();
    localStorage.clear();
    const third = await render(<WorkRecordScreen now={NOW} />);
    await third.getByRole("group", { name: "Two-year mark" }).getByRole("button", { name: "ADD" }).click();
    await expect.poll(async () => (await getWorkRecords()).map((r) => [r.kind, r.title, r.date, r.remindDays])).toEqual([["MILESTONE", "Two-year mark", "2027-01-09", 30]]);
    await expect.poll(() => q('[aria-label="Two-year mark"][role="group"]')).toBeNull();
  });

  for (const width of [320, 360, 412]) {
    it(`${width} px: 4 hours of training and a 40-hour goal read "4 of 40 hours this year"; fits, axe clean`, async () => {
      await rotation();
      await page.viewport(width, 900);
      localStorage.setItem("beyond.workRecord.v1", JSON.stringify({ twoYearOfferShown: true }));
      await addWorkRecord({ kind: "CERTIFICATION", title: "CPR card", earnedOn: "2024-12-15", expiresOn: "2027-01-05" }, NOW);
      await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" }, NOW);
      const screen = await render(<WorkRecordScreen now={NOW} />);
      await expect.element(screen.getByText("0 hours this year")).toBeVisible();
      await screen.getByRole("button", { name: "ADD", exact: true }).click();
      await screen.getByRole("button", { name: "TRAINING HOURS" }).click();
      const form = screen.getByRole("region", { name: "Add training hours" });
      await form.getByRole("textbox", { name: "Title" }).fill("Defensive tactics");
      await form.getByRole("spinbutton", { name: "Hours" }).fill("4");
      fits(screen.container, width);
      await aa(`${width} add form`, screen.container);
      await form.getByRole("button", { name: "SAVE" }).click();
      await expect.element(screen.getByText("4 hours this year")).toBeVisible();
      await screen.getByRole("button", { name: "Set your yearly goal" }).click();
      await screen.getByRole("textbox", { name: "Yearly training-hours goal (blank for none)" }).fill("40");
      await screen.getByRole("button", { name: "SAVE SETTINGS" }).click();
      await expect.element(screen.getByText("4 of 40 hours this year, 36 to go by Dec 31")).toBeVisible();
      await expect.element(screen.getByRole("listitem", { name: "CPR card" }).getByText("Earned Dec 15, 2024 · expires Jan 5, 2027 · Remind 60 days before")).toBeVisible();
      fits(screen.container, width);
      await aa(`${width} work record`, screen.container);
      if (SHOTS && width === 360) { await page.viewport(360, 2200); await page.screenshot({ path: `${SHOTS}/after-360-work-record.png`, element: screen.container as HTMLElement }); }
    });
  }

  it("every field is editable; REMOVE shows UNDO; removed items can be restored; DONE and RENEWED", async () => {
    await rotation();
    localStorage.setItem("beyond.workRecord.v1", JSON.stringify({ twoYearOfferShown: true }));
    const court = await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-13", workType: "COURT" }, NOW);
    await addWorkRecord({ kind: "CERTIFICATION", title: "CPR card", expiresOn: "2026-12-01" }, NOW);
    const screen = await render(<WorkRecordScreen now={NOW} focusId={court.id} />);
    const row = screen.getByRole("listitem", { name: "Court" });
    await expect.element(row).toBeVisible();
    await expect.poll(() => document.activeElement?.getAttribute("data-work-record")).toBe(court.id);
    await row.getByRole("button", { name: "Edit Court" }).click();
    await screen.getByRole("textbox", { name: "Title" }).fill("Court (traffic)");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    const edited = screen.getByRole("listitem", { name: "Court (traffic)" });
    await expect.element(edited).toBeVisible();
    await edited.getByRole("button", { name: "DONE" }).click();
    await expect.poll(async () => !!(await db.workRecords.get(court.id))?.doneAt).toBe(true);
    const cpr = screen.getByRole("listitem", { name: "CPR card" });
    await cpr.getByRole("button", { name: "RENEWED" }).click();
    await screen.getByLabelText("New expiry date").fill("2028-12-01");
    await screen.getByRole("group", { name: "Renew" }).getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText(/expires Dec 1, 2028/)).toBeVisible();
    await screen.getByRole("button", { name: "Remove CPR card" }).click();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getWorkRecords()).find((r) => r.title === "CPR card")?.history.map((h) => h.action)).toEqual(["ADDED", "CHANGED", "REMOVED", "RESTORED"]);
    await screen.getByRole("button", { name: "Remove CPR card" }).click();
    await screen.getByText(/^Removed \(1\)$/).click();
    await screen.getByRole("button", { name: "Restore CPR card" }).click();
    await expect.poll(async () => (await getWorkRecords()).find((r) => r.title === "CPR card")?.status).toBe("ACTIVE");
  });
});

describe("TODAY's WORK_DUE line", () => {
  it("a certification expiring in 50 days shows now (60-day default); at 30 days' reminder it leaves", async () => {
    await rotation();
    const cpr = await addWorkRecord({ kind: "CERTIFICATION", title: "CPR card", expiresOn: "2027-01-05" }, NOW);
    const seen: boolean[] = [];
    const screen = await render(<WorkDueLine now={NOW} onPresence={(s) => seen.push(s)} />);
    await expect.element(screen.getByRole("button", { name: "CPR card expires Jan 5, 2027, in 50 days. Open in Work record" })).toBeVisible();
    expect(seen.at(-1)).toBe(true);
    const opened: OpenRecordTarget[] = [];
    const listen = (e: Event) => opened.push((e as CustomEvent<OpenRecordTarget>).detail);
    window.addEventListener(OPEN_RECORD_EVENT, listen);
    await screen.getByRole("button", { name: /CPR card expires/ }).click();
    window.removeEventListener(OPEN_RECORD_EVENT, listen);
    expect(opened).toEqual([{ kind: "WORK_RECORD", id: cpr.id }]);
    await cleanup();
    localStorage.setItem("beyond.workRecord.v1", JSON.stringify({ twoYearOfferShown: true }));
    const record = await render(<WorkRecordScreen now={NOW} />);
    await record.getByRole("button", { name: "Edit CPR card" }).click();
    await record.getByRole("spinbutton", { name: "Days before" }).fill("30");
    await record.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(record.getByRole("listitem", { name: "CPR card", exact: true }).getByText(/Remind 30 days before/)).toBeVisible();
    await cleanup();
    const after: boolean[] = [];
    await render(<WorkDueLine now={new Date(NOW.getTime() + 60_000)} onPresence={(s) => after.push(s)} />);
    await expect.poll(() => after.at(-1)).toBe(false);
    expect(q("[data-work-due]")).toBeNull();
  });

  for (const width of [320, 360, 412]) {
    it(`${width} px on TODAY: "Court Saturday 9:00 AM" as a quiet line, fits, axe clean`, async () => {
      await rotation();
      await page.viewport(width, 900);
      vi.setSystemTime(new Date(2026, 10, 16, 16, 31));
      await startDay(new Date(2026, 10, 16, 16, 30).toISOString());
      await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" });
      localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
      await render(<TodayScreen onOpenLife={() => {}} />);
      await expect.poll(() => q("[data-work-due]")?.textContent).toBe("Court Saturday 9:00 AM");
      const block = q(".today-quiet-lines")!;
      fits(block, width);
      await aa(`${width} TODAY quiet lines`, block);
      if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/after-360-today-work-due.png`, element: block as HTMLElement });
    });
  }

  it("off in MORE → Settings → TODAY keeps it off TODAY", async () => {
    await rotation();
    vi.setSystemTime(new Date(2026, 10, 16, 16, 31));
    await startDay(new Date(2026, 10, 16, 16, 30).toISOString());
    await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" });
    localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
    localStorage.setItem("beyond.todayQuiet.v1", JSON.stringify({ off: ["WORK_DUE"] }));
    await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.poll(() => q(".today-quiet-lines")).not.toBeNull();
    await new Promise((r) => setTimeout(r, 300));
    expect(q("[data-work-due]")).toBeNull();
  });
});

describe("MORE · Work schedule", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: a court date on a day off shows on its day; MARK AS WORK opens the OT confirmation and saves nothing by itself`, async () => {
      await rotation();
      await page.viewport(width, 900);
      await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" }, NOW);
      const screen = await render(<WorkDatesOnSchedule now={NOW} />);
      const row = screen.getByRole("listitem", { name: "Court" });
      await expect.element(row.getByText("Court · Saturday 9:00 AM")).toBeVisible();
      await expect.element(row.getByText("Court · a day off")).toBeVisible();
      await row.getByRole("button", { name: "MARK AS WORK" }).click();
      const offer = screen.getByRole("region", { name: "Confirm this change" });
      await expect.element(offer).toBeVisible();
      fits(screen.container, width);
      await aa(`${width} work dates`, screen.container);
      if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/after-360-work-schedule-mark-as-work.png`, element: screen.container as HTMLElement });
      await offer.getByRole("button", { name: "REVIEW THE CHANGE" }).click();
      await expect.element(offer.getByText(/Sat, Nov 21 becomes overtime: a work day/)).toBeVisible();
      expect(await db.scheduleExceptions.count()).toBe(0);
      await offer.getByRole("button", { name: "CONFIRM" }).click();
      await expect.poll(async () => (await db.scheduleExceptions.toArray()).map((e) => [e.date, e.kind, e.reason])).toEqual([["2026-11-21", "WORK", "OVERTIME"]]);
      await expect.element(screen.getByText("Court · a confirmed work day")).toBeVisible();
      expect(q('button[data-mark]')).toBeNull();
      expect([...document.querySelectorAll("button")].some((b) => b.textContent === "MARK AS WORK")).toBe(false);
    });
  }
});
