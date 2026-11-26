/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { readRunCuePrefs, RUN_CUES_KEY } from "../../src/application/runCuePrefs";
import { db } from "../../src/persistence/db";
import { runCueOpener } from "../../src/ui/screens/train/runCueLink";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-RUN-CUES-001: the VOICE CUES switch on the running screen, the Health Bridge link on each of his taps
 * (and none on a reload), and the CUE WORDS sheet. The link opener is watched, so the page never leaves.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
let clock = new Date(2026, 10, 24, 18).getTime();
const advance = (seconds: number) => { clock += seconds * 1000; vi.setSystemTime(clock); };

async function settle() {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
}
async function shot(name: string, selector: string) {
  if (!SHOTS) return;
  await settle();
  const el = document.querySelector(selector) as HTMLElement | null;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(el ? { element: el } : {}) });
}
async function axeClean(label: string, selector: string) {
  await settle();
  const root = document.querySelector(selector);
  expect(root, label).not.toBeNull();
  const r = await axe.run(root!, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
/** No sideways scroll, and nothing he reads under 16 px (short capital labels may be smaller, never under 10 px). */
async function fits(label: string, selector: string, shots: string | null) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width} px`).toBeLessThanOrEqual(width);
    const small = Array.from(document.querySelectorAll<HTMLElement>(`${selector} :is(p, h2, h3, button, label, legend, span)`))
      .filter((el) => {
        if (!el.checkVisibility()) return false;
        const t = el.textContent?.trim() ?? "", cs = getComputedStyle(el), size = Number.parseFloat(cs.fontSize);
        if (!t) return false;
        const isLabel = (t === t.toUpperCase() || cs.textTransform === "uppercase") && t.length <= 32;
        return size < (isLabel ? 10 : 16);
      }).map((el) => el.textContent);
    expect(small, `${label} small text at ${width} px`).toEqual([]);
    for (const control of document.querySelectorAll<HTMLElement>(`${selector} button`)) {
      if (control.checkVisibility()) expect(control.getBoundingClientRect().height, `${control.textContent} at ${width} px`).toBeGreaterThanOrEqual(44);
    }
    if (shots) await shot(`${width}-${shots}`, selector);
  }
  await page.viewport(360, 900);
}

const links = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((c) => String(c[0]));
const ops = (spy: { mock: { calls: unknown[][] } }) => links(spy).map((u) => u.match(/^intent:\/\/run\?op=(\w+)&p=/)?.[1] ?? u);
const payloadOf = (url: string) => JSON.parse(decodeURIComponent(url.slice(url.indexOf("&p=") + 3, url.indexOf("#Intent")))) as {
  id: string; pausedAt?: number; pausedMs: number; cues: { kind: string; text: string; speak: boolean; buzz: boolean }[];
};
const kind = () => document.querySelector("[data-running-live] .running-live__kind")?.textContent;
const voiceSwitch = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("switch", { name: "Voice and buzz with the phone locked (Health Bridge)" });

async function bridgeHasSentData() {
  await db.healthImportReceipts.add({ id: "r1", importedAt: "2026-11-20T10:00:00.000Z", exportedAt: "2026-11-20T09:59:00.000Z", producerVersion: "0.11.2", inserted: 3, revised: 0, skipped: 0 });
}

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 10, 24, 18).getTime();
  vi.setSystemTime(clock);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GRAYSON-TRAIN-RUN-CUES-001 voice cues with the phone locked", () => {
  it("with no Health Bridge data, the switch is off with one line, and START opens nothing", async () => {
    const open = vi.spyOn(runCueOpener, "open").mockReturnValue(true);
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await expect.element(voiceSwitch(screen)).not.toBeChecked();
    await expect.element(screen.getByText("Install Health Bridge 0.12 to hear cues with the phone locked.")).toBeVisible();
    expect(open).not.toHaveBeenCalled();
    await axeClean("switch off", "[data-running-live]");
    await fits("live run, cues off", "[data-running-live]", "live-cues-off");

    // Turning it on mid-run is a tap too: the Bridge picks the run up from its start time.
    await voiceSwitch(screen).click();
    await expect.poll(() => ops(open)).toEqual(["start"]);
    expect(readRunCuePrefs().on).toBe(true);
    await voiceSwitch(screen).click();
    await expect.poll(() => ops(open)).toEqual(["start", "end"]);
    expect(readRunCuePrefs().on).toBe(false);
  });

  it("once Health Bridge has sent data it's on, and START, PAUSE, RESUME and END each hand it the run; a reload hands it nothing", async () => {
    const open = vi.spyOn(runCueOpener, "open").mockReturnValue(true);
    await bridgeHasSentData();
    await startDay();
    let screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await expect.element(voiceSwitch(screen)).toBeChecked();
    await expect.poll(() => ops(open)).toEqual(["start"]);
    const started = payloadOf(links(open)[0]!);
    expect(started.cues.map((c) => c.kind)).toEqual(expect.arrayContaining(["WARMUP", "RUN", "WALK", "HALFWAY", "COOLDOWN", "FINISH"]));
    expect(started.pausedAt).toBeUndefined();
    await axeClean("switch on", "[data-running-live]");
    await fits("live run, cues on", "[data-running-live]", "live-cues-on");

    advance(320);
    await expect.poll(kind).toBe("RUN");
    // A reload mid-run: same interval, no link.
    await cleanup();
    screen = await render(<TrainScreen />);
    await expect.poll(kind).toBe("RUN");
    await settle();
    expect(ops(open)).toEqual(["start"]);

    await screen.getByRole("button", { name: "PAUSE" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "pause"]);
    const pausedAt = payloadOf(links(open)[1]!).pausedAt!;
    expect(pausedAt).toBeGreaterThanOrEqual(clock);
    expect(pausedAt).toBeLessThan(clock + 2000);
    advance(30);
    await screen.getByRole("button", { name: "RESUME" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "pause", "resume"]);
    const resumed = payloadOf(links(open)[2]!);
    expect(resumed.pausedAt).toBeUndefined();
    // About the 30 seconds paused (the faked clock creeps on in real time between taps).
    expect(Math.abs(resumed.pausedMs - 30_000)).toBeLessThan(1500);

    await screen.getByRole("button", { name: "END", exact: true }).click();
    await screen.getByRole("button", { name: "END RUN" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "pause", "resume", "end"]);
    expect(new Set(links(open).map((u) => payloadOf(u).id)).size).toBe(1);
  });

  it("the pain control tells the Bridge to stop; voice off keeps the buzz; a run that reaches the end opens no link", async () => {
    const open = vi.spyOn(runCueOpener, "open").mockReturnValue(true);
    await bridgeHasSentData();
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await screen.getByRole("checkbox", { name: "Voice" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "start"]);
    const update = payloadOf(links(open)[1]!);
    expect(update.cues.every((c) => !c.speak)).toBe(true);
    expect(update.cues.filter((c) => c.buzz).map((c) => c.kind)).toContain("RUN");
    await screen.getByRole("button", { name: "PAIN OR SOMETHING WRONG" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "start", "end"]);
    await screen.getByRole("button", { name: "REPEAT THIS RUN" }).click();

    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await expect.poll(() => ops(open).length).toBe(4);
    advance(28 * 60 + 35);
    await expect.element(screen.getByRole("heading", { name: "Week 1, run 1 done." })).toBeVisible();
    await settle();
    expect(ops(open)).toEqual(["start", "start", "end", "start"]);
  });

  it("says once when Health Bridge doesn't answer, and the run carries on", async () => {
    vi.spyOn(runCueOpener, "open").mockReturnValue(true);
    await bridgeHasSentData();
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await expect.element(screen.getByText(/Health Bridge didn't answer, so cues stay on this screen/), { timeout: 5000 }).toBeVisible();
    advance(300);
    await expect.poll(kind).toBe("RUN");
  });

  it("CUE WORDS: rewrite a cue with placeholders, PLAY speaks it, switch one off, RESET restores; new words reach the Bridge once, on close", async () => {
    const open = vi.spyOn(runCueOpener, "open").mockReturnValue(true);
    const spoken: string[] = [];
    vi.spyOn(speechSynthesis, "speak").mockImplementation((u) => { spoken.push(u.text); });
    vi.spyOn(speechSynthesis, "cancel").mockImplementation(() => {});
    await bridgeHasSentData();
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await expect.poll(() => ops(open)).toEqual(["start"]);

    await screen.getByRole("button", { name: "CUE WORDS" }).click();
    const sheet = page.getByRole("dialog", { name: "Cue words" });
    await expect.element(sheet).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("Cue words");
    const runRow = () => document.querySelector('[data-run-words] [data-cue="RUN"] [data-hear]')?.textContent;
    expect(runRow()).toBe("Run for 1 minute");
    await expect.element(sheet.getByText("Voice and speed follow your phone's text-to-speech settings.")).toBeVisible();
    await axeClean("cue words", "[data-run-words]");
    await fits("cue words", "[data-run-words]", "cue-words");

    await userEvent.fill(sheet.getByRole("textbox", { name: "Words for Walk" }), "Ease off, {minutes} min {seconds}");
    await expect.poll(() => document.querySelector('[data-run-words] [data-cue="WALK"] [data-hear]')?.textContent).toBe("Ease off, 1 min 30");
    await sheet.getByRole("button", { name: "Play the Walk cue" }).click();
    expect(spoken).toEqual(["Ease off, 1 min 30"]);
    const halfway = sheet.getByRole("listitem").filter({ hasText: "Halfway" }).getByRole("checkbox", { name: "Say it" });
    await halfway.click();
    await expect.element(sheet.getByRole("button", { name: "Play the Halfway cue" })).toBeDisabled();
    expect(readRunCuePrefs().words.WALK).toBe("Ease off, {minutes} min {seconds}");
    expect(readRunCuePrefs().speak.HALFWAY).toBe(false);
    // No link while typing.
    expect(ops(open)).toEqual(["start"]);
    await shot("360-cue-words-edited", "[data-run-words]");

    await sheet.getByRole("button", { name: "DONE" }).click();
    await expect.poll(() => ops(open)).toEqual(["start", "start"]);
    const sent = payloadOf(links(open)[1]!);
    expect(sent.cues.find((c) => c.kind === "WALK")!.text).toBe("Ease off, 1 min 30");
    expect(sent.cues.find((c) => c.kind === "HALFWAY")!.speak).toBe(false);
    await expect.poll(() => document.activeElement?.textContent).toBe("CUE WORDS");

    await screen.getByRole("button", { name: "CUE WORDS" }).click();
    await page.getByRole("dialog", { name: "Cue words" }).getByRole("button", { name: "RESET" }).click();
    await expect.poll(() => document.querySelector('[data-run-words] [data-cue="WALK"] [data-hear]')?.textContent).toBe("Walk for 1 minute 30 seconds");
    expect(readRunCuePrefs()).toMatchObject({ words: {}, speak: {} });
    expect(JSON.parse(localStorage.getItem(RUN_CUES_KEY)!)).toMatchObject({ words: {}, speak: {} });
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("dialog", { name: "Cue words" })).not.toBeInTheDocument();
  });
});
