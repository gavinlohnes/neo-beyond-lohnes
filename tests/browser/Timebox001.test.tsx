import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { CapturePromotionForm, emptyCapturePromotionDraft, type CapturePromotionDraft } from "../../src/ui/components/CapturePromotionForm";
import { createObligation } from "../../src/application/intentCommands";
import { getObligation, getObligations } from "../../src/application/intentQueries";
import "../../src/ui/screens/more/operator.css";
import { useState } from "react";

/**
 * TIMEBOX-001 (Gavin, 2026-11-18 "Go"; restarted 2026-11-23): his optional time estimate, set in Intent, Plan Today,
 * the Week planner and when turning a capture into a task. Days show the sum of his estimates and "N of M tasks have
 * a time", never free time or a full day.
 */
const ESTIMATE = "Time estimate (optional)";
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 14, 12)); await page.viewport(375, 900); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
const settle = () => { for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish(); };
async function plan() {
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
  await expect.element(screen.getByRole("heading", { name: "Your plan" })).toBeVisible();
  return screen;
}
async function week() {
  const screen = await plan();
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Make room for your week" })).toBeVisible();
  await expect.poll(() => screen.container.querySelectorAll(".week-planner__day").length).toBe(7);
  return screen;
}
function fits(width: number) {
  settle();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const input of document.querySelectorAll<HTMLInputElement>(".estimate-fields input")) {
    expect(getComputedStyle(input).fontSize).toBe("16px");
    expect(input.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
  for (const text of document.querySelectorAll<HTMLElement>(".estimate-fields .meta, [data-estimate-total]")) expect(parseFloat(getComputedStyle(text).fontSize)).toBeGreaterThanOrEqual(16);
}

describe("TIMEBOX-001 — Plan Today", () => {
  it("adds a task with an estimate and totals today's estimates with 'N of M tasks have a time'", async () => {
    await createObligation({ title: "Email landlord", plannedAt: "2026-11-14", estimateMinutes: 15 });
    await createObligation({ title: "Clean garage", plannedAt: "2026-11-14" });
    const screen = await plan();
    const total = screen.getByText(/^Your estimates:/);
    await expect.element(total).toHaveTextContent("Your estimates: 15 min · 1 of 2 tasks have a time.");
    await expect.element(screen.getByRole("button", { name: /^Email landlord/ })).toHaveTextContent("Est. 15 min");

    await screen.getByLabelText("Add a task for today").fill("Write the report");
    await screen.getByText("Date, Mission, repeat & estimate", { exact: true }).click();
    const fields = screen.getByRole("group", { name: ESTIMATE });
    await fields.getByLabelText("Hours", { exact: true }).fill("9");
    await expect.element(fields.getByRole("alert")).toHaveTextContent("An estimate is 1 minute to 8 hours.");
    await expect.element(screen.getByRole("button", { name: "ADD TO TODAY", exact: true })).toBeDisabled();
    await fields.getByLabelText("Hours", { exact: true }).fill("1");
    await fields.getByLabelText("Minutes", { exact: true }).fill("30");
    await screen.getByRole("button", { name: "ADD TO TODAY", exact: true }).click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "Write the report")?.estimateMinutes).toBe(90);
    await expect.element(total).toHaveTextContent("Your estimates: 1 h 45 min · 2 of 3 tasks have a time.");
    await expect.element(fields.getByLabelText("Hours", { exact: true })).toHaveValue("");
    expect(document.body.textContent).not.toMatch(/\b(free|full)\b/i);
  });

  it.each([320, 360, 412])("fits %spx with 16px text, 44px fields and no axe violations", async (width) => {
    await createObligation({ title: "Arrange next month’s appointments and review the equipment maintenance paperwork", plannedAt: "2026-11-14", estimateMinutes: 135 });
    await page.viewport(width, 900);
    const screen = await plan();
    await expect.element(screen.getByText(/^Your estimates:/)).toBeVisible();
    await screen.getByText("Date, Mission, repeat & estimate", { exact: true }).click();
    await screen.getByRole("group", { name: ESTIMATE }).getByLabelText("Minutes", { exact: true }).fill("abc");
    fits(width);
    expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });
});

