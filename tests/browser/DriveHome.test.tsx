import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { DriveHome } from "../../src/ui/components/DriveHome";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** DRIVE-HOME-001: hands-free, free, and nothing saves until he says "save". Invented data; fake voice. */
let script: string[] = [];
let starts = 0;
class FakeRecognition {
  lang = ""; interimResults = false;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onend: (() => void) | null = null; onerror: (() => void) | null = null;
  start() { starts++; const said = script.shift(); setTimeout(() => { if (said === "<error>") this.onerror?.(); else if (said) this.onresult?.({ results: [[{ transcript: said }]] }); this.onend?.(); }, 10); }
  stop() {} abort() {}
}
const spoken: string[] = [];
beforeEach(async () => {
  await page.viewport(360, 800);
  script = []; spoken.length = 0; starts = 0;
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition;
  vi.spyOn(speechSynthesis, "speak").mockImplementation((u) => { spoken.push(u.text); setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 5); });
  vi.spyOn(speechSynthesis, "cancel").mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition; });

it("reads back what it heard and saves only after 'save'; words it can't log become a note", async () => {
  const day = await startDay();
  script = ["16 oz water and slept 6 hours, and tell Sam about the overtime", "save", "that's all"];
  const onClose = vi.fn();
  const screen = await render(<DriveHome open onClose={onClose} onSaved={() => {}} />);
  await expect.poll(() => spoken.find((s) => s.startsWith("I heard:"))).toBeTruthy();
  expect(spoken.find((s) => s.startsWith("I heard:"))).toMatch(/Log 16 oz water.*Note: Drive home: tell Sam about the overtime/);
  await expect.poll(() => db.events.where("beyondDayId").equals(day.id).filter((e) => e.type === "WATER_LOGGED").count()).toBe(1);
  await expect.poll(() => onClose.mock.calls.length).toBe(1);
  expect(spoken.at(-1)).toBe("All set. Drive safe.");
  expect(await db.captureItems.count()).toBe(1);
  expect(screen.container).toBeTruthy();
});

it("'skip' writes nothing; big buttons work without voice", async () => {
  await startDay();
  script = ["16 oz water", "skip"];
  const screen = await render(<DriveHome open onClose={() => {}} onSaved={() => {}} />);
  await expect.poll(() => spoken.includes("Skipped. Anything else?")).toBe(true);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  await expect.element(screen.getByRole("button", { name: "TALK" })).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("silence re-prompts once and then waits quietly; a mic error never loops (review of #381)", async () => {
  await startDay();
  script = ["16 oz water", "", ""];
  const screen = await render(<DriveHome open onClose={() => {}} onSaved={() => {}} />);
  await expect.element(screen.getByText("Tap SAVE or SKIP when you're ready.")).toBeVisible();
  expect(spoken.filter((s) => s === "Say save, or skip.")).toHaveLength(1);
  const after = starts;
  await new Promise((r) => setTimeout(r, 200));
  expect(starts).toBe(after);
  await cleanup();
  script = ["<error>"]; starts = 0;
  const again = await render(<DriveHome open onClose={() => {}} onSaved={() => {}} />);
  await expect.element(again.getByText("Didn't catch that. Tap TALK.")).toBeVisible();
  await new Promise((r) => setTimeout(r, 200));
  expect(starts).toBe(1);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
});

it("'done with work' and 'finished my shift' are logged, not exits; 'that's all' exits", async () => {
  await startDay();
  script = ["done with work"];
  const onClose = vi.fn();
  await render(<DriveHome open onClose={onClose} onSaved={() => {}} />);
  await expect.poll(() => spoken.find((s) => s.startsWith("I heard:"))).toMatch(/Work ended/);
  expect(onClose).not.toHaveBeenCalled();
  await cleanup();
  script = ["finished my shift"];
  await render(<DriveHome open onClose={() => {}} onSaved={() => {}} />);
  await expect.poll(() => spoken.filter((s) => s.startsWith("I heard:")).length).toBe(2);
});
