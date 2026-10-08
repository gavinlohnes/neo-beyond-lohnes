import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url), axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const base = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:5178', root = new URL('./', import.meta.url).pathname;
mkdirSync(root + 'screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
let checks = 0, scans = 0, shots = 0;
const errors = [], external = [];
async function setup(concept, width = 360, height = 800, reduced = false) { const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' }); await ctx.addInitScript(() => { for (const n of ['localStorage', 'sessionStorage', 'indexedDB'])
    Object.defineProperty(window, n, { get() { throw Error('Forbidden canonical storage: ' + n); } }); if (navigator.serviceWorker)
    navigator.serviceWorker.register = () => { throw Error('Forbidden service worker'); }; }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:'))
    external.push(r.url()); }); await p.goto(base + '/?concept=' + concept); await p.locator('.home').waitFor(); await p.evaluate(() => document.fonts.ready); return { p, ctx }; }
async function layout(p) { assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow'); const bad = await p.locator('button,input,select,textarea,summary').evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.height && r.width && (r.height < 44 || r.width < 44); }).map(e => e.outerHTML)); assert.deepEqual(bad, [], 'Small controls'); checks++; }
async function scan(p) { await p.addScriptTag({ content: axe }); const v = await p.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })); assert.deepEqual(v.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []); scans++; }
async function shot(p, name, fullPage = false) { await p.screenshot({ path: root + 'screenshots/' + name + '.png', fullPage }); shots++; }
async function navigate(p, task, c) { if (c === 'A' && (task === 'Water' || task === 'Meal' || task === 'History'))
    await p.getByRole('button', { name: task, exact: true }).click();
else {
    await p.getByRole('button', { name: 'Open system', exact: true }).click();
    await p.getByLabel('Find an action').fill(task);
    await p.locator('dialog[open]').getByRole('button', { name: task, exact: true }).click();
} }
async function back(p, c) { if (c === 'A')
    await p.getByRole('button', { name: 'Close layer' }).click();
else
    await p.getByRole('button', { name: 'Home', exact: true }).click(); }
