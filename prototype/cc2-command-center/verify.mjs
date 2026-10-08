import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const directory = fileURLToPath(new URL(".", import.meta.url));
const origin = process.argv[2] ?? "http://127.0.0.1:5174";
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ["--no-sandbox"], headless: true });
const axe = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const screenshotDirectory = `${directory}screenshots`;
mkdirSync(screenshotDirectory, { recursive: true });
const report = { mobileScenes: 0, phaseCases: 0, axeScans: 0, interactionChecks: 0, reducedMotionCases: 0, screenshots: [], externalRequests: [], pageErrors: [], storageCalls: [], violations: [] };

async function openPage(width, query = "", reducedMotion = "no-preference") {
  const page = await browser.newPage({ viewport: { width, height: 915 }, deviceScaleFactor: 1, reducedMotion });
  page.on("pageerror", error => report.pageErrors.push(error.message));
  page.on("request", request => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== new URL(origin).origin) report.externalRequests.push(url.href);
  });
  await page.addInitScript(() => {
    window.__storageCalls = [];
    function block(object, name) {
      object[name] = function () { window.__storageCalls.push(name); throw new Error(`Prototype must not access storage: ${name}`); };
    }
    for (const name of ['open','deleteDatabase','databases']) block(IDBFactory.prototype, name);
    for (const name of ['getItem','setItem','removeItem','clear','key']) block(Storage.prototype, name);
    if (navigator.serviceWorker) block(navigator.serviceWorker, 'register');
  });
  const response = await page.goto(`${origin}/?${query}`);
  assert.equal(response.status(), 200);
  await page.locator('.state-rail').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  return page;
}

async function checkGeometry(page, label) {
  const result = await page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const text = [...document.querySelectorAll('body *')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()));
    const controls = [...document.querySelectorAll('button,select,summary')].filter(visible);
    const redOutsideRail = [...document.querySelectorAll('.device-field *')].filter(e => visible(e) && !e.closest('.state-rail') && !(document.querySelector('.cc2').dataset.concept === 'D' && e.matches('.recommendation[data-dominant=true] .demo-primary, .destination-preview .demo-primary')) && ['color','backgroundColor','borderTopColor','borderLeftColor','borderBottomColor','borderRightColor'].some(key => getComputedStyle(e)[key] === 'rgb(208, 20, 27)'));
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      smallText: text.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent.trim()),
      smallControls: controls.filter(e => { const r=e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(e => e.textContent.trim()),
      redOutsideRail: redOutsideRail.map(e => e.outerHTML.slice(0,120)),
      rows: document.querySelectorAll('[data-shift-clock-row]').length,
      dominant: document.querySelectorAll('.command-surface').length,
      storage: window.__storageCalls,
    };
  });
  assert.equal(result.overflow, false, `Horizontal overflow: ${label}`);
  assert.deepEqual(result.smallText, [], `Text below 16px: ${label}`);
  assert.deepEqual(result.smallControls, [], `Controls below 44px: ${label}`);
  assert.deepEqual(result.redOutsideRail, [], `Red outside System Status rail: ${label}`);
  assert(result.rows <= 4, `Extra TODAY phase row: ${label}`);
  assert(result.dominant <= 1, `Extra dominant surface: ${label}`);
  assert.deepEqual(result.storage, [], `Storage access: ${label}`);
  report.storageCalls.push(...result.storage);
}

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('.device-field').offsetTop, behavior:'instant' }));
  if (!name.startsWith('concept-d-')) return; // Preserve the original A/B/C review captures.
  await page.screenshot({ path: `${screenshotDirectory}/${name}.png` });
  report.screenshots.push(`${name}.png`);
}

