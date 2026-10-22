import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { getHiddenFeatures } from "../../src/ui/hiddenFeatures";
import { startDay, enableMinimumDay, logWater } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,12,18));window.history.replaceState(null,'',location.pathname);});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('hides optional tools by default, then restores all three without changing any canonical data',async()=>{
 const day=await startDay();await enableMinimumDay(day.id);await logWater(day.id,12);const before=await db.events.toArray();
 const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 const search=screen.getByRole('searchbox',{name:'Find a screen or action'});await search.fill('food lookup');
 expect(screen.getByRole('button',{name:/^FOOD LOOKUP BODY/}).elements()).toHaveLength(0);
 await screen.getByRole('button',{name:'HIDDEN FEATURES Show optional tools. Existing data is kept',exact:true}).click();
 for(const label of ['Minimum Day','Small Steps','Online food lookup']){const toggle=screen.getByRole('checkbox',{name:`Show ${label}`,exact:true});await expect.element(toggle).not.toBeChecked();await toggle.click();}
 expect(getHiddenFeatures()).toEqual({minimumDay:true,smallSteps:true,foodLookup:true});
 await search.fill('food lookup');await screen.getByRole('button',{name:/^FOOD LOOKUP BODY/}).click();await expect.element(screen.getByRole('dialog',{name:'FOOD LOOKUP',exact:true})).toBeVisible();
 await screen.getByRole('dialog').getByRole('button',{name:'CLOSE',exact:true}).click();
 await search.fill('small steps');await screen.getByRole('button',{name:'SMALL STEPS One existing tool at a time',exact:true}).click();
 await expect.element(screen.getByRole('heading',{name:'Keep it small',exact:true})).toBeVisible();
 await expect.element(screen.getByRole('button',{name:/Inspect Minimum Day/})).toBeVisible();
 expect(await db.events.toArray()).toEqual(before);
 await screen.getByRole('button',{name:'COMMAND',exact:true}).click();await search.fill('hidden features');await screen.getByRole('button',{name:'HIDDEN FEATURES Show optional tools. Existing data is kept',exact:true}).click();
 for(const label of ['Minimum Day','Small Steps','Online food lookup'])await screen.getByRole('checkbox',{name:`Show ${label}`,exact:true}).click();
 expect(getHiddenFeatures()).toEqual({minimumDay:false,smallSteps:false,foodLookup:false});expect(await db.events.toArray()).toEqual(before);
});
it('retains the preference across a new app mount and survives invalid stored preferences',async()=>{
 localStorage.setItem('beyond.hiddenFeatures','invalid');expect(getHiddenFeatures()).toEqual({minimumDay:false,smallSteps:false,foodLookup:false});
 localStorage.setItem('beyond.hiddenFeatures',JSON.stringify({minimumDay:true,smallSteps:false,foodLookup:false}));
 const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();await screen.getByRole('searchbox',{name:'Find a screen or action'}).fill('minimum day');
 await expect.element(screen.getByRole('button',{name:'MINIMUM DAY The existing six-basics tool',exact:true})).toBeVisible();expect(await db.events.count()).toBe(0);
});
it('keeps the original protein-only command reachable while Minimum Day is hidden',async()=>{
 const day=await startDay();const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 await screen.getByRole('searchbox',{name:'Find a screen or action'}).fill('protein only');await screen.getByRole('button',{name:'PROTEIN ONLY Log protein with the existing protein-only form',exact:true}).click();
 const sheet=screen.getByRole('dialog',{name:'PROTEIN ONLY',exact:true});await expect.element(sheet).toBeVisible();
 await sheet.getByRole('spinbutton',{name:'Protein (g)'}).fill('25');await sheet.getByRole('button',{name:'LOG PROTEIN',exact:true}).click();
 await expect.poll(()=>db.events.where('type').equals('PROTEIN_LOGGED').count()).toBe(1);expect(await db.events.where('type').equals('MEAL_LOGGED').count()).toBe(0);
 await sheet.getByRole('button',{name:'UNDO',exact:true}).click();await expect.poll(()=>db.events.where('type').equals('PROTEIN_LOG_VOIDED').count()).toBe(1);
 expect((await db.events.where('type').equals('PROTEIN_LOGGED').first())?.beyondDayId).toBe(day.id);
});
