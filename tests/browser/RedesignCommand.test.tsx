import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { setHiddenFeature } from "../../src/ui/hiddenFeatures";
import { App } from "../../src/app/App";
import { SYSTEM_CAPABILITIES, CAPABILITY_GROUPS } from "../../src/ui/systemCatalog";
import { startDay } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,12,18));window.history.replaceState(null,'',location.pathname);});
afterEach(()=>{cleanup();vi.useRealTimers();});
for(const width of [320,360,390,412])it(`groups all capabilities and retains backup/restore at ${width}`,async()=>{
 for(const feature of ["minimumDay","smallSteps","foodLookup"] as const)setHiddenFeature(feature,true);
 await page.viewport(width,844);await startDay();const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 const root=document.querySelector('.more-control-center')!;
 for(const group of CAPABILITY_GROUPS){const summary=[...root.querySelectorAll('summary')].find(s=>s.textContent===group)!;expect(summary).toBeTruthy();(summary.parentElement as HTMLDetailsElement).open=true;}
 for(const entry of SYSTEM_CAPABILITIES)await expect.element(screen.getByRole('button',{name:`${entry.label} ${entry.description}`,exact:true})).toBeVisible();
 await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getComputedTiming().iterations!==Infinity)a.finish();
 expect((await axe.run(root)).violations).toEqual([]);expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
 const search=screen.getByRole('searchbox',{name:'Find a screen or action'});await search.fill('backup');
 await screen.getByRole('button',{name:/^BACKUP & RECOVERY COMMAND/}).click();
 await expect.element(screen.getByRole('button',{name:'EXPORT BACKUP',exact:true})).toBeVisible();
 await expect.element(screen.getByText('RESTORE — REPLACES ALL DATA',{exact:true})).toBeVisible();
 expect(await db.events.where('type').equals('MEAL_LOGGED').count()).toBe(0);
});
it('finds a saved meal by name and opens servings over COMMAND, without logging on navigation',async()=>{
 await startDay();await createSavedMeal({name:'Night sandwich',calories:400,proteinG:30,carbsG:40,fatG:12});
 const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 const search=screen.getByRole('searchbox',{name:'Find a screen or action'});await search.fill('Night sandwich');
 await screen.getByRole('button',{name:'Night sandwich Saved meal · choose servings',exact:true}).click();
 await expect.element(screen.getByRole('dialog',{name:'SERVINGS',exact:true})).toBeVisible();
 await expect.element(screen.getByRole('button',{name:'COMMAND',exact:true})).toHaveAttribute('aria-current','page');
 expect(await db.events.where('type').equals('MEAL_LOGGED').count()).toBe(0);
 await screen.getByRole('dialog').getByRole('button',{name:'CLOSE',exact:true}).click();await expect.poll(()=>document.activeElement).toBe(screen.getByRole('button',{name:'Night sandwich Saved meal · choose servings',exact:true}).element());
});
it('opens an exercise history from search and leaves record search available for everything else',async()=>{
 const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 await screen.getByRole('searchbox',{name:'Find a screen or action'}).fill('Chest Press');
 await screen.getByRole('button',{name:'Machine Chest Press Exercise · history and sets',exact:true}).click();
 await expect.element(screen.getByRole('heading',{name:'Machine Chest Press history',exact:true})).toBeVisible();
 await screen.getByRole('button',{name:'COMMAND',exact:true}).click();await screen.getByRole('searchbox',{name:'Find a screen or action'}).fill('unknown thing');
 await screen.getByRole('button',{name:'Search all records',exact:true}).click();await expect.element(screen.getByRole('textbox',{name:'Search everything',exact:true})).toBeVisible();
 expect(await db.performedSets.count()).toBe(0);
});
it('opens manual-first check-in from COMMAND and retains partial answers through dismissal',async()=>{
 await startDay();const screen=await render(<App/>);await screen.getByRole('button',{name:'COMMAND',exact:true}).click();
 await screen.getByRole('searchbox',{name:'Find a screen or action'}).fill('CHECK IN');
 await screen.getByRole('button',{name:'CHECK IN Record or update how you feel',exact:true}).click();
 await screen.getByRole('button',{name:'CHECK IN',exact:true}).click();const sheet=screen.getByRole('dialog',{name:'CHECK IN',exact:true});
 expect(sheet.element().querySelectorAll('[aria-pressed=true]')).toHaveLength(0);
 await sheet.getByRole('group',{name:'Energy',exact:true}).getByRole('button',{name:'3',exact:true}).click();
 await sheet.getByRole('button',{name:'CLOSE',exact:true}).click();await screen.getByRole('button',{name:'CHECK IN',exact:true}).click();
 await expect.element(sheet.getByRole('group',{name:'Energy',exact:true}).getByRole('button',{name:'3',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.element(sheet.getByRole('button',{name:'SUBMIT CHECK-IN',exact:true})).toBeDisabled();expect(await db.events.where('type').equals('STATE_CHECKED_IN').count()).toBe(0);
});
