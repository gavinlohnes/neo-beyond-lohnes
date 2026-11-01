import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { getProjectViews } from "../../src/application/projectQueries";
import { db } from "../../src/persistence/db";

/** PROJECTS-001: the "help me get this done" journey, by hand and through Alfred. Invented data only. */
let consoleErrors: unknown[] = [];
const original = console.error;
beforeEach(async () => {
  consoleErrors = []; console.error = (...args: unknown[]) => { consoleErrors.push(args); original(...args); };
  await page.viewport(360, 800);
});
afterEach(async () => { await cleanup(); console.error = original; vi.restoreAllMocks(); });
const noAxe = async (el: HTMLElement) => expect((await axe.run(el, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

it("creates a project with steps, picks a next step, finishes a step and completes the project at 360px", async () => {
  const screen = await render(<IntentScreen />);
  await expect.element(screen.getByText("No open projects.")).toBeVisible();
  await screen.getByRole("button", { name: "CREATE PROJECT", exact: true }).click();
  await screen.getByRole("textbox", { name: "New project title" }).fill("Renew a passport");
  await screen.getByRole("textbox", { name: "Finished when" }).fill("New passport in hand");
  await screen.getByRole("textbox", { name: "First steps, one per line" }).fill("Fill in the form\nGet photos\n");
  await screen.getByRole("button", { name: "CREATE PROJECT", exact: true }).last().click();
  await expect.element(screen.getByText("0 of 2 done", { exact: false })).toBeVisible();
  // The steps are ordinary commitments, listed with their project.
  await expect.element(screen.getByText("OPEN · project Renew a passport").first()).toBeVisible();

  await screen.getByRole("button", { name: "Show project Renew a passport" }).click();
  await expect.element(screen.getByText("Finished when: New passport in hand")).toBeVisible();
  await screen.getByRole("combobox", { name: "Next step for Renew a passport" }).selectOptions("Get photos");
  await expect.element(screen.getByText("Next: Get photos", { exact: false })).toBeVisible();
  await noAxe(screen.container);

  // Finish the next step in its own editor, then come back.
  await screen.getByRole("button", { name: "Open Get photos" }).first().click();
  await screen.getByRole("button", { name: "SATISFY", exact: true }).click();
  await screen.getByRole("button", { name: "CONFIRM SATISFIED" }).click();
  await expect.element(screen.getByText("Historical commitment · resolution already recorded.")).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO OBLIGATIONS" }).click();
  await expect.element(screen.getByText("1 of 2 done · Next step done. Choose another when ready.")).toBeVisible();

  await screen.getByRole("button", { name: "Show project Renew a passport" }).click();
  await screen.getByRole("button", { name: "COMPLETE", exact: true }).click();
  await expect.element(screen.getByText("1 step is still open; they stay exactly as they are.", { exact: false })).toBeVisible();
  await screen.getByRole("button", { name: "CONFIRM COMPLETE" }).click();
  await expect.element(screen.getByText("No open projects.")).toBeVisible();
  await screen.getByRole("button", { name: "ALL / FINISHED" }).click();
  await expect.element(screen.getByText("COMPLETED", { exact: true }).first()).toBeVisible();
  // The open step is untouched.
  expect((await db.obligations.toArray()).map((o) => o.status).sort()).toEqual(["OPEN", "SATISFIED"]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect(consoleErrors).toEqual([]);
});

it("moves a commitment into a project from its editor", async () => {
  const screen = await render(<IntentScreen />);
  await screen.getByRole("button", { name: "CREATE PROJECT", exact: true }).click();
  await screen.getByRole("textbox", { name: "New project title" }).fill("Fix the fence");
  await screen.getByRole("button", { name: "CREATE PROJECT", exact: true }).last().click();
  await expect.element(screen.getByText("No steps yet", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "CREATE OBLIGATION", exact: true }).click();
  await screen.getByRole("textbox", { name: "New obligation title" }).fill("Buy posts");
  await screen.getByRole("button", { name: "CREATE OBLIGATION", exact: true }).last().click();
  await screen.getByRole("button", { name: "Open Buy posts" }).click();
  await screen.getByRole("button", { name: "EDIT", exact: true }).click();
  await screen.getByRole("combobox", { name: "Project" }).selectOptions("Fix the fence");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Project: Fix the fence")).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO OBLIGATIONS" }).click();
  await expect.element(screen.getByText("0 of 1 done", { exact: false })).toBeVisible();
});

it("Alfred proposes a project with steps as one card; nothing is saved until SAVE", async () => {
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-projects");
  vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    if (!String(input instanceof Request ? input.url : input).startsWith("https://api.anthropic.com/")) throw new Error("Unexpected destination");
    return new Response(JSON.stringify({ id: "msg_p", type: "message", role: "assistant", model: "claude-haiku-5-5",
      content: [{ type: "text", text: "Here is a draft." }, { type: "tool_use", id: "p1", name: "project_new", input: { title: "Clear the garage", steps: [{ title: "Sort shelves" }, { title: "Book a tip run", due_date: "2026-11-08" }] } }],
      stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 100, output_tokens: 20 } }), { headers: { "content-type": "application/json" } });
  });
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await screen.getByRole("button", { name: "Help me get something done" }).click();
  await expect.element(screen.getByRole("textbox", { name: "Message Alfred" })).toHaveValue("Help me get this done: ");
  await screen.getByRole("textbox", { name: "Message Alfred" }).fill("Help me get this done: clear the garage");
  await screen.getByRole("button", { name: "SEND", exact: true }).click();
  const card = screen.getByRole("group", { name: /^New project: Clear the garage · 2 steps: 1\. Sort shelves; 2\. Book a tip run \(Sun, Nov 8(, 2026)?\)$/ });
  await expect.element(card).toBeVisible();
  expect(await db.projects.count()).toBe(0);
  await card.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Saved.", { exact: true })).toBeVisible();
  const [view] = await getProjectViews();
  expect(view!.project.title).toBe("Clear the garage");
  expect(view!.steps.map((s) => [s.title, s.dueAt ?? null])).toEqual([["Sort shelves", null], ["Book a tip run", "2026-11-08"]]);
  localStorage.removeItem("beyond.alfredKey");
});
