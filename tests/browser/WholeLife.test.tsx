import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { LifeScreen } from "../../src/ui/screens/more/LifeScreen";
import { startDay, setWorkContext } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { createProject, setProjectNext } from "../../src/application/projectCommands";
import { createRoutine } from "../../src/application/routineCommands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { getWholeLife } from "../../src/application/wholeLifeQueries";
import { startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { settleVisuals } from "./helpers/settleVisuals";
import "../../src/ui/screens/more/operator.css";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 5, 17));
  await page.viewport(360, 800);
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); sessionStorage.clear(); });
async function seed(work = false) {
  const day = await startDay(); await setWorkContext(day.id, work ? "WORK" : "OFF", "MANUAL");
  const task = await createObligation({ title: "Call Sam about Saturday", plannedAt: "2026-11-05" });
  await createObligation({ title: "Pick up groceries", dueAt: "2026-11-07" });
  const project = await createProject({ title: "Make a reading corner", finish: "A place to slow down at home" }, [{ title: "Measure the window" }]);
  await setProjectNext(project.project.id, project.steps[0]!.id);
  await createRoutine({ title: "An evening reset", moment: "DAY_OFF", steps: [{ text: "Clear the desk", minutes: 2 }, { text: "Put tomorrow's things together" }] });
  await saveDailyNote(day.id, "A good conversation. Keep a little space for the weekend.");
  return { day, task };
}

