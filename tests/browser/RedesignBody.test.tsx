import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { App } from "../../src/app/App";
import { startDay, logWater, endDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { getHydrationEntries } from "../../src/application/queries";
import { openReadings } from "./helpers/dataReadings";
let dayId: string;
beforeEach(async()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,12,17,10));window.history.replaceState(null,'',location.pathname);dayId=(await startDay()).id;});
afterEach(()=>{cleanup();vi.useRealTimers();});
for(const width of [320,360,390,412])it(`puts numbers, progress and history first without entry forms at ${width}`,async()=>{
  await page.viewport(width,844);await logWater(dayId,12);
  const screen=await render(<App />);await screen.getByRole('button',{name:'DATA',exact:true}).click(); await openReadings();
  await expect.element(screen.getByRole('button',{name:'WEIGHT HISTORY',exact:true})).toBeVisible();
  const root=document.querySelector('.body-home')!;
  // CAVE-DATA D1: DATA's page is the cave's first view, NUMBERS. NUMBERS-CLEANUP-001 folds its copy of today's numbers
  // and weight into "Today's readings" (the dashboard above leads); the order inside is unchanged, then History.
  const lead=root.querySelector('.cave__lead-view:not([hidden])')!;
  // Top-level sections only: "Today's numbers" holds its own record section once readings load (CI timing, #515).
  expect([...lead.querySelectorAll('.data-readings section')].filter(el=>!el.parentElement!.closest('.data-readings section')).map(el=>el.getAttribute('aria-label'))).toEqual(["Today's numbers",'Progress']);
  expect([...lead.querySelectorAll(':scope > section')].map(el=>el.getAttribute('aria-label'))).toEqual(['History']);
  expect(root.querySelector('input[type="number"]')).toBeNull();
  await document.fonts.ready;
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  expect((await axe.run(root)).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  const before=await db.events.toArray();
  await screen.getByRole('button',{name:'water history',exact:true}).click();
  await expect.element(screen.getByRole('button',{name:'BACK TO DATA',exact:true})).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});
it('opens the canonical current-day correction sheet after one tap, preserving original provenance',async()=>{
  const original=await logWater(dayId,8);const screen=await render(<App />);
  await screen.getByRole('button',{name:'DATA',exact:true}).click(); await openReadings();
  const entry=screen.getByRole('button',{name:'Open Water · 8 oz',exact:true});await expect.element(entry).toBeVisible();
  const beforeInspect=await db.events.toArray();
  const vibrate=vi.spyOn(navigator,'vibrate').mockReturnValue(true);
  await entry.click();
  const sheet=screen.getByRole('dialog',{name:'CORRECT RECORD',exact:true});await expect.element(sheet).toBeVisible();
  expect(await db.events.toArray()).toEqual(beforeInspect);
  expect(vibrate).not.toHaveBeenCalled();vibrate.mockRestore();
  await sheet.getByRole('spinbutton',{name:'Corrected amount (oz)',exact:true}).fill('16');
  await sheet.getByRole('button',{name:'SAVE',exact:true}).click();
  await expect.poll(()=>getHydrationEntries(dayId)).toMatchObject([{rootEventId:original,effectiveAmountOz:16,originalAmountOz:8,correctionCount:1}]);
  expect(await db.events.where('type').equals('WATER_LOGGED').count()).toBe(1);
});
it('keeps a measurement draft when returning to the BODY overview',async()=>{
  const screen=await render(<App />);await screen.getByRole('button',{name:'DATA',exact:true}).click(); await openReadings();
  await screen.getByRole('button',{name:/^measurements$/i}).click();
  const inputs=[...document.querySelectorAll<HTMLInputElement>('#progress-measurements input')];
  await expect.poll(()=>document.querySelector('#progress-measurements')?.getClientRects().length).toBeGreaterThan(0);
  const field=screen.getByRole('spinbutton',{name:/inches/i});await field.fill('36.5');
  await screen.getByRole('button',{name:'BACK TO DATA',exact:true}).click();
  await screen.getByRole('button',{name:/^measurements$/i}).click();
  await expect.element(field).toHaveValue(36.5);
  expect(inputs.length).toBeGreaterThan(0);
  expect(await db.events.where('type').equals('BODY_MEASUREMENT_LOGGED').count()).toBe(0);
});

it('keeps a closed-day correction on the original day without rewriting the current day',async()=>{
  const original=await logWater(dayId,8);const [entry]=await getHydrationEntries(dayId);
  await endDay(dayId,'EXPLICIT_END_DAY');vi.setSystemTime(new Date(2026,9,13,17,10));const current=await startDay();
  const screen=await render(<BodyScreen sheetFocus="water" focus="water" correctionRequest={{key:1,dayId,record:{kind:'WATER',entry:entry!}}} />);
  await screen.getByRole('spinbutton',{name:'Corrected amount (oz)',exact:true}).fill('16');
  await screen.getByRole('button',{name:'SAVE',exact:true}).click();
  await expect.poll(()=>getHydrationEntries(dayId)).toMatchObject([{rootEventId:original,originalAmountOz:8,effectiveAmountOz:16}]);
  expect(await getHydrationEntries(current.id)).toEqual([]);
  const [correction]=await db.events.where('type').equals('WATER_LOG_CORRECTED').toArray();
  expect(correction?.beyondDayId).toBe(dayId);
});
