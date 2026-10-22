import { commandResult } from "./helpers/command";
import { holdToConfirm } from "./helpers/hold";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { correctBodyweight, correctWater, endDay, setWorkContext, logBodyweight, logProtein, logSleep, logWater, startDay } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { getHydrationEntries } from "../../src/application/queries";
import { getBodyInsights } from "../../src/application/bodyInsightsQueries";
import { getHealthSources, healthDayStart, offsetHealthDay } from "../../src/application/healthRecordQueries";
import { db } from "../../src/persistence/db";

vi.mock("../../src/application/bodyInsightsQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/bodyInsightsQueries")>();
  return { ...actual, getBodyInsights: vi.fn(actual.getBodyInsights) };
});
vi.mock("../../src/application/healthRecordQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/healthRecordQueries")>();
  return { ...actual, getHealthSources: vi.fn(actual.getHealthSources) };
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.mocked(getHealthSources).mockClear(); vi.mocked(getBodyInsights).mockClear(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });
function clock(date = new Date(2026, 9, 16, 20)) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(date); }
const dayName = (start: string) => `Open ${new Date(start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;

for (const width of [320, 360, 412]) it(`selects an overnight health day and its exact source at ${width}px without historical writes`, async () => {
  await page.viewport(width, 800);
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  clock(new Date(2026, 9, 15, 20));
  const prior = await startDay(); const root = await logWater(prior.id, 16); await correctWater(prior.id, root, 12);
  vi.setSystemTime(new Date(2026, 9, 16, 2)); await logProtein(prior.id, 25); await endDay(prior.id);
  clock(); const current = await startDay(); await logWater(current.id, 8);
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByText("Health history", { exact: true }).click(); // UX-COHESION-001: DAYS is the default view
  await screen.getByRole("button", { name: dayName(offsetHealthDay(healthDayStart(), -1)) }).click();
  const past = screen.getByRole("region", { name: "Selected health day" });
  await expect.element(past.getByRole("button", { name: "water history", exact: true })).toHaveTextContent("12 oz");
  await expect.element(past.getByRole("button", { name: "protein history", exact: true })).toHaveTextContent("25 g");
  expect(screen.getByRole("button", { name: "+8 oz", exact: true }).elements()).toHaveLength(0);
  await past.getByText("Recorded entries · 2", { exact: true }).click();
  await past.getByRole("button", { name: "Source of Water · 12 oz", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 12 oz", exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: "CORRECT ENTRY", exact: true }).elements()).toHaveLength(0);
  expect(document.querySelector("[data-source-root]")?.getAttribute("data-source-root")).toBe(root);
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  const head = (await getHydrationEntries(prior.id))[0]!.headEventId;
  await expect.poll(() => document.activeElement?.id).toBe(`history-event-${head}`);
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 12 oz", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO DAY", exact: true }).click();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Source of Water · 12 oz");
  await screen.getByRole("button", { name: "CURRENT DAY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "water history", exact: true })).toHaveTextContent("8 oz");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.body)).violations).toEqual([]);
  expect(await db.events.toArray()).toEqual(before);
  // An explicit ordinary log still belongs to the real active day after historical browsing.
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  await screen.getByRole("dialog").getByRole("button", { name: "+8 oz", exact: true }).click();
  await expect.poll(async () => (await getHydrationEntries(current.id)).length).toBe(2);
  expect((await getHydrationEntries(prior.id))[0]?.effectiveAmountOz).toBe(12);
});

it("retains range, exact same-time weight selection and source focus through the complete History round trip", async () => {
  clock(); const day = await startDay(); const first = await logBodyweight(day.id, 180); await logBodyweight(day.id, 181);
  await correctBodyweight(day.id, first, 179);
  const correction = (await db.events.where("type").equals("BODYWEIGHT_LOG_CORRECTED").toArray())[0]!;
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByRole("button", { name: "last weight history", exact: true }).click();
  await screen.getByRole("button", { name: "7 DAYS", exact: true }).click();
  const slider = screen.getByRole("slider", { name: "Open recorded observation" });
  slider.element().focus(); await userEvent.keyboard("{Home}");
  await expect.element(screen.getByText(/179.0 lb · observation 1 of 2/)).toBeVisible();
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Bodyweight · 179 lbs", exact: true })).toBeVisible();
  expect(document.querySelector("[data-source-root]")?.getAttribute("data-source-root")).toBe(first);
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  await expect.poll(() => document.activeElement?.id).toBe(`history-event-${correction.id}`);
  await expect.element(screen.getByRole("button", { name: "RETURN TO BODY", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Bodyweight · 179 lbs", exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.textContent).toBe("FULL HISTORY");
  await screen.getByRole("button", { name: "BACK TO TREND", exact: true }).click();
  await expect.element(screen.getByText(/179.0 lb · observation 1 of 2/)).toBeVisible();
  expect(screen.getByRole("button", { name: "7 DAYS", exact: true }).element().getAttribute("aria-pressed")).toBe("true");
  await expect.poll(() => document.activeElement?.textContent).toBe("VIEW RECORDS");
  expect(await db.events.toArray()).toEqual(before);
});

it("keeps an unfinished sleep form through trend, sources and History, and uses the canonical correction form", async () => {
  clock(); const day = await startDay(); await logWater(day.id, 16);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await (await commandResult(screen, "SLEEP")).click();
  await screen.getByRole("spinbutton", { name: "Hours", exact: true }).fill("6");
  await screen.getByRole("spinbutton", { name: "Minutes", exact: true }).fill("35");
  await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  await screen.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
  await holdToConfirm(screen.getByRole("button", { name: "CORRECT / DELETE", exact: true }));
  const corrected = screen.getByRole("spinbutton", { name: "Corrected amount (oz)", exact: true });
  await expect.element(corrected).toHaveValue(16); await corrected.fill("12");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
  await (await commandResult(screen, "SLEEP")).click();
  await expect.element(screen.getByRole("spinbutton", { name: "Hours", exact: true })).toHaveValue(6);
  await expect.element(screen.getByRole("spinbutton", { name: "Minutes", exact: true })).toHaveValue(35);
  expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(0);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  expect((await getHydrationEntries(day.id))[0]?.effectiveAmountOz).toBe(12);
});

it("reports source read failure and retries reads without replaying a write", async () => {
  clock(); const day = await startDay(); await logWater(day.id, 8);
  const before = await db.events.toArray();
  const screen = await render(<BodyScreen />);
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  vi.mocked(getHealthSources).mockRejectedValueOnce(new Error("Interrupted read"));
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Your data is unchanged");
  await screen.getByRole("button", { name: "RETRY SOURCES", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 8 oz", exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});

it("retains changed input while a historical selection crosses the 16:30 rollover", async () => {
  clock(new Date(2026, 9, 16, 16, 25)); const day = await startDay(); await logSleep(day.id, 400, "PRIMARY");
  const screen = await render(<BodyScreen />);
  await screen.getByRole("button", { name: "Open SLEEP", exact: true }).click();
  await screen.getByRole("spinbutton", { name: "Hours", exact: true }).fill("7");
  await screen.getByText("Health history", { exact: true }).click(); // UX-COHESION-001: DAYS is the default view
  await screen.getByRole("button", { name: dayName(offsetHealthDay(healthDayStart(), -1)) }).click();
  vi.setSystemTime(new Date(2026, 9, 16, 16, 31));
  const { performDueDayRollover } = await import("../../src/application/commands");
  await performDueDayRollover();
  await screen.getByRole("button", { name: "CURRENT DAY", exact: true }).click();
  await expect.element(screen.getByRole("spinbutton", { name: "Hours", exact: true })).toHaveValue(7);
  expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(1);
});

it("opens the raw water evidence from existing TODAY FUEL and returns without adding phase rows or writes", async () => {
  clock(); const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); await logWater(day.id, 8); await logSleep(day.id, 180, "PRIMARY");
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Water 8 oz, explore records", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 8 oz", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "RETURN TO TODAY", exact: true }).click();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Water 8 oz, explore records");
  expect(document.querySelector('[data-system-status="RED"]')).not.toBeNull();
  expect(document.querySelectorAll("[data-shift-clock-row]").length).toBeLessThanOrEqual(4);
  expect(await db.events.toArray()).toEqual(before);
});

it.each([false, true])("keeps TODAY FUEL accessible values current after protein and water logs (target: %s)", async (withTarget) => {
  clock(); const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  await logProtein(day.id, 25); await logWater(day.id, 8);
  if (withTarget) await logBodyweight(day.id, 160);
  const screen = await render(<App />);
  const target = withTarget ? " / 160" : "";
  await expect.element(screen.getByRole("button", { name: `Protein 25${target} g, explore records`, exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Water 8 oz, explore records", exact: true })).toBeVisible();
  await (await commandResult(screen, "PROTEIN ONLY")).click();
  await screen.getByRole("spinbutton", { name: "Protein (g)", exact: true }).fill("30");
  await screen.getByRole("button", { name: "LOG PROTEIN", exact: true }).click();
  await expect.poll(() => db.events.where("type").equals("PROTEIN_LOGGED").count()).toBe(2);
  await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  await screen.getByRole("dialog").getByRole("button", { name: "+16 oz", exact: true }).click();
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "water history", exact: true })).toHaveTextContent("24 oz");
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: `Protein 55${target} g, explore records`, exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Water 24 oz, explore records", exact: true })).toBeVisible();
});

it("reopens the current correction in retained History and does not steal focus when inspecting another day", async () => {
  clock(new Date(2026, 9, 15, 20)); const previous = await startDay(); await logWater(previous.id, 16); await endDay(previous.id);
  clock(); const day = await startDay(); await logWater(day.id, 8);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  await screen.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
  await holdToConfirm(screen.getByRole("button", { name: "CORRECT / DELETE", exact: true }));
  await screen.getByRole("spinbutton", { name: "Corrected amount (oz)", exact: true }).fill("12");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
  await screen.getByRole("button", { name: "BACK TO BODY", exact: true }).click();
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await screen.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 12 oz", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  const head = (await getHydrationEntries(day.id))[0]!.headEventId;
  await expect.poll(() => document.activeElement?.id).toBe(`history-event-${head}`);
  expect(document.getElementById(`history-event-${head}`)?.textContent).toContain("12 oz");
  const otherDay = document.getElementById(`history-day-${previous.id}`)!;
  const toggle = otherDay.querySelector<HTMLButtonElement>("button")!;
  toggle.click(); toggle.focus();
  await expect.poll(() => document.activeElement).toBe(toggle);
  document.getElementById(`history-day-${day.id}`)!.querySelector<HTMLButtonElement>("button")!.click();
  await screen.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  await expect.poll(() => document.activeElement?.id).toBe(`history-event-${head}`);
});

it("retains exploration without running hidden progress reads on each quick log", async () => {
  clock(); const day = await startDay(); await logWater(day.id, 8);
  const screen = await render(<BodyScreen />);
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  const reads = vi.mocked(getBodyInsights).mock.calls.length;
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "+8 oz", exact: true }).click();
  await expect.poll(async () => (await getHydrationEntries(day.id)).length).toBe(2);
  expect(vi.mocked(getBodyInsights).mock.calls.length).toBe(reads);
  await screen.getByRole("button", { name: "YOUR PROGRESS", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  await expect.element(screen.getByText(/16 oz · observation 1 of 1/)).toBeVisible();
  expect(vi.mocked(getBodyInsights).mock.calls.length).toBe(reads + 1);
});

it("reveals an explicitly requested metric after a retained timeline and exposes its reading to assistive technology", async () => {
  clock(); const day = await startDay(); await logWater(day.id, 8);
  const screen = await render(<BodyScreen />);
  const reading = screen.getByRole("button", { name: "water history", exact: true });
  await expect.element(reading).toHaveTextContent("8 oz");
  const description = reading.element().getAttribute("aria-describedby")!;
  expect(document.getElementById(description)?.textContent).toBe("8 oz");
  await reading.click();
  await screen.getByRole("button", { name: "SHOW ACCOMPLISHMENT TIMELINE", exact: true }).click();
  await expect.element(screen.getByText("The chart is hidden while your accomplishment timeline is open.", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await expect.element(screen.getByRole("img", { name: /^Water:/ })).toBeVisible();
});

it("keeps explicit historical browsing read-only when an active workout defers rollover", async () => {
  clock(new Date(2026, 9, 15, 20)); const day = await startDay(); await logWater(day.id, 8);
  const session = await startWorkout(day.id, "A", "STANDARD");
  // In use 30 minutes before the view: TONIGHT-001 only lets an idle workout release the day.
  await db.workoutSessions.update(session.id, { startedAt: new Date(2026, 9, 16, 19, 30).toISOString() });
  clock(); const before = await db.events.toArray();
  const screen = await render(<App />);
  await expect.element(screen.getByRole("spinbutton", { name: "Set 1 repetitions", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByText("Health history", { exact: true }).click(); // UX-COHESION-001: DAYS is the default view
  await screen.getByRole("button", { name: dayName(offsetHealthDay(healthDayStart(), -1)) }).click();
  await screen.getByText("Recorded entries · 1", { exact: true }).click();
  await screen.getByRole("button", { name: "Source of Water · 8 oz", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Water · 8 oz", exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: "CORRECT ENTRY", exact: true }).elements()).toHaveLength(0);
  expect((await db.workoutSessions.get(session.id))?.status).toBe("ACTIVE");
  expect(await db.beyondDays.count()).toBe(1);
  expect(await db.events.toArray()).toEqual(before);
});
