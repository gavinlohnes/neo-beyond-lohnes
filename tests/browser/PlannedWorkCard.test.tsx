import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { PlannedWorkCard } from "../../src/ui/screens/today/PlannedWorkCard";

/**
 * TODAY-QUICKACTIONS-001 (item 3): PlannedWorkCard's own collapse
 * behavior in isolation — a controlled-props component test, same shape
 * as CollapsibleRow.test.tsx, rather than exercising it only indirectly
 * through TodayScreen/TrainScreen. `open`/`setOpen` are caller-owned (see
 * the component's own doc comment), so a test double stands in for
 * whichever screen would otherwise own that state.
 */
describe("PlannedWorkCard (real browser)", () => {
  it("shows the full toggle, not a collapsed row, while unanswered", async () => {
    const screen = await render(
      <PlannedWorkCard declaration={undefined} open={false} setOpen={() => {}} busy={false} onSetPlannedWork={() => {}} />,
    );

    await expect.element(screen.getByText("Planning to train today?", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "TRAIN TODAY" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "NOT TODAY" })).toBeVisible();
    // Never collapsed just because open=false — collapse only applies once answered.
    expect(screen.getByRole("button", { name: "Open PLANNED WORK" }).elements()).toHaveLength(0);
  });

  it("collapses to a one-line CollapsibleRow summary once answered (declaration=true) and open=false", async () => {
    const screen = await render(
      <PlannedWorkCard declaration={true} open={false} setOpen={() => {}} busy={false} onSetPlannedWork={() => {}} />,
    );

    await expect.element(screen.getByRole("button", { name: "Open PLANNED WORK" })).toBeVisible();
    await expect.element(screen.getByText("Training today.", { exact: true })).toBeVisible();
    expect(screen.getByText("Planning to train today?", { exact: true }).elements()).toHaveLength(0);
  });

  it("collapses with the NOT-training summary when declaration=false", async () => {
    const screen = await render(
      <PlannedWorkCard declaration={false} open={false} setOpen={() => {}} busy={false} onSetPlannedWork={() => {}} />,
    );

    await expect.element(screen.getByText("Not training today.", { exact: true })).toBeVisible();
  });

  it("tapping the collapsed row calls setOpen(true) to re-expand", async () => {
    const setOpen = vi.fn();
    const screen = await render(
      <PlannedWorkCard declaration={true} open={false} setOpen={setOpen} busy={false} onSetPlannedWork={() => {}} />,
    );

    await screen.getByRole("button", { name: "Open PLANNED WORK" }).click();
    expect(setOpen).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("stays expanded (full toggle, not collapsed) when answered but open=true, and COLLAPSE calls setOpen(false)", async () => {
    const setOpen = vi.fn();
    const screen = await render(
      <PlannedWorkCard declaration={true} open={true} setOpen={setOpen} busy={false} onSetPlannedWork={() => {}} />,
    );

    await expect.element(screen.getByText("Planning to train today?", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "TRAIN TODAY" })).toBeVisible();
    const trainTodayButton = screen.getByRole("button", { name: "TRAIN TODAY" }).element();
    expect(trainTodayButton.className).toContain("chip--selected");

    await screen.getByRole("button", { name: "COLLAPSE" }).click();
    expect(setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("calls onSetPlannedWork(true)/(false) from the expanded toggle chips", async () => {
    const onSetPlannedWork = vi.fn();
    const screen = await render(
      <PlannedWorkCard declaration={undefined} open={true} setOpen={() => {}} busy={false} onSetPlannedWork={onSetPlannedWork} />,
    );

    await screen.getByRole("button", { name: "TRAIN TODAY" }).click();
    expect(onSetPlannedWork).toHaveBeenCalledExactlyOnceWith(true);

    await screen.getByRole("button", { name: "NOT TODAY" }).click();
    expect(onSetPlannedWork).toHaveBeenCalledTimes(2);
    expect(onSetPlannedWork).toHaveBeenLastCalledWith(false);
  });
});
