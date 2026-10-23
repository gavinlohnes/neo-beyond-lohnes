/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page, cdp } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startShiftDown, startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { db } from "../../src/persistence/db";
import { MODE_ORDER } from "../../src/ui/screens/today/shiftClock";
import { setModePin } from "../../src/application/modePinQueries";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 12, 17, 10));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { cleanup(); vi.useRealTimers(); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); window.scrollTo(0, 0); });

for (const width of [320, 360, 390, 412]) it(`keeps five TODAY sections, blank stable check-in, canonical submission and accessible layout at ${width}`, async () => {
  await page.viewport(width, 844);
  const day = await startDay();
  for (const mode of MODE_ORDER) {
    setModePin(day.id, mode);
    const screen = await render(<App />);
    await expect.poll(() => document.querySelector('.mode-header')?.getAttribute('data-mode')).toBe(mode);
    const main = document.querySelector('.redesign-today')!;
    // FIELD-AUTHORITY-001: with no Engine guidance a pin changes no priority: logging leads, no red,
    // and the next card's one quiet line owns "not checked in" (no separate check-in section).
    expect([...main.children].filter((node) => node.tagName === 'SECTION').map((node) => node.getAttribute('aria-label'))).toEqual(['Day mode', 'Log', 'Next action', "Today's numbers"]);
    expect([...main.querySelectorAll<HTMLElement>('.btn-primary')].filter((el) => el.getClientRects().length)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'CHECK IN', exact: true }).elements()).toHaveLength(1);
    expect(document.body.textContent).not.toContain('NOT CHECKED IN');
    expect(main.querySelector('.cc-systems')).toBeNull();
    expect(main.querySelector('.console-tools')).toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.unmount();
  }
  const screen = await render(<App />);
  await screen.getByRole('button', { name: 'CHECK IN', exact: true }).click();
  const sheet = screen.getByRole('dialog', { name: 'CHECK IN', exact: true });
  await expect.element(sheet).toBeVisible();
  const element = sheet.element();
  expect(element.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  const submit = sheet.getByRole('button', { name: 'SUBMIT CHECK-IN' });
  await expect.element(submit).toBeDisabled();
  for (const [index, label] of ['Energy', 'Stress', 'Mood', 'Soreness', 'Alcohol urge'].entries()) {
    await sheet.getByRole('group', { name: label, exact: true }).getByRole('button', { name: '3', exact: true }).click();
    expect(sheet.element()).toBe(element);
    expect((element as HTMLDialogElement).open).toBe(true);
    if (index < 4) await expect.element(submit).toBeDisabled();
  }
  expect((await axe.run(element)).violations).toEqual([]);
  await submit.click();
  await expect.poll(() => (element as HTMLDialogElement).open).toBe(false);
  await expect.poll(() => db.checkIns.where('beyondDayId').equals(day.id).count()).toBe(1);
  await expect.element(screen.getByRole('button', { name: 'CHECK IN', exact: true })).not.toBeInTheDocument();
});

it('keeps a partially selected check-in on dismissal and restores focus', async () => {
  await startDay();
  const screen = await render(<App />);
  const trigger = screen.getByRole('button', { name: 'CHECK IN', exact: true });
  await trigger.click();
  const sheet = screen.getByRole('dialog', { name: 'CHECK IN', exact: true });
  await sheet.getByRole('group', { name: 'Energy', exact: true }).getByRole('button', { name: '2', exact: true }).click();
  await sheet.getByRole('button', { name: 'CLOSE', exact: true }).click();
  await expect.poll(() => document.activeElement === trigger.element()).toBe(true);
  await trigger.click();
  await expect.element(sheet.getByRole('group', { name: 'Energy', exact: true }).getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await db.checkIns.count()).toBe(0);
});

it('renders a truthful empty day without a crash or write', async () => {
  const screen = await render(<App />);
  await expect.element(screen.getByRole('heading', { name: 'Mode not set', exact: true })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'START DAY', exact: true })).toBeVisible();
  expect(await db.beyondDays.count()).toBe(0);
});

it('keeps water confirmation and undo above navigation during an active operation', async () => {
  await page.viewport(360, 800);
  const day = await startDay();
  await startShiftDown(day.id, 10);
  const screen = await render(<App />);
  await screen.getByRole('button', { name: 'Log water', exact: true }).click();
  await screen.getByRole('dialog', { name: 'WATER', exact: true }).getByRole('button', { name: '+8 oz', exact: true }).click();
  await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(8);
  await expect.element(screen.getByRole('button', { name: 'UNDO', exact: true })).toBeVisible();
  const toast = document.querySelector('.redesign-toast')!.getBoundingClientRect();
  const nav = document.querySelector('.shell-nav')!.getBoundingClientRect();
  expect(toast.top).toBeGreaterThanOrEqual(0);
  expect(toast.bottom).toBeLessThanOrEqual(nav.top);
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Log water');
  await screen.getByRole('button', { name: 'UNDO', exact: true }).click();
  await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(0);
  expect(await db.events.where('type').equals('WATER_LOGGED').count()).toBe(1);
  expect(await db.events.where('type').equals('WATER_LOG_VOIDED').count()).toBe(1);
});

