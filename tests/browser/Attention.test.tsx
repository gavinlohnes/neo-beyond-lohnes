import { useEffect } from "react";
import { TodayReviewSupport } from "../../src/ui/components/TodayReviewSupport";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, setWorkContext, updateSchedulePattern } from "../../src/application/commands";
import { lastFinishedWeek } from "../../src/application/alfred/alfredReview";
import { db } from "../../src/persistence/db";
import { LifeScreen } from "../../src/ui/screens/more/LifeScreen";
import { getMemoryFacts } from "../../src/application/memory";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); localStorage.clear(); await page.viewport(360, 800);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const cases = [
  ["before shift", new Date(2026, 10, 2, 17), new Date(2026, 10, 2, 16, 30), "WORK", "PREP"],
  ["during shift", new Date(2026, 10, 2, 23), new Date(2026, 10, 2, 16, 30), "WORK", "ON SHIFT"],
  ["after shift", new Date(2026, 10, 3, 7), new Date(2026, 10, 2, 16, 30), "WORK", "RECOVER"],
  ["day off", new Date(2026, 10, 3, 17), new Date(2026, 10, 3, 16, 30), "OFF", "OFF DUTY"],
] as const;
it.each(cases)("keeps optional prose below action/logging %s; actual phase owns review invitations", async (_name, now, started, work, mode) => {
  vi.setSystemTime(now);
  await updateSchedulePattern({ anchorMonday: "2026-11-02", weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 });
  const day = await startDay(started.toISOString()); await setWorkContext(day.id, work, "MANUAL");
  const week = lastFinishedWeek(now);
  await db.alfredReviews.add({ id: "saved-review", weekStart: week.start, weekEnd: week.end, text: "Saved weekly reflection", writtenAt: now.toISOString() });
  localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic");
  let calls = 0;
  vi.spyOn(window, "fetch").mockImplementation(async () => { calls++; return new Response(JSON.stringify({ id: "synthetic", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text: "Optional supporting brief" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }), { headers: { "content-type": "application/json" } }); });
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: new RegExp(`^Mode ${mode}, per schedule`) })).toBeVisible();
  await expect.element(screen.getByText("Brief & conversation", { exact: true })).toBeVisible();
  const workspace = document.getElementById("workspace-TODAY")!;
  const support = workspace.querySelector<HTMLDetailsElement>(".alfred-support")!;
  expect(support.open).toBe(false);
  await expect.element(screen.getByText("Optional supporting brief", { exact: true })).not.toBeVisible();
  expect(workspace.querySelector('[aria-label="Next action"]')!.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(workspace.querySelector('[aria-label="Log"]')!.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  if (work === "OFF") {
    await expect.element(screen.getByLabelText("Review when you want", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Saved weekly reflection", { exact: true })).not.toBeVisible();
    await screen.getByLabelText("Review when you want", { exact: true }).click();
    await expect.element(screen.getByText("Saved weekly reflection", { exact: true })).toBeVisible();
  } else await expect.element(screen.getByLabelText("Review when you want", { exact: true })).not.toBeVisible();
  await expect.poll(() => workspace.querySelector(".alfred-brief__text")?.textContent).toBe("Optional supporting brief");
  if (mode === "RECOVER") {
    const count = await db.events.count();
    await screen.getByRole("button", { name: /^Mode RECOVER/ }).click();
    await screen.getByRole("dialog", { name: "MODE" }).getByRole("button", { name: /^OFF DUTY/ }).click();
    await expect.element(screen.getByRole("button", { name: /^Mode OFF DUTY, pinned/ })).toBeVisible();
    await expect.element(screen.getByLabelText("Review when you want", { exact: true })).not.toBeVisible();
    expect(await db.events.count()).toBe(count);
  }
  const before = calls;
  await screen.getByText("Brief & conversation", { exact: true }).click();
  await expect.element(screen.getByText("Optional supporting brief", { exact: true })).toBeVisible();
  expect(calls).toBe(before);
  expect(await db.events.where("type").equals("MEMORY_RECORDED").count()).toBe(0);
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    for (const animation of document.getAnimations()) animation.finish();
    expect((await axe.run(workspace)).violations).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  }
});

it("uses one general-fact editor, retaining its draft across LIFE tabs", async () => {
  vi.setSystemTime(new Date(2026, 10, 2, 17));
  const screen = await render(<LifeScreen active initialTab="Memory" />);
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Quiet weekends with family");
  await screen.getByRole("tab", { name: "Home", exact: true }).click();
  await screen.getByRole("tab", { name: "Memory", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What should BEYOND remember?" })).toHaveValue("Quiet weekends with family");
  expect(screen.getByRole("button", { name: "REMEMBER", exact: true }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.poll(() => getMemoryFacts().then((f) => f.length)).toBe(1);
  const saved = (await getMemoryFacts())[0]!;
  expect(saved.kind).toBe("PERSONAL_FACT");
  await expect.poll(() => (document.activeElement as HTMLElement)?.dataset.memoryId).toBe(saved.factId);
  expect(await db.beyondDays.count()).toBe(0);
  for (const width of [320, 360, 412]) { await page.viewport(width, 800); expect((await axe.run(screen.container)).violations).toEqual([]); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth); }
});

function SavedReview({ onAvailable }: { onAvailable: (value: boolean) => void }) {
  useEffect(() => { onAvailable(true); }, [onAvailable]);
  return <p>Deliberately opened review</p>;
}
it("keeps an operator-opened review through phase change and returns to an available action on close", async () => {
  const now = new Date(2026, 10, 3, 17);
  const view = (phase: "OFF" | "EXPECTED_POST_WORK") => <div className="redesign-today"><section aria-label="Log"><button>WATER</button></section><TodayReviewSupport phase={phase} active now={now} review={(onAvailable) => <SavedReview onAvailable={onAvailable} />} /></div>;
  const screen = await render(view("OFF"));
  await screen.getByLabelText("Review when you want").click();
  await expect.element(screen.getByText("Deliberately opened review")).toBeVisible();
  await screen.rerender(view("EXPECTED_POST_WORK"));
  await expect.element(screen.getByText("Deliberately opened review")).toBeVisible();
  await screen.getByRole("button", { name: "CLOSE REVIEW" }).click();
  await expect.element(screen.getByLabelText("Review when you want")).not.toBeVisible();
  await expect.element(screen.getByRole("button", { name: "WATER" })).toHaveFocus();
  expect(await db.events.count()).toBe(0);
});