for (const width of [320, 360, 412, 1440]) it(`connects real whole-life records without writing while browsing at ${width}px`, async () => {
  await page.viewport(width, 900);
  await seed();
  const count = await db.events.count();
  const navigate = vi.fn(), task = vi.fn();
  const screen = await render(<div className="screen more-operator more-whole-life"><LifeScreen active startAtOverview onNavigate={navigate} onTask={task} /></div>);
  await expect.element(screen.getByRole("heading", { name: "What matters next" })).toBeVisible();
  await expect.element(screen.getByText("Call Sam about Saturday", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Make a reading corner" })).toBeVisible();
  await expect.element(screen.getByText("Chosen next: Measure the window", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("A good conversation. Keep a little space for the weekend.", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Next seven days", exact: true }).click();
  await expect.element(screen.getByText("Pick up groceries", { exact: true })).toBeVisible();
  expect(screen.getByText("Call Sam about Saturday", { exact: true }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "Capture a thought", exact: true }).click();
  expect(navigate).toHaveBeenLastCalledWith({ kind: "capture" });
  await screen.getByRole("button", { name: "Continue your note", exact: true }).click();
  expect(navigate).toHaveBeenLastCalledWith({ kind: "more", view: "DAILY_NOTE" });
  await settleVisuals(screen.container);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  if (width === 1440) expect(screen.container.querySelector(".whole-life")!.getBoundingClientRect().width).toBeGreaterThan(1000);
  for (const button of screen.container.querySelectorAll<HTMLElement>(".whole-life button")) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect((await axe.run(screen.container)).violations).toEqual([]);
  expect(await db.events.count()).toBe(count);
});

it("keeps a free day useful without creating a day, tasks or fictional progress", async () => {
  const screen = await render(<LifeScreen active startAtOverview onNavigate={vi.fn()} onTask={vi.fn()} />);
  await expect.element(screen.getByText("A little breathing room.", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Open people", exact: true })).toBeVisible();
  expect(await db.beyondDays.count()).toBe(0); expect(await db.events.count()).toBe(0);
  expect(screen.container.textContent).not.toMatch(/score|missed|streak|all clear/i);
});

it("keeps other life areas visible when a source cannot be read, then refreshes", async () => {
  await seed();
  const fail = vi.spyOn(db.projects, "toArray").mockRejectedValue(new Error("Storage unavailable"));
  const snapshot = await getWholeLife();
  expect(snapshot.projects.state).toBe("unavailable"); expect(snapshot.plan.state).toBe("ready");
  const screen = await render(<LifeScreen active startAtOverview onNavigate={vi.fn()} onTask={vi.fn()} />);
  await expect.element(screen.getByText("Records unavailable. Refresh to try again.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Call Sam about Saturday", { exact: true })).toBeVisible();
  fail.mockRestore();
  await screen.getByRole("button", { name: "Refresh your life" }).click();
  await expect.element(screen.getByRole("heading", { name: "Make a reading corner" })).toBeVisible();
});

it("preserves an interrupted home draft through the overview and tabs", async () => {
  const screen = await render(<LifeScreen active startAtOverview onNavigate={vi.fn()} onTask={vi.fn()} />);
  await screen.getByRole("navigation", { name: "Life shortcuts" }).getByRole("button", { name: "Home", exact: true }).click();
  await screen.getByRole("textbox", { name: "What", exact: true }).fill("Furnace filter size");
  await screen.getByRole("button", { name: "← Back to your life", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: /YOUR LIFE\.\s*IN MOTION\./ })).toHaveFocus();
  await screen.getByRole("navigation", { name: "Life shortcuts" }).getByRole("button", { name: "People", exact: true }).click();
  await screen.getByRole("tab", { name: "Home", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What", exact: true })).toHaveValue("Furnace filter size");
  expect(await db.events.count()).toBe(0);
});

it("opens from TODAY on a workday, routes a real task, and retains the existing primary navigation", async () => {
  const { task } = await seed(true);
  const count = await db.events.count();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Open your life", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: /YOUR LIFE\.\s*IN MOTION\./ })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /Call Sam about Saturday/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /Call Sam about Saturday/ }).element().getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight - 64);
  await screen.getByRole("button", { name: /Call Sam about Saturday/ }).click();
  await expect.element(screen.getByRole("heading", { name: "Call Sam about Saturday", exact: true })).toBeVisible();
  expect(await db.obligations.get(task.id)).toMatchObject({ status: "OPEN", plannedAt: "2026-11-05" });
  expect(await db.events.count()).toBe(count);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Open your life", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
});

it("opens the routine player read-only and reflects completion after explicit DONE", async () => {
  await seed();
  const count = await db.events.count();
  const screen = await render(<LifeScreen active startAtOverview onNavigate={vi.fn()} onTask={vi.fn()} />);
  await screen.getByRole("button", { name: /An evening reset.*Play/ }).click();
  await expect.element(screen.getByRole("dialog", { name: "An evening reset", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Clear the desk", exact: true })).toBeVisible();
  expect(getComputedStyle(screen.getByRole("button", { name: "DONE", exact: true }).element()).backgroundColor)
    .not.toBe(getComputedStyle(screen.getByRole("dialog", { name: "An evening reset", exact: true }).element()).backgroundColor);
  expect(await db.events.count()).toBe(count);
  await screen.getByRole("button", { name: "DONE", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Put tomorrow's things together", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "CLOSE PLAYER", exact: true }).click();
  await expect.element(screen.getByText("1 / 2 steps recorded", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("progressbar", { name: "Recorded steps in An evening reset" })).toHaveAttribute("value", "1");
  await expect.element(screen.getByRole("progressbar", { name: "Recorded steps in An evening reset" })).toHaveAttribute("max", "2");
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(1);
});

it("surfaces an actual open workout and resumes through the shell without writing", async () => {
  const { day } = await seed();
  await startWorkout(day.id, "A", "STANDARD");
  const count = await db.events.count();
  const navigate = vi.fn();
  const screen = await render(<LifeScreen active startAtOverview onNavigate={navigate} onTask={vi.fn()} />);
  await screen.getByRole("button", { name: /Return to your workout/ }).click();
  expect(navigate).toHaveBeenLastCalledWith({ kind: "workout" });
  expect(await db.events.count()).toBe(count);
});

it("CONNECTED-001: shows Google Calendar events beside tasks when connected, read-only, and nothing when not", async () => {
  await seed();
  const count = await db.events.count();
  localStorage.setItem("beyond.googleCalendar", JSON.stringify({ accessToken: "t", expiresAt: Date.now() + 3600_000, calendarId: null, calendarName: null, includePlans: false, syncOnOpen: false, lastSyncAt: new Date(2026, 10, 5, 16).toISOString() }));
  localStorage.setItem("beyond.googleCalendar.events", JSON.stringify([
    { id: "e1", title: "Dentist", start: new Date(2026, 10, 5, 18, 30).toISOString(), end: new Date(2026, 10, 5, 19).toISOString(), allDay: false, calendar: "primary" },
    { id: "e2", title: "Dinner at Mom's", start: "2026-11-08", end: "2026-11-09", allDay: true, calendar: "primary" },
  ]));
  try {
    const screen = await render(<div className="screen more-operator more-whole-life"><LifeScreen active startAtOverview /></div>);
    await expect.element(screen.getByText("Dentist", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/From your Google Calendar, synced .*Read-only here\./)).toBeVisible();
    expect(screen.getByText("Dinner at Mom's", { exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Next seven days", exact: true }).click();
    await expect.element(screen.getByText("Dinner at Mom's", { exact: true })).toBeVisible();
    expect((await axe.run(screen.container)).violations).toEqual([]);
    expect(await db.events.count()).toBe(count);
    await cleanup();
    localStorage.removeItem("beyond.googleCalendar");
    const offline = await render(<div className="screen more-operator more-whole-life"><LifeScreen active startAtOverview /></div>);
    await expect.element(offline.getByRole("heading", { name: "What matters next" })).toBeVisible();
    expect(offline.getByText("ON YOUR CALENDAR", { exact: true }).elements()).toHaveLength(0);
  } finally { localStorage.removeItem("beyond.googleCalendar"); localStorage.removeItem("beyond.googleCalendar.events"); }
});

it("RESURFACE-001: brings back one thing you kept, the same all day, and opens it", async () => {
  await db.highlights.add({ id: "h1", sourceTitle: "Meditations", sourceUrl: null, text: "You have power over your mind.", note: "", tags: [], createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" });
  const { getResurfaced } = await import("../../src/application/resurfaceQueries");
  const first = await getResurfaced(new Date(2026, 10, 5, 9)), later = await getResurfaced(new Date(2026, 10, 5, 21));
  expect(first).toEqual(later);
  const events: unknown[] = [];
  const listen = (e: Event) => events.push((e as CustomEvent).detail);
  window.addEventListener("beyond:open-record", listen);
  try {
    const screen = await render(<div className="screen more-operator more-whole-life"><LifeScreen active startAtOverview /></div>);
    await expect.element(screen.getByRole("heading", { name: "Something you kept" })).toBeVisible();
    await expect.element(screen.getByText("You have power over your mind.")).toBeVisible();
    await screen.getByRole("button", { name: "Open highlights" }).click();
    expect(events).toEqual([{ kind: "HIGHLIGHT", id: "h1" }]);
  } finally { window.removeEventListener("beyond:open-record", listen); }
});

it("DAY-OFF-PLAN-001: asks Alfred for a day-off draft as cards, from YOUR LIFE", async () => {
  const { ASK_ALFRED_EVENT, PLAN_MY_DAY_OFF_ASK } = await import("../../src/ui/components/AlfredSheet");
  const asked: string[] = [];
  const listen = (e: Event) => asked.push((e as CustomEvent<string>).detail);
  window.addEventListener(ASK_ALFRED_EVENT, listen);
  try {
    const screen = await render(<div className="screen more-operator more-whole-life"><LifeScreen active startAtOverview /></div>);
    await screen.getByRole("button", { name: "Plan my day off" }).click();
    expect(asked).toEqual([PLAN_MY_DAY_OFF_ASK]);
    expect(PLAN_MY_DAY_OFF_ASK).toContain("I'll save the ones I want");
    expect(PLAN_MY_DAY_OFF_ASK).toContain("unknown, not free");
  } finally { window.removeEventListener(ASK_ALFRED_EVENT, listen); }
});
