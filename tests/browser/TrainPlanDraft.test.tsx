/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import type { CustomWorkoutTemplate } from "../../src/domain/workout/customTemplate";
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
    await screen.getByRole("button", { name: "CLOSE" }).click();
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

  it("requires exact review and explicit confirmation before showing a save receipt", async () => {
    const save: typeof createCustomTemplateSet = vi.fn(async (inputs: Parameters<typeof createCustomTemplateSet>[0]) => inputs.map((input, index): CustomWorkoutTemplate => ({
      ...input,
      id: `saved-${index}`,
      createdAt: "2026-11-21T05:00:00.000Z",
    })));
    const screen = await render(<TrainPlanDraft onClose={() => {}} saveTemplates={save} />);
    for (let index = 0; index < 3; index += 1) await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText(/Nothing has been activated/i)).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "REVIEW AND SAVE" }).click();
    for (const name of ["Grayson A - Bench strength", "Grayson B - Pull and posterior chain", "Grayson C - Bench volume and balance"]) {
      await expect.element(screen.getByRole("heading", { name })).toBeVisible();
    }
    await expect.element(screen.getByText(/all three are created or none are/i)).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "CONFIRM SAVE 3 TEMPLATES" }).click();
    expect(save).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole("heading", { name: "Three templates are ready" })).toBeVisible();
    await expect.element(screen.getByText(/No programme was activated or assigned/i)).toBeVisible();
  });

  it("keeps the review available and reports an atomic save failure", async () => {
    const screen = await render(<TrainPlanDraft onClose={() => {}} saveTemplates={async () => { throw new Error("storage stopped"); }} />);
    for (let index = 0; index < 3; index += 1) await screen.getByRole("button", { name: "CONTINUE" }).click();
    await screen.getByRole("button", { name: "REVIEW AND SAVE" }).click();
    await screen.getByRole("button", { name: "CONFIRM SAVE 3 TEMPLATES" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Storage stopped.");
    await expect.element(screen.getByRole("button", { name: "CONFIRM SAVE 3 TEMPLATES" })).toBeEnabled();
  });
});
