/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { TrainPlanDraft } from "../../src/ui/screens/train/TrainPlanDraft";

afterEach(async () => { await cleanup(); });

describe("GRAYSON-TRAIN-PLAN-DRAFT-001", () => {
  it("starts from the approved useful default and ends explicitly unsaved", async () => {
    const close = vi.fn();
    const screen = await render(<TrainPlanDraft onClose={close} />);
    await expect.element(screen.getByRole("dialog", { name: "Your three-day plan" })).toBeVisible();
    for (const name of ["CHEST", "TRICEPS", "TRAPS"]) await expect.element(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    for (const title of ["Bench strength", "Pull and posterior chain", "Bench volume and balance"]) await expect.element(screen.getByRole("heading", { name: title })).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await screen.getByRole("button", { name: "HOME" }).click();
    await expect.element(screen.getByText(/does not pretend prone movement replaces loaded pulling/i)).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText(/Nothing has been activated/i)).toBeVisible();
    await screen.getByRole("button", { name: "RETURN TO TRAIN" }).click();
    expect(close).toHaveBeenCalledOnce();
  });

  it("lets the operator change emphasis and time without exceeding three focus areas", async () => {
    const screen = await render(<TrainPlanDraft onClose={() => {}} />);
    await screen.getByRole("button", { name: "TRAPS" }).click();
    await screen.getByRole("button", { name: "LEGS" }).click();
    await screen.getByRole("button", { name: "65 MIN" }).click();
    await expect.element(screen.getByText("3/3 selected.", { exact: false })).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText(/65 MINUTES/)).toBeVisible();
  });
});
