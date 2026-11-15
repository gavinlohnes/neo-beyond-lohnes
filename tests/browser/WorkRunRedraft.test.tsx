import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { getWorkRunDraft } from "../../src/application/workRunPlan";
import { getWorkRunRedraftOffer, type RedraftOffer } from "../../src/application/workRunRedraft";
import { captureItem } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { WorkRunPlanner } from "../../src/ui/screens/more/WorkRunPlanner";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import "../../src/ui/screens/more/operator.css";
vi.mock("../../src/application/workRunPlan", () => ({ getWorkRunDraft: vi.fn() }));
vi.mock("../../src/application/workRunRedraft", async (original) => { const actual = await original<typeof import("../../src/application/workRunRedraft")>(); return { ...actual, getWorkRunRedraftOffer: vi.fn() }; });
vi.mock("../../src/application/commands", async (original) => { const actual = await original<typeof import("../../src/application/commands")>(); return { ...actual, captureItem: vi.fn(actual.captureItem) }; });
beforeEach(() => localStorage.removeItem("beyond.workRunRedraft.dismissed.v1"));
afterEach(async () => { await cleanup(); vi.clearAllMocks(); localStorage.removeItem("beyond.workRunRedraft.dismissed.v1"); });
const draft = { text: "Work-run plan · 2026-11-15 to 2026-11-18\n2026-11-17 — Work (confirmed change) · starts 18:00", message: null, generatedAt: "2026-11-15T12:00:00.000Z" };
const offer = (fingerprint = "note|2026-11-17:WORK:18"): RedraftOffer => ({ noteId: "note", savedAt: "2026-11-15T12:00:00.000Z", fingerprint, reasons: [
  { kind: "WORK_CHANGED", date: "2026-11-17", saved: { date: "2026-11-17", work: "OFF", startHour: null }, now: { work: "WORK", startHour: 18, basis: "CONFIRMED" } },
  { kind: "SHORT_SLEEP", recommendationId: "r1", issuedAt: "2026-11-15T13:00:00.000Z" }] });
const group = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("group", { name: "Something changed since your saved plan note" });

it("shows nothing when nothing changed", async () => {
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(null);
  const screen = await render(<WorkRunPlanner active />);
  await expect.element(screen.getByRole("button", { name: "DRAFT WORK RUN", exact: true })).toBeVisible();
  expect(vi.mocked(getWorkRunRedraftOffer)).toHaveBeenCalled();
  expect(document.querySelector('[aria-label="Something changed since your saved plan note"]')).toBeNull();
  expect(vi.mocked(getWorkRunDraft)).not.toHaveBeenCalled();
});

it("NOT NOW lasts until the change itself changes and writes no record", async () => {
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(offer());
  const before = await Promise.all(db.tables.map((t) => t.count()));
  const screen = await render(<WorkRunPlanner active />);
  await expect.element(group(screen)).toBeVisible();
  await expect.element(group(screen).getByText("2026-11-17: your note says Day off; now Work from 18:00 (confirmed change).")).toBeVisible();
  await expect.element(group(screen).getByText(/Two short main sleeps/)).toBeVisible();
  await screen.getByRole("button", { name: "NOT NOW", exact: true }).click();
  await expect.element(group(screen)).not.toBeInTheDocument();
  await cleanup();
  const again = await render(<WorkRunPlanner active />);
  await expect.element(again.getByRole("button", { name: "DRAFT WORK RUN", exact: true })).toBeVisible();
  await vi.waitFor(() => expect(vi.mocked(getWorkRunRedraftOffer)).toHaveBeenCalledTimes(2));
  expect(document.querySelector('[aria-label="Something changed since your saved plan note"]')).toBeNull();
  await cleanup();
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(offer("note|2026-11-18:WORK:18"));
  const changed = await render(<WorkRunPlanner active />);
  await expect.element(group(changed)).toBeVisible();
  expect(await Promise.all(db.tables.map((t) => t.count()))).toEqual(before);
  expect(vi.mocked(getWorkRunDraft)).not.toHaveBeenCalled();
});

it("warns before replacing unsaved edits; saves a new note only on confirm, exactly once", async () => {
  // The draft was made before the change; the offer arrives when Week planner is opened again.
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(null);
  vi.mocked(getWorkRunDraft).mockResolvedValueOnce({ ...draft, text: "Older draft" }).mockResolvedValue(draft);
  const screen = await render(<WorkRunPlanner active />);
  await screen.getByRole("button", { name: "DRAFT WORK RUN", exact: true }).click();
  const field = screen.getByRole("textbox", { name: "Review and edit your plan note" });
  await field.fill("My unsaved edits");
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(offer());
  await screen.rerender(<WorkRunPlanner active={false} />);
  await screen.rerender(<WorkRunPlanner active />);
  const count = await db.captureItems.count();
  await group(screen).getByRole("button", { name: "DRAFT FRESH RUN PLAN", exact: true }).click();
  await expect.element(screen.getByRole("group", { name: "Replace edited draft" })).toBeVisible();
  await screen.getByRole("button", { name: "KEEP MY DRAFT", exact: true }).click();
  await expect.element(field).toHaveValue("My unsaved edits");
  await expect.element(group(screen)).toBeVisible();
  await group(screen).getByRole("button", { name: "DRAFT FRESH RUN PLAN", exact: true }).click();
  await screen.getByRole("button", { name: "REPLACE EDITED DRAFT", exact: true }).click();
  await expect.element(field).toHaveValue(draft.text);
  await expect.element(group(screen)).not.toBeInTheDocument();
  expect(await db.captureItems.count()).toBe(count);
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(null);
  await screen.getByRole("button", { name: "REVIEW PLAN NOTE", exact: true }).click();
  expect(await db.captureItems.count()).toBe(count);
  const save = screen.getByRole("button", { name: "CONFIRM SAVE PLAN NOTE", exact: true }).element() as HTMLButtonElement;
  save.click(); save.click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Plan note saved" })).toBeVisible();
  expect(vi.mocked(captureItem)).toHaveBeenCalledTimes(1);
  expect(await db.captureItems.count()).toBe(count + 1);
  await vi.waitFor(() => expect(vi.mocked(getWorkRunRedraftOffer)).toHaveBeenCalledTimes(3));
  expect(document.querySelector('[aria-label="Something changed since your saved plan note"]')).toBeNull();
});

it("appears in Plan Today → Week planner; accessible at phone width without overflow", async () => {
  await page.viewport(320, 850);
  vi.mocked(getWorkRunRedraftOffer).mockResolvedValue(offer());
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={vi.fn()} /></div>);
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.element(group(screen)).toBeVisible();
  expect(screen.container.scrollWidth).toBeLessThanOrEqual(320);
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  expect((await axe.run(screen.container)).violations).toEqual([]);
});