describe("TIMEBOX-001 — Week planner", () => {
  it("sets the estimate in the PLAN DAY sheet by keyboard, keeps the deadline, and totals the day", async () => {
    const task = await createObligation({ title: "Paint fence", plannedAt: "2026-11-14", dueAt: "2026-11-20" });
    await createObligation({ title: "Call plumber", plannedAt: "2026-11-14", estimateMinutes: 10 });
    const screen = await week();
    await expect.element(screen.getByText(/^Your estimates:/)).toHaveTextContent("Your estimates: 10 min · 1 of 2 tasks have a time.");
    screen.getByRole("button", { name: "Plan Paint fence", exact: true }).element().focus();
    await userEvent.keyboard("{Enter}");
    const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
    const fields = sheet.getByRole("group", { name: ESTIMATE });
    await fields.getByLabelText("Hours", { exact: true }).click();
    await userEvent.keyboard("2");
    await userEvent.tab();
    await userEvent.keyboard("15");
    await expect.element(fields.getByLabelText("Minutes", { exact: true })).toHaveValue("15");
    await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
    await expect.element(screen.getByRole("status").filter({ hasText: "Your estimate: 2 h 15 min." })).toBeVisible();
    expect(await getObligation(task.id)).toMatchObject({ plannedAt: "2026-11-14", dueAt: "2026-11-20", estimateMinutes: 135 });
    await expect.element(screen.getByText(/^Your estimates:/)).toHaveTextContent("Your estimates: 2 h 25 min · 2 of 2 tasks have a time.");
    await expect.element(screen.getByRole("button", { name: /^Paint fence/ })).toHaveTextContent("Est. 2 h 15 min");
    // The existing count line stays: these are items, not hours available.
    await expect.element(screen.getByText("These are item counts, not hours available.", { exact: false })).toBeVisible();

    // Clearing both boxes removes it; an invalid value can't be saved.
    await screen.getByRole("button", { name: "Plan Paint fence", exact: true }).click();
    await fields.getByLabelText("Minutes", { exact: true }).fill("2.5");
    await expect.element(sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true })).toBeDisabled();
    await fields.getByLabelText("Hours", { exact: true }).fill("");
    await fields.getByLabelText("Minutes", { exact: true }).fill("");
    await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
    await expect.element(screen.getByRole("status").filter({ hasText: "Estimate removed." })).toBeVisible();
    expect((await getObligation(task.id))?.estimateMinutes).toBeUndefined();
  });

  it.each([320, 360, 412])("fits %spx with the sheet open, 44px fields and no axe violations", async (width) => {
    await createObligation({ title: "Arrange next month’s appointments and review the equipment maintenance paperwork", plannedAt: "2026-11-14", estimateMinutes: 480 });
    await page.viewport(width, 900);
    const screen = await week();
    await expect.element(screen.getByText(/^Your estimates:/)).toHaveTextContent("Your estimates: 8 h · 1 of 1 task has a time.");
    fits(width);
    expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    await screen.getByRole("button", { name: /^Plan Arrange/ }).click();
    const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
    await expect.element(sheet.getByRole("group", { name: ESTIMATE }).getByLabelText("Hours", { exact: true })).toHaveValue("8");
    fits(width);
    expect((await axe.run(sheet.element(), { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });
});

describe("TIMEBOX-001 — Intent (Missions & Obligations)", () => {
  it("creates with an estimate, shows it, edits and clears it", async () => {
    await page.viewport(320, 900);
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    await screen.getByPlaceholder("What needs to be resolved?").fill("File taxes");
    const fields = screen.getByRole("group", { name: ESTIMATE });
    await fields.getByLabelText("Minutes", { exact: true }).fill("45");
    fits(320);
    expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    await screen.getByRole("button", { name: "CREATE OBLIGATION", exact: true }).last().click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "File taxes")?.estimateMinutes).toBe(45);
    await expect.element(screen.getByText(/est\. 45 min/)).toBeVisible();

    await screen.getByRole("button", { name: "Open File taxes" }).click();
    await expect.element(screen.getByText("Your estimate: 45 min")).toBeVisible();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    const edit = screen.getByRole("group", { name: ESTIMATE });
    await expect.element(edit.getByLabelText("Minutes", { exact: true })).toHaveValue("45");
    await edit.getByLabelText("Hours", { exact: true }).fill("1");
    fits(320);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Your estimate: 1 h 45 min")).toBeVisible();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await edit.getByLabelText("Hours", { exact: true }).fill("");
    await edit.getByLabelText("Minutes", { exact: true }).fill("");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "File taxes")?.estimateMinutes).toBeUndefined();
    await expect.element(screen.getByText(/^Your estimate:/)).not.toBeInTheDocument();
  });
});

describe("TIMEBOX-001 — capture to task", () => {
  function Harness({ onConfirm }: { onConfirm: (draft: CapturePromotionDraft) => void }) {
    const [draft, setDraft] = useState(emptyCapturePromotionDraft("Call the bank"));
    return <CapturePromotionForm draft={draft} onChange={setDraft} busy={false} onConfirm={() => onConfirm(draft)} />;
  }
  it.each([320, 360, 412])("offers an optional estimate at %spx, blank by default, and refuses an invalid one", async (width) => {
    await page.viewport(width, 900);
    const onConfirm = vi.fn();
    const screen = await render(<Harness onConfirm={onConfirm} />);
    const fields = screen.getByRole("group", { name: ESTIMATE });
    await expect.element(fields.getByLabelText("Hours", { exact: true })).toHaveValue("");
    await expect.element(fields.getByLabelText("Minutes", { exact: true })).toHaveValue("");
    await fields.getByLabelText("Hours", { exact: true }).fill("10");
    await expect.element(screen.getByRole("button", { name: "CREATE TASK", exact: true })).toBeDisabled();
    await fields.getByLabelText("Hours", { exact: true }).fill("");
    await fields.getByLabelText("Minutes", { exact: true }).fill("20");
    fits(width);
    expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    await screen.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ estimate: { hours: "", minutes: "20" } }));
  });
});
