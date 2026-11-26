import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { useState } from "react";
import "../../src/ui/styles/global.css";
import { FastCapture } from "../../src/ui/components/FastCapture";
import { RecordSheets } from "../../src/ui/components/RecordSheets";
import { CheckInSheet } from "../../src/ui/screens/today/CheckInSheet";
import { VoiceSettings } from "../../src/ui/screens/more/VoiceSettings";
import type { PartialCheckInValues } from "../../src/ui/screens/today/checkInFields";
import { startDay } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";
import { PRIVACY_LINE, RETRY_LINE } from "../../src/ui/speech/TalkButton";

/** GRAYSON-DICTATE-001 (C7.1): TALK in quick capture, the meal log and the check-in. Invented data; fake voice. */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
let script: string[] = [];
class FakeRecognition {
  lang = ""; interimResults = false;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onend: (() => void) | null = null; onerror: (() => void) | null = null;
  start() { const said = script.shift(); setTimeout(() => { if (said === "<error>") this.onerror?.(); else if (said) this.onresult?.({ results: [[{ transcript: said }]] }); this.onend?.(); }, 10); }
  stop() {} abort() {}
}
const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
let webkit: unknown;
beforeEach(async () => {
  localStorage.clear(); script = [];
  webkit = w.webkitSpeechRecognition;
  w.SpeechRecognition = FakeRecognition;
  vi.spyOn(speechSynthesis, "cancel").mockImplementation(() => {});
  await page.viewport(360, 900);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); delete w.SpeechRecognition; w.webkitSpeechRecognition = webkit; });

