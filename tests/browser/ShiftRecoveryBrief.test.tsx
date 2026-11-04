import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { ShiftRecoveryBrief } from "../../src/ui/screens/today/ShiftRecoveryBrief";
import "../../src/ui/screens/today/console.css";

afterEach(async () => { await cleanup(); vi.clearAllMocks(); await page.viewport(1280, 800); });

it("shows personal evidence as optional depth without phone overflow", async () => {
  const read = vi.fn().mockResolvedValue({
    kind: "FINAL_SHIFT", label: "FINAL SHIFT OF RUN", headline: "Protect the first main sleep.",
    detail: "The first sleep after this run stays open. BEYOND has not moved a commitment or scheduled recovery.",
    evidence: "Your recorded final-shift main sleep usually ran 07:30–13:30 (3 runs).",
  });
  await page.viewport(320, 800);
  const screen = await render(<div className="today-field"><ShiftRecoveryBrief active now={new Date(2026, 10, 2, 6, 30)} read={read} /></div>);
  await expect.element(screen.getByText("Protect the first main sleep.", { exact: true })).toBeVisible();
  await screen.getByText("Protect the first main sleep.", { exact: true }).click();
  await expect.element(screen.getByText(/Your recorded final-shift main sleep/)).toBeVisible();
  await expect.element(screen.getByText(/No medical advice/)).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("fails closed and retries without presenting absence as evidence", async () => {
  const read = vi.fn().mockRejectedValueOnce(new Error("Storage unavailable")).mockResolvedValue(null);
  const screen = await render(<div className="today-field"><ShiftRecoveryBrief active now={new Date(2026, 10, 2, 6, 30)} read={read} /></div>);
  await expect.element(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByRole("alert").element().textContent).toMatch(/unavailable/i);
  await screen.getByRole("button", { name: "RETRY RECOVERY CONTEXT" }).click();
  await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
});

it("clears stale guidance while the lived-day replacement read is pending", async () => {
  let resolveNext!: (value: Awaited<ReturnType<typeof import("../../src/application/shiftRecoveryQueries").getShiftRecoveryBrief>>) => void;
  const read = vi.fn()
    .mockResolvedValueOnce({
      kind: "FINAL_SHIFT", label: "FINAL SHIFT OF RUN", headline: "Protect the first main sleep.",
      detail: "Old lived-day context.", evidence: null,
    })
    .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));
  const screen = await render(<ShiftRecoveryBrief active now={new Date(2026, 10, 2, 16, 29)} read={read} />);
  await expect.element(screen.getByText("Protect the first main sleep.")).toBeVisible();
  await screen.rerender(<ShiftRecoveryBrief active now={new Date(2026, 10, 2, 16, 30)} read={read} />);
  await expect.element(screen.getByText("Protect the first main sleep.")).not.toBeInTheDocument();
  expect(read).toHaveBeenCalledTimes(2);
  resolveNext(null);
});
