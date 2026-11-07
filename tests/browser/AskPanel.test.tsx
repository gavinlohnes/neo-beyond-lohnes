import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { AskPanel } from "../../src/ui/screens/review/AskPanel";
import type { PictureRow } from "../../src/application/wholePictureProjection";
import "../../src/ui/screens/review/wholePicture.css";

/** LOOP step 1 — ASK: questions answered from recorded days, each line opening the days behind it. */
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });

const start = (day: number) => new Date(2026, 8, day, 16, 30).toISOString();
const row = (day: number, context: PictureRow["context"], values: Partial<PictureRow> = {}) =>
  ({ start: start(day), dayIds: [`d${day}`], context, sessions: 0, ambiguousSleep: false, weights: [], ...values } as unknown as PictureRow);
const rows = [1, 2, 3, 4, 5, 6].map((day) => row(day, day <= 3 ? "WORK" : "OFF", { sleepHours: day <= 3 ? 6 : 8, energy: day <= 3 ? 3 : 4, sessions: day === 5 ? 1 : 0 }));

for (const width of [320, 390]) it(`answers a question from recorded days and opens them at ${width}px`, async () => {
  await page.viewport(width, 900);
  const onInspect = vi.fn();
  const screen = await render(<div className="whole-picture"><AskPanel rows={rows} onInspect={onInspect} /></div>);
  await screen.getByRole("button", { name: "What's normal for me, work days vs days off?" }).click();
  await expect.element(screen.getByText("Main sleep: 6:00 on work days, 8:00 on days off.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Trained on 0 of 3 work days and 1 of 3 days off.", { exact: true })).toBeVisible();
  await screen.getByText("6 days behind this", { exact: true }).first().click();
  await screen.getByRole("button", { name: /Sep 4\. Open records\.$/ }).first().click();
  expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ start: start(4) }));
  // Not enough yet: says what is missing instead of guessing.
  await screen.getByRole("button", { name: "When do I usually train?" }).click();
  await expect.element(screen.getByText("Not enough recorded yet: this needs 3 recorded workouts (1 so far).", { exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("CONNECTED-001 Patterns: puts short-sleep and training days side by side, or says what is missing", async () => {
  const days = [1, 2, 3, 4, 5, 6].map((day) => row(day, "OFF", { sleepHours: day <= 3 ? 5 : 7.5, energy: day <= 3 ? 2 : 4, stress: day <= 3 ? 4 : 2, sessions: day % 2 }));
  const screen = await render(<div className="whole-picture"><AskPanel rows={days} onInspect={vi.fn()} /></div>);
  await screen.getByRole("button", { name: "How do my check-ins look after short sleep?" }).click();
  await expect.element(screen.getByText("Check-in energy: 2.0 on days under 6 h main sleep, 4.0 on days with 6 h or more.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("3 of 6 days with a main sleep were under 6 h. Side by side, not a cause.", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "How do days I train compare?" }).click();
  await expect.element(screen.getByText(/^Check-in energy: .* on days you trained, .* on days you didn't\.$/)).toBeVisible();
  await cleanup();
  const thin = await render(<div className="whole-picture"><AskPanel rows={days.slice(0, 2)} onInspect={vi.fn()} /></div>);
  await thin.getByRole("button", { name: "How do my check-ins look after short sleep?" }).click();
  await expect.element(thin.getByText(/^Not enough recorded yet: this needs 3 days under 6 h main sleep/)).toBeVisible();
});

it("PIXELS-001: one square per day, empty when not recorded, each opening its day", async () => {
  const { DayPixels } = await import("../../src/ui/screens/review/DayPixels");
  const days = [1, 2, 3, 4, 5, 6, 7].map((day) => row(day, "OFF", day === 3 ? {} : { energy: day % 5 + 1, sleepHours: 7 }));
  const onInspect = vi.fn();
  const screen = await render(<div className="whole-picture"><DayPixels rows={days} onInspect={onInspect} /></div>);
  expect(screen.container.querySelectorAll(".day-pixels__day")).toHaveLength(7);
  expect(screen.container.querySelectorAll('.day-pixels__day[data-level="none"]')).toHaveLength(1);
  await expect.element(screen.getByText("6 of 7 days have check-in energy recorded. Empty squares are days without it, not zero.", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: /^Thu, Sep 3: not recorded\. Open records\.$/ }).click();
  expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ start: start(3) }));
  await screen.getByRole("button", { name: "Main sleep" }).click();
  await expect.element(screen.getByText("6 of 7 days have main sleep recorded. Empty squares are days without it, not zero.", { exact: true })).toBeVisible();
  expect((await axe.run(screen.container)).violations).toEqual([]);
});
