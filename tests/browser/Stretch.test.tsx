import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { StretchSuggestSettings } from "../../src/ui/screens/more/StretchSuggestSettings";
import { updateSchedulePattern } from "../../src/application/commands";
import { getStretchRoutines } from "../../src/application/stretchRoutines";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { runCueOpener } from "../../src/ui/screens/train/runCueLink";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-HOME-STRETCH-001 slice B on TRAIN. The default rotation's Sat 14 Nov night shift ends Sun 15 at 06:00, so at
 * 06:30 TRAIN suggests After shift. Fake Date drives the player's clock. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0, s = 0) => new Date(2026, 10, d, h, m, s);
const player = () => document.querySelector<HTMLElement>(".stretch-player");
const panel = () => document.querySelector<HTMLElement>(".stretch-routines");
const status = () => player()?.querySelector("[role='status']")?.textContent ?? "";
let opened: string[] = [];

beforeEach(async () => {
  await page.viewport(360, 900);
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  // VOICE CUES on in his run-cue settings; capture what would be handed to Health Bridge.
  localStorage.setItem("beyond.runCues.v1", JSON.stringify({ on: true, voice: true, buzz: true, words: {}, speak: {} }));
  opened = [];
  vi.spyOn(runCueOpener, "open").mockImplementation((url: string) => { opened.push(url); return true; });
  vi.setSystemTime(at(15, 6, 30));
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("stretching on TRAIN", () => {
  it("suggests After shift with why; one tap starts it; cues, PAUSE, SKIP, +15 S; END saves what was played", async () => {
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText(/^Your shift ended at 6:00\. After shift fits now · 9 min\.$/)).toBeVisible();
    for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    expect((await axe.run(panel()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/suggestion-360.png`, element: panel()! });

    await screen.getByRole("button", { name: "START AFTER SHIFT", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Neck side stretch" })).toBeVisible();
    await expect.poll(status).toBe("Neck side stretch, left side");
    await expect.poll(() => opened.length).toBe(1);
    expect(decodeURIComponent(opened[0]!)).toMatch(/op=start&p=.*"title":"Stretch · After shift"/);
    expect(player()!.textContent).toContain("Left side");
    for (const b of player()!.querySelectorAll("button")) expect(Math.round(b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    expect((await axe.run(player()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/player-${w}.png`, element: player()! }); }
    await page.viewport(360, 900);

    // 31 s in: the other side.
    vi.setSystemTime(at(15, 6, 30, 31));
    await expect.poll(status).toBe("Switch sides");
    expect(player()!.textContent).toContain("Right side");
    // PAUSE freezes the hold; a minute later it hasn't moved; RESUME carries on.
    await screen.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect.poll(status).toBe("Paused");
    vi.setSystemTime(at(15, 6, 31, 31));
    await new Promise((r) => setTimeout(r, 400));
    expect(player()!.textContent).toContain("Right side");
    await screen.getByRole("button", { name: "RESUME", exact: true }).click();
    // SKIP: the next hold now (neck, round 2, left side).
    await screen.getByRole("button", { name: "SKIP", exact: true }).click();
    await expect.poll(() => player()!.textContent ?? "").toContain("Left side");
    // +15 S: the hold gains 15 seconds.
    const before = player()!.querySelector(".stretch-player__count")!.textContent;
    await screen.getByRole("button", { name: "Add 15 seconds", exact: true }).click();
    await expect.poll(() => player()!.querySelector(".stretch-player__count")!.textContent).not.toBe(before);
    expect(opened.length).toBeGreaterThanOrEqual(4); // start, pause, resume, skip, +15 each told Health Bridge
    // Two minutes in, END: 2 minutes played, saved as a partial recovery session.
    vi.setSystemTime(at(15, 6, 33, 31));
    await screen.getByRole("button", { name: "END", exact: true }).click();
    await expect.poll(async () => (await db.workoutSessions.toArray())[0]?.status).toBe("PARTIAL");
    expect((await db.workoutSessions.toArray())[0]!.stretchRoutine).toEqual({ id: "starter-after-shift", name: "After shift", completed: false });
    await expect.poll(player).toBeNull();
  });

  it("played to the end, it saves itself as a COMPLETED recovery session, under 10 minutes", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START AFTER SHIFT", exact: true }).click();
    await expect.poll(status).toBe("Neck side stretch, left side");
    vi.setSystemTime(at(15, 6, 39, 31)); // 9 minutes and a second
    await expect.poll(async () => (await db.workoutSessions.toArray())[0]?.status, { timeout: 5000 }).toBe("COMPLETED");
    expect((await db.workoutSessions.toArray())[0]!.stretchRoutine).toMatchObject({ completed: true });
  });

  it("edit a routine's hold and RESET it; every routine starts from the list in two taps", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByText("STRETCH ROUTINES", { exact: true }).click();
    await screen.getByRole("button", { name: "Edit After shift", exact: true }).click();
    await screen.getByRole("combobox", { name: "Hold for Neck side stretch" }).selectOptions("45");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/edit-360.png`, element: panel()! });
    expect((await axe.run(panel()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    for (const w of [320, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("After shift saved.")).toBeVisible();
    expect((await getStretchRoutines()).routines[0]!.steps[0]!.holdSeconds).toBe(45);
    await screen.getByRole("button", { name: "Reset After shift", exact: true }).click();
    await expect.element(screen.getByText("After shift is back as it started.")).toBeVisible();
    expect((await getStretchRoutines()).routines[0]!.steps[0]!.holdSeconds).toBe(30);
    await screen.getByRole("button", { name: "Start Before sleep", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Seated hamstring fold" })).toBeVisible();
  });

  it("switched off in MORE · Train, no suggestion; the routines are still there", async () => {
    const settings = await render(<StretchSuggestSettings />);
    await settings.getByRole("button", { name: "Suggest a stretch routine", exact: true }).click();
    await cleanup();
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("STRETCH ROUTINES", { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toContain("fits now");
  });
});
