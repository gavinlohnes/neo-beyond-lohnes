// Harvest Checkpoint 4: vitest-browser-react mounts components into a
// bare test page — it does NOT load index.html or its <link
// rel="stylesheet"> tags. Without this, every CSS-dependent assertion
// (44px tap targets, computed colors, layout) silently measures
// UNSTYLED elements against the browser's bare UA stylesheet, which is
// worse than no test at all (false confidence either way). Side-effect
// importing the same two stylesheets the app itself links makes this
// test project a genuine visual acceptance layer, not just a DOM/logic
// check that happens to run in a browser.
import "../../src/ui/styles/tokens.css";
import "../../src/ui/styles/global.css";
// POLISH-002: the ported command-center prototype, as index.html links it.
import "../../src/ui/cc/cc.css";
import "../../src/ui/cc/shell.css";
import "../../src/ui/cc/skin.css";
import "../../src/ui/styles/fonts.ts";

import Dexie from "dexie";
import { afterEach, beforeEach, vi } from "vitest";

// SHIFT-CHANGE-001: the shift-edge moment takes the whole screen once around a shift (PREFLIGHT,
// LANDING, SECURED), and many TODAY tests start inside those windows for other reasons. It is off by
// default here; tests about it opt in with `globalThis.__beyondShiftChange = true` (the field
// rehearsal walks it on eight weeks of rotation). Test-only: the app itself is unchanged.
vi.mock("../../src/application/shiftChange", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/shiftChange")>();
  return {
    ...actual,
    getShiftChange: (...args: Parameters<typeof actual.getShiftChange>) =>
      (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange ? actual.getShiftChange(...args) : Promise.resolve(null),
  };
});
beforeEach(() => { (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = false; });

// Real Chromium has real IndexedDB — no fake-indexeddb polyfill needed
// here (unlike tests/setup.ts, which is Node-only). But a real database
// also really persists across test runs in the same browser session, so
// the same "delete the named database after each test" pattern
// tests/setup.ts already uses for the Node suite is required here too,
// for the same isolation reason.
afterEach(async () => {
  await Dexie.delete("beyond");
  localStorage.clear();
});