const q = (sel: string) => document.querySelector(sel);
function fits(root: Element, width: number) {
  const seen = (el: HTMLElement) => el.getClientRects().length > 0;
  for (const b of [...root.querySelectorAll<HTMLElement>("button")].filter(seen)) expect(b.getBoundingClientRect().height, `${width} ${b.textContent}`).toBeGreaterThanOrEqual(44);
  for (const el of [...root.querySelectorAll<HTMLElement>(".heard p, .heard li span, .talk p, .heard button, .talk button")].filter(seen)) if (el.textContent?.trim()) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent}`).toBeGreaterThanOrEqual(16);
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}
async function aa(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"], rules: { "color-contrast": { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
const capture = () => render(<FastCapture busy={false} onBusy={() => {}} onSaved={() => {}} onOpenCapture={() => {}} />);
const box = () => (q('textarea[aria-label="Capture a thought"]') as HTMLTextAreaElement | null)?.value ?? null;
const rows = () => [...document.querySelectorAll(".heard__row > span")].map((e) => e.textContent);

describe("quick capture", () => {
  beforeEach(async () => { await startDay(); await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 }); });

  for (const width of [320, 360, 412]) {
    it(`${width} px: one sentence becomes water, a meal and a note; REMOVE drops one; SAVE ALL saves the rest and nothing else`, async () => {
      await page.viewport(width, 900);
      script = ["32 oz water, chicken bowl, call the vet"];
      const screen = await capture();
      await screen.getByRole("button", { name: "TALK" }).click();
      await expect.poll(rows).toHaveLength(3);
      expect(rows()[0]).toMatch(/32 oz water/);
      expect(rows()[1]).toMatch(/Chicken bowl/);
      expect(rows()[2]).toBe("Note: call the vet");
      // The privacy line showed under TALK while he talked (TALK gives way to the preview); once only.
      expect(localStorage.getItem("beyond.dictation.privacySeen.v1")).toBe("1");
      fits(q(".fast-capture")!, width);
      await aa(`${width} preview`, q(".fast-capture")!);
      if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/360-quick-capture-preview.png`, element: q(".fast-capture") as HTMLElement });
      await screen.getByRole("button", { name: /^REMOVE Note/ }).click();
      await screen.getByRole("button", { name: "SAVE ALL" }).click();
      await expect.element(screen.getByRole("status")).toHaveTextContent("Saved 2.");
      expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
      expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
      expect(await db.captureItems.count()).toBe(0);
    });
  }

  it("CHANGE WORDS returns the words; KEEP AS ONE NOTE saves one raw capture", async () => {
    script = ["32 oz water, call the vet", "32 oz water, call the vet"];
    const screen = await capture();
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.poll(rows).toHaveLength(2);
    await screen.getByRole("button", { name: "CHANGE WORDS" }).click();
    expect(box()).toBe("32 oz water, call the vet");
    expect(q(".heard")).toBeNull();
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.poll(rows).toHaveLength(2);
    await screen.getByRole("button", { name: "KEEP AS ONE NOTE" }).click();
    await expect.poll(() => db.captureItems.count()).toBe(1);
    expect((await db.captureItems.toArray())[0]!.text).toBe("32 oz water, call the vet");
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  });

  it("a question stays in the box; words it finds nothing in stay in the box; sort off only fills the box", async () => {
    script = ["what did I eat today?", "the garage door is squeaky"];
    const screen = await capture();
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.poll(box).toBe("what did I eat today?");
    await new Promise((r) => setTimeout(r, 100));
    expect(q(".heard")).toBeNull();
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.poll(box).toBe("the garage door is squeaky");
    expect(q(".heard")).toBeNull();
    await cleanup();
    localStorage.setItem("beyond.dictation.v1", JSON.stringify({ talk: true, sort: false }));
    script = ["32 oz water"];
    const again = await capture();
    await again.getByRole("button", { name: "TALK" }).click();
    await expect.poll(box).toBe("32 oz water");
    await new Promise((r) => setTimeout(r, 100));
    expect(q(".heard")).toBeNull();
  });

  it("keyboard only: TALK and SAVE ALL by Enter", async () => {
    script = ["16 oz water"];
    await capture();
    (q(".talk__button") as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(rows).toHaveLength(1);
    [...document.querySelectorAll<HTMLButtonElement>(".heard__buttons button")].find((b) => b.textContent === "SAVE ALL")!.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  });

  it("an error shows the retry line and keeps the words; no Web Speech or TALK off: no TALK", async () => {
    script = ["<error>"];
    const screen = await capture();
    await screen.getByRole("textbox", { name: "Capture a thought" }).fill("half typed");
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.element(screen.getByText(RETRY_LINE)).toBeVisible();
    expect(box()).toBe("half typed");
    await cleanup();
    delete w.SpeechRecognition; delete w.webkitSpeechRecognition;
    await capture();
    expect(q(".talk__button")).toBeNull();
    await cleanup();
    w.SpeechRecognition = FakeRecognition;
    localStorage.setItem("beyond.dictation.v1", JSON.stringify({ talk: false, sort: true }));
    await capture();
    expect(q(".talk__button")).toBeNull();
  });
});