try {
  for (const concept of ['A','B','C','D']) {
    for (const width of [320,360,412]) {
      for (const example of ['GREEN','AMBER','RED','UNKNOWN','NO_READ']) {
        const page = await openPage(width, `concept=${concept}&example=${example}&phase=AFTER`);
        const label = `${concept}/${example}/${width}`;
        const rail = page.locator('.state-rail');
        const expectedStatus = ['UNKNOWN','NO_READ'].includes(example) ? 'NO_READ' : example;
        assert.equal(await rail.getAttribute('data-status'), expectedStatus);
        assert.equal(await rail.locator('details').getAttribute('open'), null, `INTELLIGENCE not closed: ${label}`);
        assert.equal(await page.locator('[data-shift-clock-row]').count(), example === 'UNKNOWN' ? 3 : 4);
        assert.equal(await page.locator('.command-surface').count(), ['UNKNOWN','NO_READ'].includes(example) ? 0 : 1);
        if (example === 'UNKNOWN') {
          assert.equal(await rail.locator('[aria-current=step]').count(), 0);
          assert.match(await rail.innerText(), /Context not confirmed/i);
          assert.equal(await page.getByRole('button',{name:'YES',exact:true}).count(), 1);
          assert.equal(await page.getByRole('button',{name:'NO',exact:true}).count(), 1);
        } else {
          assert.equal(await rail.locator('[aria-current=step]').getAttribute('data-phase'), 'AFTER');
          assert.equal(await rail.getByRole('button',{name:'CHANGE TO OFF',exact:true}).count(), 1);
        }
        const color = await rail.evaluate(e => getComputedStyle(e).borderLeftColor);
        if (example === 'RED') assert.equal(color, 'rgb(208, 20, 27)');
        else assert.notEqual(color, 'rgb(208, 20, 27)');
        await checkGeometry(page, label);
        if (width === 360 || concept === 'D') {
          await page.addScriptTag({content:axe});
          const results = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }));
          assert.deepEqual(results.violations.map(v => ({id:v.id,nodes:v.nodes.map(n=>n.target)})), [], `Accessibility: ${label}`);
          report.axeScans++;
        }
        if ((width === 412 || concept === 'D') && example !== 'NO_READ') await capture(page, `concept-${concept.toLowerCase()}-${example.toLowerCase()}-${width}`);
        if (concept === 'A' && example === 'GREEN' && width !== 412) await capture(page, `concept-a-green-${width}`);
        await rail.locator('summary').filter({hasText:'INTELLIGENCE'}).click();
        await page.locator('.intelligence-data').waitFor({state:'visible'});
        assert.match(await page.locator('.intelligence-data').innerText(), /Synthetic|UNKNOWN|unanswered/);
        assert.equal(await page.locator('[data-shift-clock-row]').count(), example === 'UNKNOWN' ? 3 : 4);
        await checkGeometry(page, label+'/expanded');
        if (concept === 'D') {
          await page.addScriptTag({content:axe});
          const audit = await page.evaluate(async () => window.axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
          assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})), [], `Expanded accessibility: ${label}`);
          assert.equal(await page.locator('.intelligence-data button,.intelligence-data input,.intelligence-data select').count(), 0);
          report.axeScans++;
        }
        if ((width === 412 || concept === 'D') && example === 'GREEN') await capture(page, `concept-${concept.toLowerCase()}-intelligence-${width}`);
        report.mobileScenes++;
        await page.close();
      }
    }
    for (const phase of ['BEFORE','SHIFT','AFTER','OFF']) {
      const page=await openPage(360, `concept=${concept}&phase=${phase}`);
      assert.equal(await page.locator('.phase-track [aria-current=step]').getAttribute('data-phase'), phase);
      assert.equal(await page.locator('[data-shift-clock-row]').count(), phase === 'AFTER' ? 4 : 2);
      await page.getByRole('button',{name:'Open TOOLS',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'MARK WORK ENDED',exact:true}).count(), phase === 'SHIFT' ? 1 : 0);
      if (phase === 'SHIFT') assert.match(await page.locator('.rail-detail').innerText(), /Shift ends in 2h 30m/);
      if (phase === 'BEFORE') assert.match(await page.locator('.rail-detail').innerText(), /Shift in 1h/);
      if (phase === 'OFF') assert.equal(await page.getByRole('button',{name:'CHANGE TO WORKING',exact:true}).count(), 1);
      await checkGeometry(page, `${concept}/${phase}/tools`);
      report.phaseCases++;
      await page.close();
    }
    const interactive=await openPage(412, `concept=${concept}`);
    if (concept === 'D') {
      const disclosure=interactive.locator('.state-rail summary');
      await disclosure.focus();
      await interactive.keyboard.press('Enter');
      assert.notEqual(await interactive.locator('.state-rail details').getAttribute('open'),null);
      await interactive.keyboard.press('Enter');
      assert.equal(await interactive.locator('.state-rail details').getAttribute('open'),null);
    }
    await interactive.getByRole('button',{name:/^I'll do this/}).click();
    assert.match(await interactive.getByRole('status').innerText(), /Nothing saved or started/);
    await interactive.getByRole('button',{name:'Dismiss preview feedback'}).click();
    await interactive.getByRole('button',{name:'Open TOOLS',exact:true}).click();
    await interactive.getByRole('button',{name:'CLOSE TOOLS',exact:true}).click();
    await interactive.getByRole('button',{name:'TRAIN',exact:true}).click();
    assert.match(await interactive.locator('main').innerText(), /Production TRAIN stays unchanged/);
    await interactive.getByRole('button',{name:'RETURN TO TODAY'}).click();
    for (const next of ['A','B','C','D']) {
      await interactive.getByRole('button',{name:new RegExp(`^Concept ${next}`)}).click();
      assert.equal(await interactive.locator('.cc2').getAttribute('data-concept'),next);
      assert.equal(await interactive.locator('.state-rail details').getAttribute('open'),null);
    }
    await interactive.locator('select').first().selectOption('RED');
    await interactive.getByRole('button',{name:'Not doing this',exact:true}).click();
    assert.match(await interactive.locator('.preview-confirm').innerText(), /RED-capacity override needs confirmation/);
    assert.equal(await interactive.getByRole('status').count(), 0);
    await interactive.getByRole('button',{name:'CONFIRM PREVIEW DECLINE',exact:true}).click();
    assert.match(await interactive.getByRole('status').innerText(), /Nothing saved or started/);
    await checkGeometry(interactive, `${concept}/interactive`);
    report.interactionChecks++;
    await interactive.close();
    const reduced=await openPage(412, `concept=${concept}&example=RED`, 'reduce');
    await reduced.locator('.state-rail summary').filter({hasText:'INTELLIGENCE'}).click();
    assert.equal(await reduced.locator('main').evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.equal(await reduced.locator('.demo-primary').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
    await checkGeometry(reduced,`${concept}/reduced`);
    await capture(reduced, `concept-${concept.toLowerCase()}-reduced-motion-412`);
    report.reducedMotionCases++;
    await reduced.close();
    if (concept === 'D') for (const width of [320,360]) {
      const page = await openPage(width, 'concept=D&example=RED', 'reduce');
      await page.locator('.state-rail summary').click();
      await checkGeometry(page, `D/reduced/${width}`);
      assert.equal(await page.locator('main').evaluate(e => getComputedStyle(e).animationName), 'none');
      await capture(page, `concept-d-reduced-motion-${width}`);
      report.reducedMotionCases++;
      await page.close();
    }
  }
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.externalRequests,[]);
  assert.deepEqual(report.storageCalls,[]);
  writeFileSync(`${directory}verification.json`, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  await browser.close();
}