try {
    for (const c of ['A', 'B', 'C'])
        for (const width of [320, 360, 412]) {
            const { p, ctx } = await setup(c, width);
            await layout(p);
            assert(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Home needs scrolling');
            await scan(p);
            await shot(p, `${c}-home-${width}`);
            assert.equal(await p.locator('.recommendation[data-primary=true]').count(), 1);
            await p.getByRole('button', { name: "I'll do this", exact: true }).click();
            assert.equal(await p.locator('dialog').count(), 0);
            assert(await p.locator('.choice').innerText().then(t => t.includes('nothing started')));
            await p.getByRole('button', { name: 'Undo', exact: true }).click();
            await navigate(p, 'Water', c);
            await p.getByLabel('Amount (oz)').fill('0');
            assert.equal(await p.getByLabel('Amount (oz)').evaluate(e => e.checkValidity()), false);
            await p.getByLabel('Amount (oz)').fill('12');
            await layout(p);
            await scan(p);
            if (width === 360)
                await shot(p, `${c}-water`);
            await p.getByRole('button', { name: 'Add demo water', exact: true }).click();
            assert(await p.getByRole('status').innerText().then(t => t.includes('unchanged')));
            await p.getByRole('button', { name: 'Dismiss feedback' }).click();
            await navigate(p, 'Meal', c);
            await p.getByRole('textbox', { name: 'Meal', exact: true }).fill('Sample lunch');
            await p.getByLabel('Calories', { exact: true }).fill('500');
            await p.getByLabel('Protein (g)').fill('30');
            if (width === 360)
                await shot(p, `${c}-meal`);
            await p.getByRole('button', { name: 'Add demo meal' }).click();
            await p.getByRole('button', { name: 'Dismiss feedback' }).click();
            await navigate(p, 'History', c);
            assert(await p.locator('.timeline').innerText().then(t => t.includes('Water · 12 oz') && t.includes('Sample lunch')));
            await layout(p);
            await scan(p);
            if (width === 360)
                await shot(p, `${c}-timeline`);
            await back(p, c);
            await p.getByRole('button', { name: 'Inspect recommendation' }).click();
            assert.equal(await p.locator('.evidence input,.evidence button,.evidence textarea').count(), 0);
            await p.getByText('Inspect source readings', { exact: true }).focus();
            await p.keyboard.press('Enter');
            assert(await p.locator('.evidence details').getAttribute('open') !== null);
            await scan(p);
            if (width === 360)
                await shot(p, `${c}-intelligence`, true);
            await back(p, c);
            await p.getByRole('button', { name: 'Resume workout A', exact: false }).click();
            assert(await p.locator('.workout').innerText().then(t => t.includes('Set 2 of 3')));
            await p.getByRole('button', { name: 'Log demo set' }).click();
            await p.getByRole('button', { name: 'Dismiss feedback' }).click();
            await p.getByRole('button', { name: 'Leave & keep position' }).click();
            await p.getByRole('button', { name: 'Resume workout A', exact: false }).click();
            assert(await p.locator('.workout').innerText().then(t => t.includes('Set 3 of 3')));
            await layout(p);
            await scan(p);
            if (width === 360)
                await shot(p, `${c}-workout`);
            await p.getByRole('button', { name: 'Undo last demo set' }).click();
            assert(await p.locator('.workout').innerText().then(t => t.includes('Set 2 of 3')));
            await p.getByRole('button', { name: 'Finish demo session', exact: true }).click();
            await p.getByRole('button', { name: 'Confirm demo finish' }).click();
            await p.getByRole('button', { name: 'Start demo workout' }).click();
            assert(await p.locator('.workout').innerText().then(t => t.includes('Set 1 of 3')));
            await p.getByRole('button', { name: 'Leave & keep position' }).click();
            await p.getByRole('button', { name: 'Record', exact: true }).click();
            for (let i = 0; i < 10; i++) {
                await p.keyboard.press('Tab');
                assert(await p.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), 'Focus escaped modal');
            }
            await p.keyboard.press('Escape');
            assert.equal(await p.locator('dialog').count(), 0);
            assert.equal(await p.getByRole('button', { name: 'Record', exact: true }).evaluate(e => e === document.activeElement), true);
            if (c === 'C') {
                const before = await p.locator('.state').innerText(), title = await p.locator('.recommendation h2').innerText();
                await p.getByLabel('Activity mode').selectOption('Work');
                assert.equal(await p.locator('.state').innerText(), before);
                assert.equal(await p.locator('.recommendation h2').innerText(), title);
                assert.equal(await p.locator('.mode-actions button').count(), 3);
                if (width === 360)
                    await shot(p, 'C-work-mode');
                await p.getByLabel('Activity mode').selectOption('Train');
                if (width === 360)
                    await shot(p, 'C-train-mode');
            }
            await ctx.setOffline(true);
            await p.getByRole('button', { name: 'Record', exact: true }).click();
            await p.locator('dialog[open]').getByRole('button', { name: 'Water', exact: true }).click();
            await p.getByLabel('Amount (oz)').fill('8');
            await p.getByRole('button', { name: 'Add demo water' }).click();
            assert(await p.getByRole('status').innerText().then(t => t.includes('demo only')));
            await ctx.close();
        }
    for (const c of ['A', 'B', 'C']) {
        const { p, ctx } = await setup(c);
        await p.getByText('Sample scene', { exact: true }).click();
        for (const status of ['GREEN', 'AMBER', 'RED', 'NO_READ']) {
            await p.getByLabel('System Status', { exact: true }).selectOption(status);
            assert.equal(await p.locator('.state').evaluate(e => getComputedStyle(e).borderLeftColor === 'rgb(207, 17, 27)'), status === 'RED');
            assert(await p.locator('.status').innerText().then(t => t.includes(status.replace('_', ' '))));
            assert.equal(await p.locator('.recommendation h2').textContent(), status === 'RED' ? 'Stabilize first' : 'Shift down after work');
            if (status === 'RED') {
                await p.getByRole('button', { name: 'Decline', exact: true }).click();
                assert.equal(await p.locator('.choice').count(), 0);
                await p.getByRole('button', { name: 'Confirm decline', exact: true }).click();
                assert(await p.locator('.choice').innerText().then(t => t.includes('Declined')));
            }
            await layout(p);
            await scan(p);
            await p.getByText('Sample scene', { exact: true }).click();
            await shot(p, `${c}-${status.toLowerCase()}`);
            await p.getByText('Sample scene', { exact: true }).click();
        }
        for (const story of ['BEFORE', 'SHIFT', 'AFTER', 'OFF', 'TRAINING', 'UNKNOWN']) {
            await p.getByLabel('Work context', { exact: true }).selectOption(story);
            assert.equal(await p.locator('.state [aria-current=step]').count(), story === 'UNKNOWN' ? 0 : 1);
            if(story !== 'UNKNOWN') assert.equal(await p.locator('.state [aria-current=step]').innerText(), ({BEFORE:'BEFORE',SHIFT:'SHIFT',AFTER:'AFTER',OFF:'OFF',TRAINING:'OFF'})[story]);
            if (c === 'C' && story === 'UNKNOWN')
                assert.equal(await p.getByLabel('Activity mode').inputValue(), '');
            checks++;
        }
        await p.getByText('Sample scene', { exact: true }).click();
        await shot(p, `${c}-unknown`);
        await ctx.close();
        const reduced = await setup(c, 360, 800, true);
        await reduced.p.getByRole('button', { name: 'Record', exact: true }).click();
        assert.equal(await reduced.p.locator('dialog').evaluate(e => getComputedStyle(e).animationName), 'none');
        await shot(reduced.p, `${c}-reduced-motion`);
        await reduced.ctx.close();
        const desktop = await setup(c, 1440, 1000);
        await layout(desktop.p);
        await scan(desktop.p);
        await shot(desktop.p, `${c}-desktop`);
        await desktop.ctx.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    const result = { passed: true, layoutAndSemanticChecks: checks, axeScans: scans, screenshots: shots, concepts: 3, widths: [320, 360, 412], storageAccess: 0, externalRequests: 0, browserErrors: 0 };
    writeFileSync(root + 'verification.json', JSON.stringify(result, null, 2));
    console.log(result);
}
finally {
    await browser.close();
}
