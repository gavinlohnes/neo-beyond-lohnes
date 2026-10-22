import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
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
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

for (const width of [320, 360, 390, 412]) it(`keeps five TODAY sections, blank stable check-in, canonical submission and accessible layout at ${width}`, async () => {
  await page.viewport(width, 844);
  const day = await startDay();
  for (const mode of MODE_ORDER) {
    setModePin(day.id, mode);
    const screen = await render(<App />);
    await expect.poll(() => document.querySelector('.mode-header')?.getAttribute('data-mode')).toBe(mode);
    const main = document.querySelector('.redesign-today')!;
    expect([...main.children].filter((node) => node.tagName === 'SECTION').map((node) => node.getAttribute('aria-label'))).toEqual(['Day mode', 'Log', 'Next action', "Today's numbers", 'Check-in']);
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
  await screen.getByRole('button', { name: 'COMMAND', exact: true }).click();
  await screen.getByRole('searchbox', { name: 'Find a screen or action' }).fill('TODAY TOOLS');
  await screen.getByRole('button', { name: /^TODAY TOOLS / }).click();
  await expect.element(screen.getByRole('button', { name: 'Open END DAY', exact: true })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'COMMAND', exact: true })).toHaveAttribute('aria-current', 'page');
});
