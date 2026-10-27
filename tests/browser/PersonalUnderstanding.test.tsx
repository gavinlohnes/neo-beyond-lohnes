import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { PersonalUnderstanding } from "../../src/ui/screens/review/PersonalUnderstanding";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { createMission, modifyMission } from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { startDay, endDay, logSleep, setWorkContext } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { getPersonalUnderstanding } from "../../src/application/personalUnderstandingQueries";

vi.mock("../../src/application/personalUnderstandingQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/personalUnderstandingQueries")>();
  return { ...actual, getPersonalUnderstanding: vi.fn(actual.getPersonalUnderstanding) };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.mocked(getPersonalUnderstanding).mockClear(); });

async function seed() {
  const mission = await createMission({ title: "Practical work meals" });
  const entry = await createDecisionJournalEntry({ title: "Frozen work meals", decision: "Pack a frozen backup", expectation: "Less effort" });
  await reviewDecisionJournalEntry(entry.id, { outcome: "I used it", lesson: "Frozen work meals are a practical backup" });
  return { mission, entry };
}

it.each([320, 390, 844, 1280])("connects choices and written lessons without writing or overflowing at %ipx", async (width) => {
  await page.viewport(width, width === 844 ? 390 : 844);
  const { entry } = await seed(); const onOpenSource = vi.fn();
  const before = await db.events.toArray();
  const screen = await render(<PersonalUnderstanding active onOpenSource={onOpenSource} />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Practical work meals" })).toBeVisible();
  await screen.getByText("Related written lessons (1)", { exact: true }).click();
  await expect.element(screen.getByText(/Matched by words/)).toBeVisible();
  await screen.getByRole("button", { name: "OPEN MATCHED DECISION", exact: true }).click();
  expect(onOpenSource).toHaveBeenCalledWith({ kind: "JOURNAL", id: entry.id });
  await screen.getByRole("group", { name: "Personal understanding views" }).getByRole("button", { name: "Lessons", exact: true }).click();
  await screen.getByText("Frozen work meals", { exact: true }).click();
  await expect.element(screen.getByText(/Less effort/)).toBeVisible();
  await expect.element(screen.getByText(/I used it/)).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("bounds lists and keeps real absence distinct from a reading failure", async () => {
  for (let index = 0; index < 7; index++) await createMission({ title: `Direction ${index}` });
  const screen = await render(<PersonalUnderstanding active />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "SHOW MORE MISSIONS" })).toBeVisible();
  expect(screen.getByRole("heading", { level: 3 }).elements()).toHaveLength(5);
  await screen.getByRole("button", { name: "SHOW MORE MISSIONS" }).click();
  expect(screen.getByRole("heading", { level: 3 }).elements()).toHaveLength(7);
  await screen.getByRole("group", { name: "Personal understanding views" }).getByRole("button", { name: "Lessons", exact: true }).click();
  await expect.element(screen.getByText(/No written lessons yet/)).toBeVisible();
  await screen.rerender(<PersonalUnderstanding active={false} />);
  vi.mocked(getPersonalUnderstanding).mockRejectedValueOnce(new Error("Storage unavailable"));
  await screen.rerender(<PersonalUnderstanding active />);
  await expect.element(screen.getByRole("alert")).toHaveTextContent(/unavailable, not empty/);
  await expect.element(screen.getByText(/No written lessons yet/)).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "RETRY PERSONAL UNDERSTANDING" }).click();
  await expect.element(screen.getByText(/No written lessons yet/)).toBeVisible();
});

it("inspects comparable days through existing History with sample sizes and missing values", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  for (let dayOfMonth = 10; dayOfMonth <= 19; dayOfMonth++) {
    vi.setSystemTime(new Date(2026, 9, dayOfMonth, 20));
    const day = await startDay(); await setWorkContext(day.id, dayOfMonth % 3 === 0 ? "OFF" : "WORK", "MANUAL");
    await logSleep(day.id, 360, "PRIMARY"); await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 27, 20));
  const onOpenHistory = vi.fn(); const screen = await render(<PersonalUnderstanding active onOpenHistory={onOpenHistory} />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await screen.getByRole("button", { name: "Patterns", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "Choose a comparable situation" })).toBeVisible();
  await screen.getByText("Inspect comparable days", { exact: true }).click();
  await expect.element(screen.getByText(/energy not recorded/).first()).toBeVisible();
  await screen.getByRole("button", { name: "OPEN DAY RECORDS", exact: true }).first().click();
  expect(onOpenHistory).toHaveBeenCalledTimes(1);
  await expect.element(screen.getByText(/These are patterns, never causes/)).toBeVisible();
});

it("opens the exact Mission and Journal, returns to Review and refreshes edited knowledge", async () => {
  const { mission, entry } = await seed();
  const screen = await render(<MoreScreen initialView="REVIEW" />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await screen.getByRole("button", { name: "OPEN MISSION", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Practical work meals", exact: true })).toBeVisible();
  await modifyMission(mission.id, { title: "Simple work meals" });
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Simple work meals", exact: true })).toBeVisible();
  await screen.getByRole("group", { name: "Personal understanding views" }).getByRole("button", { name: "Lessons", exact: true }).click();
  await screen.getByText(entry.title, { exact: true }).click();
  await screen.getByRole("button", { name: "OPEN ORIGINAL DECISION", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: entry.title, exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "BACK TO REVIEW", exact: true })).toBeVisible();
});

it("opens canonical Targets and Work Schedule with a return path to the same understanding view", async () => {
  const screen = await render(<MoreScreen initialView="REVIEW" />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await screen.getByRole("button", { name: "REVIEW OR CHANGE TARGETS", exact: true }).click();
  await expect.poll(() => document.activeElement?.id).toBe("command-nutrition-targets");
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "TARGETS YOU SET", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "REVIEW WORK SCHEDULE", exact: true }).click();
  await expect.element(screen.getByText("MORE // WORK SCHEDULE", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "WHAT MATTERS TO YOU", exact: true })).toBeVisible();
});

it("ignores an older in-flight understanding read after leaving and re-entering", async () => {
  const { mission } = await seed();
  const old = await getPersonalUnderstanding();
  let finishOld!: (value: typeof old) => void;
  vi.mocked(getPersonalUnderstanding).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
  const screen = await render(<PersonalUnderstanding active />);
  await screen.getByText("PERSONAL UNDERSTANDING", { exact: true }).click();
  await expect.element(screen.getByRole("status")).toBeVisible();
  await screen.rerender(<PersonalUnderstanding active={false} />);
  await modifyMission(mission.id, { title: "Changed current priority" });
  await screen.rerender(<PersonalUnderstanding active />);
  await expect.element(screen.getByRole("heading", { name: "Changed current priority", exact: true })).toBeVisible();
  finishOld(old);
  await expect.element(screen.getByRole("heading", { name: "Changed current priority", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Practical work meals", exact: true })).not.toBeInTheDocument();
});
