import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { Connections } from "../../src/ui/components/Connections";
import { getConnections } from "../../src/application/connectionQueries";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { createObligation } from "../../src/application/intentCommands";
import { createProject } from "../../src/application/projectCommands";
import { db } from "../../src/persistence/db";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });

it("lists only explicit [[links]] to a record, from notes, tasks and projects, and never itself", async () => {
  const day = await startDay();
  const { project } = await createProject({ title: "Reading corner" }, []);
  await saveDailyNote(day.id, "Measured the window for [[Reading corner]]. Also thought about the garage.");
  await createObligation({ title: "Buy a lamp", description: "For [[reading corner]]" });
  await createObligation({ title: "Reading corner shelf" }); // plain words are not a link
  const before = await db.events.count();

  const read = await getConnections("Reading corner", { kind: "PROJECT", id: project.id });
  expect(read.state).toBe("ready");
  const items = read.state === "ready" ? read.value : [];
  expect(items.map((item) => item.kind).sort()).toEqual(["DAY", "TASK"]);
  expect(items.find((item) => item.kind === "TASK")?.label).toBe("Buy a lamp");

  const screen = await render(<Connections id="c" label="Reading corner" self={{ kind: "PROJECT", id: project.id }} />);
  await expect.element(screen.getByRole("heading", { name: "Linked to Reading corner" })).toBeVisible();
  await expect.element(screen.getByText("Buy a lamp")).toBeVisible();
  await expect.element(screen.getByText("Daily note")).toBeVisible();
  expect((await axe.run(screen.container)).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect(await db.events.count()).toBe(before);
});

it("says plainly when nothing links here yet", async () => {
  const screen = await render(<Connections id="e" label="Garage" />);
  await expect.element(screen.getByText("Nothing links here yet.")).toBeVisible();
  await expect.element(screen.getByText("Type [[Garage]] in a daily note, task or journal entry to connect it.")).toBeVisible();
});

it("CONNECT-002: tapping a connection opens the record it names", async () => {
  const task = await createObligation({ title: "Order shelves", description: "For [[Workshop]]" });
  const events: unknown[] = [];
  const listen = (e: Event) => events.push((e as CustomEvent).detail);
  window.addEventListener("beyond:open-record", listen);
  try {
    const screen = await render(<Connections id="t" label="Workshop" />);
    await expect.element(screen.getByText("Order shelves")).toBeVisible();
    const open = screen.getByRole("button", { name: "Open task: Order shelves" });
    expect(open.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await open.click();
    expect(events).toEqual([{ kind: "TASK", id: task.id }]);
  } finally { window.removeEventListener("beyond:open-record", listen); }
});

it("CONNECT-002: the app opens a tapped task's detail and a tapped day's note", async () => {
  const { App } = await import("../../src/app/App");
  const { openRecord } = await import("../../src/ui/openRecordEvent");
  const day = await startDay();
  await saveDailyNote(day.id, "Notes for [[Workshop]].");
  const task = await createObligation({ title: "Order shelves" });
  const screen = await render(<App />);
  openRecord({ kind: "TASK", id: task.id });
  await expect.element(screen.getByRole("heading", { name: "Order shelves" }).first()).toBeVisible();
  openRecord({ kind: "DAY", id: day.id });
  await expect.element(screen.getByRole("textbox", { name: "Your note" })).toHaveValue("Notes for [[Workshop]].");
});

it("UNLINKED-001: suggests plain-word mentions and links one only on LINK", async () => {
  const day = await startDay();
  await saveDailyNote(day.id, "Spent the evening on the garage shelves.");
  const before = await db.events.count();
  const screen = await render(<Connections id="u" label="garage" />);
  await screen.getByText("Mentioned without a link (1)").click();
  expect(await db.events.count()).toBe(before);
  expect((await db.dailyNotes.get(day.id))?.text).toBe("Spent the evening on the garage shelves.");
  await screen.getByRole("button", { name: /^Link garage in the note from / }).click();
  await expect.poll(async () => (await db.dailyNotes.get(day.id))?.text).toBe("Spent the evening on the [[garage]] shelves.");
  await expect.element(screen.getByRole("button", { name: /^Open daily note: / })).toBeVisible();
  expect(screen.getByText(/^Mentioned without a link/).elements()).toHaveLength(0);
});

it("UNLINKED-001: a name inside someone else's [[link]] is not suggested", async () => {
  const day = await startDay();
  await saveDailyNote(day.id, "Wrote up [[Ann and Bob plan]] tonight.");
  const { getUnlinkedMentions } = await import("../../src/application/connectionQueries");
  expect(await getUnlinkedMentions("Bob")).toEqual([]);
});
