import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { startWorkout, completeWorkout, logSet } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import { db } from "../../src/persistence/db";
let dayId: string;
beforeEach(async()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,12,18));dayId=(await startDay()).id;await submitCheckIn(dayId,{energy:4,stress:2,mood:4,soreness:1,alcoholUrge:0});});
afterEach(()=>{cleanup();vi.useRealTimers();});
for(const width of [320,360,390,412])it(`offers one-tap history and records at ${width}, including during an active workout`,async()=>{
 await page.viewport(width,844);const session=await startWorkout(dayId,'A','STANDARD');
 const screen=await render(<TrainScreen/>);await expect.element(screen.getByRole('spinbutton',{name:'Set 1 weight in pounds'})).toBeVisible();
 await screen.getByRole('spinbutton',{name:'Set 1 weight in pounds'}).fill('112.5');
 await screen.getByRole('spinbutton',{name:'Set 1 repetitions'}).fill('8');
 const before=await db.events.toArray();
 for(const name of ['HISTORY','RECORDS'] as const){await screen.getByRole('button',{name,exact:true}).click();await expect.element(screen.getByRole('heading',{name:name==='HISTORY'?'History':'Records',exact:true})).toBeVisible();}
 await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getComputedTiming().iterations!==Infinity)a.finish();
 expect((await axe.run(document.querySelector('.train-field')!)).violations).toEqual([]);
 expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
 await screen.getByRole('button',{name:'WORKOUT',exact:true}).click();
 await expect.element(screen.getByRole('spinbutton',{name:'Set 1 weight in pounds'})).toHaveValue(112.5);
 expect(await db.events.toArray()).toEqual(before);
 await screen.getByRole('button',{name:'LOG',exact:true}).click();
 await expect.poll(()=>getPerformedSets(session.id)).toMatchObject([{weight:112.5,reps:8}]);
});
it('clears on focus, restores empty blur, and keeps the exact typed decimal set across remount',async()=>{
 const past=await startWorkout(dayId,'A','STANDARD');await logSet(dayId,past.id,'machine-chest-press',1,100,10);await completeWorkout(dayId,past.id,'STANDARD','PARTIAL');
 const current=await startWorkout(dayId,'A','STANDARD');const screen=await render(<TrainScreen/>);
 const weight=screen.getByRole('spinbutton',{name:'Set 1 weight in pounds'});await expect.element(weight).toHaveValue(100);
 await weight.click();await expect.poll(()=>(weight.element() as HTMLInputElement).value).toBe('');expect(weight.element().getAttribute('placeholder')).toBe('100');
 await screen.getByRole('button',{name:'WORKOUT',exact:true}).click();await expect.element(weight).toHaveValue(100);
 await weight.fill('102.5');await screen.getByRole('spinbutton',{name:'Set 1 repetitions'}).fill('7');await screen.getByRole('button',{name:'LOG',exact:true}).click();
 await expect.poll(()=>getPerformedSets(current.id)).toMatchObject([{weight:102.5,reps:7}]);
 await screen.unmount();const resumed=await render(<TrainScreen/>);await expect.element(resumed.getByText(/#1 — 102.5 lb x 7/)).toBeVisible();
 expect(await getPerformedSets(current.id)).toHaveLength(1);
});
it('shows dated last performance and the existing best PR without changing any records',async()=>{
 const first=await startWorkout(dayId,'A','STANDARD');await logSet(dayId,first.id,'machine-chest-press',1,100,8);await completeWorkout(dayId,first.id,'STANDARD','PARTIAL');
 vi.setSystemTime(new Date(2026,9,12,18,10));const second=await startWorkout(dayId,'A','STANDARD');await logSet(dayId,second.id,'machine-chest-press',1,110,8);await completeWorkout(dayId,second.id,'STANDARD','PARTIAL');
 await startWorkout(dayId,'A','STANDARD');const before=await db.events.toArray();const screen=await render(<TrainScreen/>);
 await expect.element(screen.getByText('LAST TIME: 110 lb x 8 · Oct 12, 2026',{exact:true})).toBeVisible();
 await expect.element(screen.getByText('BEST: Heaviest: 110 lb × 8 · Oct 12, 2026',{exact:true})).toBeVisible();
 await screen.getByRole('button',{name:'RECORDS',exact:true}).click();await screen.getByRole('button',{name:/Machine Chest Press: Heaviest: 110/}).click();
 await expect.element(screen.getByRole('heading',{name:/Machine Chest Press/})).toBeVisible();expect(await db.events.toArray()).toEqual(before);
});
