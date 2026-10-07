import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/** ADVISORY-002: real to-dos live in COMMITMENT; the vague lines are gone. */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0));
});

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ADVISORY-002 on TODAY", () => {
  it("titles OBLIGATION_DUE with the real commitment and lists the other due one in COMMITMENT", async () => {
    await createObligation({ title: "Renew passport", dueAt: dateOffset(-2) });
    await createObligation({ title: "Blood work", dueAt: dateOffset(-1) });
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, GREEN);
    expect(recommendation.kind).toBe("OBLIGATION_DUE");
    // The Engine's own title is unchanged; TODAY just doesn't show it.
    expect(recommendation.title).toBe("An obligation needs attention");

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "Renew passport · Overdue" })).toBeVisible();
    expect(screen.getByText("An obligation needs attention").elements()).toHaveLength(0);
    expect(screen.getByText(/Background context/).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await expect.element(screen.getByText(/^Also: Blood work · Overdue/)).toBeVisible();
    // No obligation note under ADVISORY: with nothing else to say, there is no ADVISORY at all.
    expect(screen.getByText("ADVISORY", { exact: true }).elements()).toHaveLength(0);
  });
});
