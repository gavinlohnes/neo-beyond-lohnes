/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { logEvent, startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveDay } from "../../src/application/queries";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getActiveWorkoutSession, getPerformedSets } from "../../src/application/trainQueries";
import { db } from "../../src/persistence/db";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { holdToConfirm } from "./helpers/hold";

// Real canonical commands/queries by default; fail one specific operation
// to prove that retry never replays a write which already committed.
vi.mock("../../src/application/commands", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/commands")>();
  return { ...actual, logEvent: vi.fn(actual.logEvent) };
});
vi.mock("../../src/application/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/queries")>();
  return { ...actual, getActiveDay: vi.fn(actual.getActiveDay) };
});
vi.mock("../../src/application/trainCommands", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/trainCommands")>();
  return { ...actual, logSet: vi.fn(actual.logSet), startWorkout: vi.fn(actual.startWorkout), completeWorkout: vi.fn(actual.completeWorkout) };
});
vi.mock("../../src/application/trainQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/trainQueries")>();
  return { ...actual, getPerformedSets: vi.fn(actual.getPerformedSets) };
});

beforeEach(() => {
  vi.mocked(getActiveDay).mockReset();
  vi.mocked(logEvent).mockReset();
  vi.mocked(logSet).mockReset();
  vi.mocked(startWorkout).mockReset();
  vi.mocked(completeWorkout).mockReset();
  vi.mocked(getPerformedSets).mockReset();
});
afterEach(async () => {
  await cleanup();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  await page.viewport(1280, 800);
});

async function ready(active = false) {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const session = active ? await startWorkout(day.id, "A", "STANDARD") : undefined;
  return { day, session };
}

