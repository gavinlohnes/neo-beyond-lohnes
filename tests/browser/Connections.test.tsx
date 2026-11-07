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
