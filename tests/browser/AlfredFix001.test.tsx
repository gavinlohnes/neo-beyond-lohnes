import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { getDayLogEntries } from "../../src/application/logEntries";
import { db } from "../../src/persistence/db";

/**
 * ALFRED-FIX-001 (Gavin, 2026-11-15: "have Alfred or the free helper edit it and update it"; "Approved."): his exact
 * case from the screenshot. Alfred reads the entries, proposes the move, the card shows the real 19:15 → 23:00, and
 * SAVE runs the existing retime. The free helper does the same with no AI call. Nothing is written before SAVE.
 */
let requests: Record<string, unknown>[] = [];
let replies: (() => Response)[] = [];
const chats = () => requests.filter((b) => b.tools);
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  requests = []; replies = [];
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.anthropic.com/")) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push(body);
    if (!body.tools) return reply([{ type: "text", text: "Brief." }], "end_turn");
    return (replies.shift() ?? (() => reply([{ type: "text", text: "Done." }], "end_turn")))();
  });
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); try { localStorage.clear(); } catch { /* ignore */ } });

async function seed() {
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
  const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 14, 19, 15));
  await logManualMeal(day.id, { name: "Butter Chicken and Rice", calories: 560, proteinG: 46, carbsG: 60, fatG: 18 });
  vi.setSystemTime(new Date(2026, 10, 14, 19, 17));
  return { day, meal: (await getDayLogEntries(day.id))[0]! };
}
async function openAlfred() {
  await page.viewport(412, 915);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
  return screen.getByRole("dialog", { name: "ALFRED" });
}
const send = async (sheet: ReturnType<typeof page.getByRole>, text: string) => {
  await sheet.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await sheet.getByRole("button", { name: "SEND", exact: true }).click();
};
const hourOf = async (dayId: string) => new Date((await getDayLogEntries(dayId))[0]!.at).getHours();

describe("ALFRED-FIX-001", () => {
  it("Alfred: reads the entries, the card shows the real 19:15 → 23:00, and SAVE moves the meal", async () => {
    const { day, meal } = await seed();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [
      () => reply([{ type: "tool_use", id: "r1", name: "day_entries", input: {} }]),
      () => reply([{ type: "text", text: "Here's the move." }, { type: "tool_use", id: "f1", name: "fix_entry", input: { entry_id: meal.rootEventId, action: "move", time: "23:00" } }]),
    ];
    const sheet = await openAlfred();
    await send(sheet, "Edit the meal I just logged, I ate it at 2300 hours");
    const card = sheet.getByRole("group", { name: "Move Butter Chicken and Rice · 19:15 → 23:00" });
    await expect.element(card).toBeVisible();
    // Alfred was given the real entry and its id by the read, before he proposed.
    expect(JSON.stringify(chats()[1]!.messages)).toContain(`id=${meal.rootEventId} · MEAL · Butter Chicken and Rice · 19:15`);
    // Nothing moves until SAVE.
    expect(await hourOf(day.id)).toBe(19);
    expect((await axe.run(sheet.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    await card.getByRole("button", { name: "SAVE" }).click();
    await expect.poll(() => hourOf(day.id)).toBe(23);
    expect((await db.events.toArray()).map((e) => e.type)).toContain("LOG_RETIMED");
  });

  it("Alfred: a wrong id never becomes a card; he is told and asked again", async () => {
    await seed();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [
      () => reply([{ type: "tool_use", id: "f1", name: "fix_entry", input: { entry_id: "made-up", action: "remove" } }]),
      () => reply([{ type: "text", text: "I couldn't find that entry." }], "end_turn"),
    ];
    const sheet = await openAlfred();
    await send(sheet, "Delete the thing I logged earlier please");
    await expect.element(sheet.getByText("I couldn't find that entry.")).toBeVisible();
    expect(JSON.stringify(chats()[1]!.messages)).toContain("No meal, water or protein entry with that id");
    expect(sheet.getByRole("button", { name: "SAVE" }).elements()).toHaveLength(0);
  });

  it("the free helper, with no key and no AI call: 'move the butter chicken to 23:00' gives the same card", async () => {
    const { day } = await seed();
    const sheet = await openAlfred();
    await send(sheet, "move the butter chicken and rice to 23:00");
    const card = sheet.getByRole("group", { name: "Move Butter Chicken and Rice · 19:15 → 23:00" });
    await expect.element(card).toBeVisible();
    expect(chats()).toHaveLength(0);
    await card.getByRole("button", { name: "SAVE" }).click();
    await expect.poll(() => hourOf(day.id)).toBe(23);
  });
});