describe("TRAIN-OPERATOR-001", () => {
  it("shows loading rather than an unverified default workout until the initial read resolves", async () => {
    const { day } = await ready();
    let release!: (value: Awaited<ReturnType<typeof getActiveDay>>) => void;
    vi.mocked(getActiveDay).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Reading your workout…");
    expect(screen.getByRole("button", { name: "START WORKOUT" }).elements()).toHaveLength(0);
    release(day);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
  });
  it("keeps START ahead of deliberate prescription/WHY inspection, with keyboard disclosure and no writes", async () => {
    await ready();
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    const before = await db.events.count();
    const summary = screen.getByText("Workout prescription", { exact: true });
    expect(summary.element().closest("details")?.open).toBe(false);
    expect(screen.getByRole("button", { name: "START WORKOUT" }).element().getBoundingClientRect().top)
      .toBeLessThan(summary.element().getBoundingClientRect().top);
    summary.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await screen.getByText("Why this suggestion", { exact: true }).click();
    expect(await db.events.count()).toBe(before);
    expect(await getActiveWorkoutSession()).toBeUndefined();
  });

  it("puts current set operation before intelligence at 320/360/412 px without overflow", async () => {
    await ready(true);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    const log = screen.getByRole("button", { name: "LOG", exact: true }).element();
    const inspect = screen.getByText("Progression and substitution", { exact: true }).element();
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(log.getBoundingClientRect().top).toBeLessThan(inspect.getBoundingClientRect().top);
      expect(log.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    await expect.element(screen.getByText("Last time: no recorded set", { exact: true })).toBeVisible();
    // Measure settled colors, not composited opacity during finite mount motion.
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    const results = await axe.run(document.querySelector(".train-operator")!);
    expect(results.violations).toEqual([]);
  });

  it("honors reduced motion and readable control/metadata text in TRAIN and Gym Mode", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await page.viewport(320, 800);
    await ready(true);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    expect(document.getAnimations()).toHaveLength(0);
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Gym mode" })).toBeVisible();
    for (const element of document.querySelectorAll<HTMLElement>(".train-operator *")) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      if (ownText && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden") {
        expect(parseFloat(getComputedStyle(element).fontSize), element.textContent ?? "").toBeGreaterThanOrEqual(16);
      }
    }
    expect(document.getAnimations()).toHaveLength(0);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.activeElement?.textContent).toBe("GYM MODE");
  });

  it("reports logged and skipped sets separately from the prescription", async () => {
    const { day, session } = await ready(true);
    await logSet(day.id, session!.id, "machine-chest-press", 1, 100, 10);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "SKIP", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SKIP", exact: true }).click();
    await expect.element(screen.getByText("#2 — SKIPPED", { exact: true })).toBeVisible();
    const state = document.querySelector('[aria-label="Session progress"]')!;
    expect(state.textContent).toContain("SETS LOGGED1");
    expect(state.textContent).toContain("1 skipped");
    expect((await getPerformedSets(session!.id)).filter((set) => !set.skipped)).toHaveLength(1);
  });

  it("offers explicit continuation after inspecting a finished lift without recording anything", async () => {
    const { day, session } = await ready(true);
    for (let n = 1; n <= 3; n++) await logSet(day.id, session!.id, "machine-chest-press", n, 100, 10);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: /Machine Chest Press — 3 of 3 sets/ }).click();
    await expect.element(screen.getByRole("button", { name: "CONTINUE — Pec Deck", exact: true })).toBeVisible();
    const before = await db.events.count();
    await screen.getByRole("button", { name: "CONTINUE — Pec Deck", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Pec Deck", exact: true })).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("Pec Deck");
    expect(await db.events.count()).toBe(before);
  });

  it("keeps a chosen substitution visible beside the prescription and records its existing free-text value", async () => {
    const { session } = await ready(true);
    const screen = await render(<TrainScreen />);
    await screen.getByText("Progression and substitution", { exact: true }).click();
    await screen.getByRole("textbox", { name: "Substitute exercise (optional)" }).fill("Alternate press");
    await screen.getByText("Progression and substitution", { exact: true }).click();
    await expect.element(screen.getByText("Recording as: Alternate press", { exact: true })).toBeVisible();
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("100");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("10");
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Recorded as: Alternate press", { exact: true })).toBeVisible();
    expect(await getPerformedSets(session!.id)).toEqual([expect.objectContaining({ substitutedName: "Alternate press" })]);
  });

  it("does not call an unrecorded substitution recorded when the set was skipped", async () => {
    await ready(true);
    const screen = await render(<TrainScreen />);
    await screen.getByText("Progression and substitution", { exact: true }).click();
    await screen.getByRole("textbox", { name: "Substitute exercise (optional)" }).fill("Alternate press");
    await screen.getByRole("button", { name: "SKIP", exact: true }).click();
    await expect.element(screen.getByText("#1 — SKIPPED", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Recording as: Alternate press", { exact: true })).toBeVisible();
    expect(screen.getByText("Recorded as: Alternate press", { exact: true }).elements()).toHaveLength(0);
  });

  it("read failure offers a read-only retry rather than a default/restart workout", async () => {
    const { session } = await ready(true);
    vi.mocked(getActiveDay).mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    const before = await db.events.count();
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "START WORKOUT" }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    expect((await getActiveWorkoutSession())?.id).toBe(session!.id);
    expect(await db.events.count()).toBe(before);
  });

  it("failed LOG keeps entered values, then retries one canonical write", async () => {
    const { session } = await ready(true);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("105");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("9");
    vi.mocked(logSet).mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText(/Could not confirm set recording/)).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(0);
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toHaveValue(105);
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 repetitions" })).toHaveValue(9);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("#1 — 105 lb x 9", { exact: true })).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
  });

  it("reconciles a real partial command failure without duplicating the performed row or claiming it was absent", async () => {
    const { session } = await ready(true);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("100");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("10");
    // Existing command has separate row/event writes. Fail the event after
    // the real row add: UI must reconcile, not blindly replay that command.
    vi.mocked(logEvent).mockRejectedValueOnce(new Error("Event write unavailable"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText(/Could not confirm set recording/)).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByText("#1 — 100 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 2 repetitions" })).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
    expect(vi.mocked(logSet)).toHaveBeenCalledTimes(1);
    expect((await db.events.toArray()).filter((event) => event.type === "SET_LOGGED")).toHaveLength(0);
    expect(document.querySelectorAll(".set-earned")).toHaveLength(0);
  });

  it("post-commit read failure truthfully reports success and retries reads without duplicating the set", async () => {
    const { session } = await ready(true);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("100");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("10");
    vi.mocked(getPerformedSets).mockRejectedValueOnce(new Error("Updated read unavailable"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText(/Your set was recorded/)).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByText("#1 — 100 lb x 10", { exact: true })).toBeVisible();
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
    expect(vi.mocked(logSet)).toHaveBeenCalledTimes(1);
  });

  it("remount resumes the same workout and advances to the unrecorded set without an earned replay", async () => {
    const { day, session } = await ready(true);
    await logSet(day.id, session!.id, "machine-chest-press", 1, 100, 10);
    await render(<TrainScreen />);
    await expect.poll(() => document.querySelector(".train-session-state")).not.toBeNull();
    await cleanup();
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("spinbutton", { name: "Set 2 repetitions" })).toBeVisible();
    expect(document.querySelectorAll(".set-earned")).toHaveLength(0);
    expect((await getActiveWorkoutSession())?.id).toBe(session!.id);
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
  });

  it("failed START reconciles without writing or losing the operator's chosen template/variant", async () => {
    await ready();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "CHANGE", exact: true }).click();
    await screen.getByRole("button", { name: "B", exact: true }).click();
    await screen.getByRole("button", { name: "REDUCED", exact: true }).click();
    vi.mocked(startWorkout).mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByText("Template B · REDUCED", { exact: true })).toBeVisible();
    expect(await getActiveWorkoutSession()).toBeUndefined();
    await expect.poll(() => document.activeElement?.tagName).toBe("H1");
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    expect(await getActiveWorkoutSession()).toMatchObject({ templateId: "B", sessionType: "REDUCED" });
  });

  it("failed finish retains the session and recorded set; read retry does not complete it", async () => {
    const { day, session } = await ready(true);
    await logSet(day.id, session!.id, "machine-chest-press", 1, 100, 10);
    const screen = await render(<TrainScreen />);
    vi.mocked(completeWorkout).mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    await holdToConfirm(screen.getByRole("button", { name: "COMPLETE", exact: true }));
    await expect.element(screen.getByRole("alert")).toBeVisible();
    await screen.getByRole("button", { name: "RETRY WORKOUT READ" }).click();
    await expect.element(screen.getByText("#1 — 100 lb x 10", { exact: true })).toBeVisible();
    expect((await getActiveWorkoutSession())?.id).toBe(session!.id);
    expect(await getPerformedSets(session!.id)).toHaveLength(1);
    expect(vi.mocked(completeWorkout)).toHaveBeenCalledTimes(1);
    await holdToConfirm(screen.getByRole("button", { name: "COMPLETE", exact: true }));
    await expect.element(screen.getByRole("heading", { name: "WORKOUT COMPLETE", exact: true })).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("WORKOUT COMPLETE");
    await screen.getByRole("button", { name: "DONE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    await expect.poll(() => document.activeElement?.tagName).toBe("H1");
  });
});