const sheet = () => render(<RecordSheets target="meal" open={() => {}} close={() => {}} onSaved={() => {}} onBusy={() => {}} onHistory={() => {}} onWorkout={() => {}} onNotes={() => {}} />);
describe("meal log", () => {
  it("a saved meal becomes a card with WHEN applied; an unknown food lands in the search box; the rest is shown", async () => {
    // A fixed time inside the lived day: on the real clock between 16:30 and 17:30, "1 H AGO" falls before the day's
    // 16:30 start and is rightly refused, which failed CI on #736 at 16:36 UTC.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    await startDay();
    await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 });
    script = ["chicken bowl and pepperoni pizza and blue sky"];
    const screen = await sheet();
    await expect.element(screen.getByRole("button", { name: "TALK to log meals" })).toBeVisible();
    await screen.getByRole("button", { name: "1 H AGO" }).click();
    await screen.getByRole("button", { name: "TALK to log meals" }).click();
    await expect.poll(rows).toHaveLength(1);
    expect(rows()[0]).toMatch(/Chicken bowl/);
    await expect.poll(() => (q('input[aria-label="Search your meals and foods"]') as HTMLInputElement).value).toBe("pepperoni pizza");
    await expect.element(screen.getByText("Didn't catch: blue sky")).toBeVisible();
    fits(q(".record-meal-search")!.parentElement!, 360);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-meal-log-talk.png`, element: q(".record-meal-search")!.parentElement as HTMLElement });
    const before = Date.now();
    await screen.getByRole("button", { name: "SAVE ALL" }).click();
    await expect.element(screen.getByText("Saved 1.")).toBeVisible();
    const meal = (await db.events.where("type").equals("MEAL_LOGGED").toArray())[0]!;
    expect(Math.abs(Date.parse(meal.occurredAt) - (before - 3_600_000))).toBeLessThan(60_000);
  });

  it("TALK is hidden for an earlier day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 22, 17));
    await startDay(new Date(2026, 10, 22, 16, 30).toISOString());
    vi.setSystemTime(new Date(2026, 10, 23, 17));
    await startDay(new Date(2026, 10, 23, 16, 30).toISOString());
    const screen = await sheet();
    await expect.element(screen.getByRole("button", { name: "TALK to log meals" })).toBeVisible();
    await screen.getByRole("button", { name: "YESTERDAY" }).click();
    await expect.poll(() => q(".record-meal-search .talk__button")).toBeNull();
    vi.useRealTimers();
  });
});

function CheckIn({ mode = "new" as "new" | "fix", onSubmit = () => {} }) {
  const [values, setValues] = useState<PartialCheckInValues>({});
  return <CheckInSheet open mode={mode} close={() => {}} values={values} setValues={setValues} busy={false} isInFlight={() => false} submit={onSubmit} />;
}
describe("check-in", () => {
  it("spoken values select the chips; nothing submits until SUBMIT CHECK-IN", async () => {
    script = ["energy 3, stress two, mood 4, sore 1, craving 0", "how are you"];
    const submit = vi.fn();
    const screen = await render(<CheckIn onSubmit={submit} />);
    await screen.getByRole("button", { name: "TALK" }).click();
    const pressed = () => [...document.querySelectorAll('section.check-in-scale button[aria-pressed="true"]')].map((b) => `${b.closest("section")!.getAttribute("aria-label")} ${b.textContent}`);
    await expect.poll(pressed).toHaveLength(5);
    await expect.element(screen.getByText(PRIVACY_LINE)).toBeVisible();
    expect(pressed()).toEqual(expect.arrayContaining([expect.stringMatching(/3$/), expect.stringMatching(/2$/), expect.stringMatching(/4$/)]));
    expect(submit).not.toHaveBeenCalled();
    const dialog = q("dialog[open]") ?? document.body;
    await aa("check-in", dialog);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-check-in-after-talk.png`, element: dialog as HTMLElement });
    await screen.getByRole("button", { name: "TALK" }).click();
    await expect.element(screen.getByText("Say each one with a number, like energy 3.")).toBeVisible();
    expect(pressed()).toHaveLength(5);
    await screen.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("TALK isn't in fix mode", async () => {
    await render(<CheckIn mode="fix" />);
    await expect.poll(() => q("dialog[open]")).not.toBeNull();
    expect(q(".talk__button")).toBeNull();
  });
});

describe("MORE → Voice", () => {
  it("both switches default on and save at once", async () => {
    const screen = await render(<VoiceSettings />);
    const talk = screen.getByRole("button", { name: "TALK buttons" });
    await expect.element(talk).toHaveAttribute("aria-pressed", "true");
    await expect.element(screen.getByRole("button", { name: "Sort what I say into logs" })).toHaveAttribute("aria-pressed", "true");
    for (const width of [320, 412]) { await page.viewport(width, 900); fits(q(".today-quiet-settings")!, width); }
    await page.viewport(360, 900);
    await aa("voice settings", q(".today-quiet-settings")!);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-more-voice.png`, element: q(".today-quiet-settings") as HTMLElement });
    await talk.click();
    expect(JSON.parse(localStorage.getItem("beyond.dictation.v1")!)).toEqual({ talk: false, sort: true });
  });
});
