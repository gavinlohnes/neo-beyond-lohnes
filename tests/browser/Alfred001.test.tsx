import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { db } from "../../src/persistence/db";

/** ALFRED-001: the man in the chair — records in, cards out, nothing saved until the operator says so. */
let requests: { url: string; body: Record<string, unknown> }[] = [];
/** The conversation's requests (they carry tools); TODAY's brief asks without tools. */
const chats = () => requests.filter((r) => r.body.tools);
let briefText = "Sleep first: 4h12 so far and the shift starts 18:00.";
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
let next: () => Response;
beforeEach(async () => {
  await page.viewport(412, 915);
  requests = [];
  briefText = "Sleep first: 4h12 so far and the shift starts 18:00.";
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.anthropic.com/")) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push({ url, body });
    return body.tools ? next() : reply([{ type: "text", text: briefText }], "end_turn");
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ALFRED-001", () => {
  it("asks for the owner's key once, then keeps it on the phone", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await sheet.getByLabelText("Claude API key").fill("sk-ant-test-key");
    await sheet.getByRole("button", { name: "SAVE KEY" }).click();
    await expect.element(sheet.getByRole("button", { name: "How am I doing?" })).toBeVisible();
    expect(localStorage.getItem("beyond.alfredKey")).toBe("sk-ant-test-key");
    expect((await axe.run(sheet.element())).violations).toEqual([]);
  });

  it("turns plain words into cards; SAVE writes through BEYOND's own command, SKIP writes nothing", async () => {
    const day = await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    next = () => reply([
      { type: "text", text: "Logged both for you to confirm." },
      { type: "tool_use", id: "toolu_1", name: "log_water", input: { oz: 20 } },
      { type: "tool_use", id: "toolu_2", name: "add_reminder", input: { title: "Call CPAP place", due_date: "2026-11-01", when_note: "after you wake" } },
    ]);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("20 oz water, and remind me to call the CPAP place after I wake");
    await sheet.getByRole("button", { name: "SEND", exact: true }).click();
    await expect.element(sheet.getByText("Logged both for you to confirm.")).toBeVisible();
    // Nothing is written until SAVE.
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
    const water = sheet.getByRole("group", { name: "Log 20 oz water" });
    await water.getByRole("button", { name: "SAVE" }).click();
    await expect.poll(() => db.events.where("beyondDayId").equals(day.id).filter((e) => e.type === "WATER_LOGGED").count()).toBe(1);
    await expect.element(water.getByText("Saved.")).toBeVisible();
    await sheet.getByRole("group", { name: /^Remind: Call CPAP place/ }).getByRole("button", { name: "SKIP" }).click();
    expect(await db.obligations.count()).toBe(0);

    // The request: the everyday model (ALFRED-003) with the owner's key, BEYOND's records in a cached system block.
    const body = chats()[0]!.body;
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.fallbacks).toBeUndefined();
    const system = body.system as { text: string; cache_control?: unknown }[];
    expect(system[1]!.text).toMatch(/^BEYOND RECORDS/);
    expect(system[1]!.cache_control).toEqual({ type: "ephemeral" });
    expect((body.tools as { name: string }[]).map((t) => t.name)).toEqual(["log_meal", "log_water", "log_sleep", "log_weight", "add_reminder", "routine_new", "routine_edit", "project_new", "capture_note",
      "check_in", "work_started", "work_ended", "task_done", "task_new_date", "clean_day", "open_training",
      "person_date", "remember", "forget", "log_urge", "search_records", "get_days"]);

    // The next turn tells Alfred what happened to each card.
    next = () => reply([{ type: "text", text: "Noted." }], "end_turn");
    await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("thanks");
    await sheet.getByRole("button", { name: "SEND", exact: true }).click();
    await expect.element(sheet.getByText("Noted.")).toBeVisible();
    const last = (chats()[1]!.body.messages as { role: string; content: unknown }[]).at(-1)!;
    expect(JSON.stringify(last.content)).toContain("confirmed it; it is saved");
    expect(JSON.stringify(last.content)).toContain("skipped it; nothing was saved");
  });

  it("says plainly when Claude can't be reached; BEYOND keeps working", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    next = () => { throw new TypeError("Failed to fetch"); };
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await sheet.getByRole("button", { name: "How am I doing?" }).click();
    await expect.element(sheet.getByRole("alert")).toHaveTextContent(/No connection to Claude|couldn't answer/);
  });

  it("reads BEYOND's records into plain lines, saved meals by id", async () => {
    await startDay();
    const meal = await createSavedMeal({ name: "Protein shake", calories: 160, proteinG: 30, carbsG: 5, fatG: 2 });
    const context = await buildAlfredContext();
    expect(context).toMatch(/^NOW: /);
    expect(context).toContain(`${meal.id}: Protein shake — 160 kcal, 30 g protein`);
    expect(context).toContain("LAST 14 LIVED DAYS");
  });
});

describe("ALFRED-001 text", () => {
  it("renders Alfred's bold, lists and headings as text, never as HTML", async () => {
    const { AlfredText } = await import("../../src/ui/components/AlfredSheet");
    const screen = await render(<AlfredText text={"**Tonight**\n- Slept **7h30**\n- Water 44 oz\n\n## What stands out\nProtein. <img src=x onerror=alert(1)>"} />);
    await expect.element(screen.getByText("Tonight")).toBeVisible();
    expect(screen.container.querySelectorAll("li")).toHaveLength(2);
    expect(screen.container.querySelector("strong")?.textContent).toBe("Tonight");
    expect(screen.container.querySelector("img")).toBeNull();
    expect(screen.container.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