it('keeps note entry available as a sheet over TODAY with its draft after close', async () => {
  await startDay();
  const screen = await render(<App />);
  await screen.getByRole('button', { name: 'Open LOG', exact: true }).click();
  await screen.getByRole('dialog').getByRole('button', { name: 'NOTE', exact: true }).click();
  const sheet = screen.getByRole('dialog', { name: 'NOTE', exact: true });
  const input = sheet.getByRole('textbox', { name: 'Capture a thought' });
  await input.fill('Keep this interruption-safe note');
  await sheet.getByRole('button', { name: 'CLOSE', exact: true }).click();
  await screen.getByRole('button', { name: 'Open LOG', exact: true }).click();
  await screen.getByRole('dialog').getByRole('button', { name: 'NOTE', exact: true }).click();
  await expect.element(input).toHaveValue('Keep this interruption-safe note');
  await expect.element(screen.getByRole('button', { name: 'TODAY', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await db.captureItems.count()).toBe(0);
});

it('keeps displaced daily controls reachable in COMMAND without rendering them on TODAY', async () => {
  await startDay();
  const screen = await render(<App />);
  await screen.getByRole('button', { name: 'MORE', exact: true }).click();
  await screen.getByRole('searchbox', { name: 'Find a screen or action' }).fill('TODAY TOOLS');
  await screen.getByRole('button', { name: /^TODAY TOOLS / }).click();
  await expect.element(screen.getByRole('button', { name: 'Open END DAY', exact: true })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'MORE', exact: true })).toHaveAttribute('aria-current', 'page');
});

it('FIELD-AUTHORITY-001: missing guidance is calm, log-first, with one quiet check-in and no red', async () => {
  await startDay(); const screen = await render(<App />);
  await expect.element(screen.getByRole('heading', { name: 'Log when you want.', exact: true })).toBeVisible();
  const root = document.querySelector('.redesign-today')!;
  expect([...root.querySelectorAll<HTMLElement>('.btn-primary')].filter(el => el.getClientRects().length)).toHaveLength(0);
  for (const gone of ['No guidance recorded yet', 'Your tools are ready', 'CHOOSE AN ACTION', 'NOT CHECKED IN']) expect(document.body.textContent).not.toContain(gone);
  const sections = [...root.children].filter((node) => node.tagName === 'SECTION').map((node) => node.getAttribute('aria-label'));
  expect(sections.indexOf('Log')).toBeLessThan(sections.indexOf('Next action'));
  const checkIn = screen.getByRole('button', { name: 'CHECK IN', exact: true });
  expect(checkIn.elements()).toHaveLength(1);
  expect(checkIn.element().className).toContain('btn-secondary');
  const before = await db.events.toArray();
  await checkIn.click();
  await expect.element(screen.getByRole('dialog', { name: 'CHECK IN', exact: true })).toBeVisible();
  expect(await db.recommendations.count()).toBe(0); expect(await db.events.toArray()).toEqual(before);
});

it('FIELD-AUTHORITY-001: a fresh install has one red START DAY and nothing else asking', async () => {
  const screen = await render(<App />);
  await expect.element(screen.getByRole('button', { name: 'START DAY', exact: true })).toBeVisible();
  const root = document.querySelector('.redesign-today')!;
  const reds = [...root.querySelectorAll<HTMLElement>('.btn-primary')].filter(el => el.getClientRects().length);
  expect(reds.map((el) => el.textContent)).toEqual(['START DAY']);
  expect(screen.getByRole('button', { name: 'CHECK IN', exact: true }).elements()).toHaveLength(0);
  expect(document.body.textContent).not.toContain('CHOOSE AN ACTION');
  const sections = [...root.children].filter((node) => node.tagName === 'SECTION').map((node) => node.getAttribute('aria-label'));
  expect(sections).toEqual(['Day mode', 'Next action', 'Log', "Today's numbers"]);
});

it('FIELD-AUTHORITY-001: an all-clear wears no red', async () => {
  const { submitCheckIn } = await import('../../src/application/commands');
  const day = await startDay(); await submitCheckIn(day.id, { energy: 4, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 });
  const screen = await render(<App />);
  await expect.element(screen.getByRole('heading', { name: 'Nothing needs you.', exact: true })).toBeVisible();
  const root = document.querySelector('.redesign-today')!;
  expect([...root.querySelectorAll<HTMLElement>('.btn-primary')].filter(el => el.getClientRects().length)).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'CHECK IN', exact: true }).elements()).toHaveLength(0);
});

it('keeps RED Engine guidance and the explicit decline guard on the compact TODAY path', async () => {
  const { submitCheckIn } = await import('../../src/application/commands');
  const day = await startDay(); await submitCheckIn(day.id, { energy: 1, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 });
  const screen = await render(<App />);
  await expect.element(screen.getByRole('button', { name: 'Not doing this', exact: true })).toBeVisible();
  const before = await db.events.toArray(); await screen.getByRole('button', { name: 'Not doing this', exact: true }).click();
  await expect.element(screen.getByText('CONFIRM OVERRIDE', { exact: true })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'PROCEED ANYWAY', exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before); await screen.getByRole('button', { name: 'CANCEL', exact: true }).click();
});

it('keeps short-sleep System Status separate from all-clear Engine guidance overnight', async () => {
  const { submitCheckIn, logSleep, setWorkContext } = await import('../../src/application/commands');
  vi.setSystemTime(new Date(2026, 9, 13, 17)); const day = await startDay(); await setWorkContext(day.id, 'WORK', 'MANUAL');
  vi.setSystemTime(new Date(2026, 9, 14, 3)); await logSleep(day.id, 180, 'PRIMARY');
  await submitCheckIn(day.id, { energy: 4, stress: 1, mood: 4, soreness: 0, alcoholUrge: 0 });
  const screen = await render(<App />);
  await expect.element(screen.getByRole('button', { name: 'GOT IT', exact: true })).toBeVisible();
  const status = screen.getByRole('button', { name: /STATUS · RED · 3h sleep/ }); await expect.element(status).toBeVisible();
  const before = await db.events.toArray(); await status.click();
  await expect.element(screen.getByRole('heading', { name: 'MORE // SYSTEMS', exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});

it('preserves the late-recovery main-sleep prompt and opens the existing sleep sheet', async () => {
  const { setWorkContext, markWorkEnded } = await import('../../src/application/commands');
  vi.setSystemTime(new Date(2026, 9, 13, 17)); const day = await startDay(); await setWorkContext(day.id, 'WORK', 'MANUAL');
  vi.setSystemTime(new Date(2026, 9, 14, 13, 30)); await markWorkEnded(day.id);
  const screen = await render(<App />); await screen.getByRole('button', { name: 'LOG MAIN SLEEP', exact: true }).click();
  await expect.element(screen.getByRole('dialog', { name: 'SLEEP', exact: true })).toBeVisible();
  expect(await db.events.where('type').equals('SLEEP_LOGGED').count()).toBe(0);
  await expect.element(screen.getByRole('button', { name: 'TODAY', exact: true })).toHaveAttribute('aria-current', 'page');
});

it('keeps reduced-motion logging and check-in free of entry animations at phone width', async () => {
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await page.viewport(320, 844); await startDay(); const screen = await render(<App />);
  await screen.getByRole('button', { name: 'CHECK IN', exact: true }).click();
  await screen.getByRole('dialog').getByRole('group', { name: 'Energy', exact: true }).getByRole('button', { name: '3', exact: true }).click();
  expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0);
  await screen.getByRole('dialog').getByRole('button', { name: 'CLOSE', exact: true }).click();
  await screen.getByRole('button', { name: 'Log water', exact: true }).click();
  await expect.element(screen.getByRole('dialog', { name: 'WATER', exact: true })).toBeVisible();
  expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0);
});

for (const width of [320, 360, 390, 412]) it(`contains the fresh-install scene and keeps actions visible at ${width}`, async () => {
  await page.viewport(width, 844); const screen = await render(<App />);
  await expect.element(screen.getByRole("heading", { name: "Mode not set", exact: true })).toBeVisible();
  const hero = document.querySelector(".mode-empty")!.getBoundingClientRect();
  const skyline = document.querySelector(".mode-empty .cc-skyline")!.getBoundingClientRect();
  expect(getComputedStyle(screen.getByRole("button", { name: "START DAY", exact: true }).element()).backgroundColor).toBe("rgb(208, 20, 27)");
  expect(skyline.top).toBeGreaterThanOrEqual(hero.top); expect(skyline.bottom).toBeLessThanOrEqual(hero.bottom);
  // NAV-001 intentionally moves LOG to the viewport bottom, above navigation, rather than
  // the old in-flow row. Preserve reachability and no-write checks against that approved map.
  const log = screen.getByRole("button", { name: "Open LOG", exact: true });
  const bounds = log.element().getBoundingClientRect();
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(document.querySelector(".shell-nav")!.getBoundingClientRect().top);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(log.element().contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2))).toBe(true);
  await log.click();
  await expect.element(screen.getByRole("dialog", { name: "LOG", exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(await db.beyondDays.count()).toBe(0);
});
