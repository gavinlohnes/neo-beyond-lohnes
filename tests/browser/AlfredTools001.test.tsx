import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { getProteinEntries } from "../../src/application/queries";
import { db } from "../../src/persistence/db";

/**
 * ALFRED-TOOLS-001 (Gavin, 2026-11-15: "Start with missions 1 and 2"): Alfred proposes from the registry, BEYOND fills
 * the card (a time placed in the lived day), SAVE runs the existing command, UNDO takes a log back, and he is told to
 * name what BEYOND can't do instead of only refusing. Invented data; no real network.
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

async function openAlfred() {
  await page.viewport(320, 740);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
  return screen.getByRole("dialog", { name: "ALFRED" });
}
const send = async (sheet: ReturnType<typeof page.getByRole>, text: string) => {
  await sheet.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await sheet.getByRole("button", { name: "SEND", exact: true }).click();
};

describe("ALFRED-TOOLS-001", () => {
  it("a protein shake 'at 3:10' becomes a timed card; SAVE logs it at 03:10 and UNDO takes it back", async () => {
    vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, 15, 4, 21));
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [() => reply([{ type: "text", text: "Proposed." }, { type: "tool_use", id: "p1", name: "log_protein", input: { grams: 30, time: "03:10" } }])];
    const sheet = await openAlfred();
    await send(sheet, "had a 30g shake at 3:10");
    const card = sheet.getByRole("group", { name: "Log 30 g protein · at 03:10" });
    await expect.element(card).toBeVisible();
    // His tools come from the registry, and he is told to name what BEYOND can't do.
    const first = chats()[0]!;
    const names = (first.tools as { name: string }[]).map((t) => t.name);
    for (const tool of ["log_protein", "set_work_context", "schedule_change", "remove_log", "task_release", "habit_done", "handoff_note"]) expect(names).toContain(tool);
    expect(JSON.stringify(first.system)).toContain("say in one sentence what BEYOND can't do yet");
    expect(await getProteinEntries(day.id)).toEqual([]);
    expect((await axe.run(sheet.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    await card.getByRole("button", { name: "SAVE" }).click();
    await expect.poll(async () => (await getProteinEntries(day.id)).map((e) => new Date(e.at).getHours())).toEqual([3]);
    await card.getByRole("button", { name: "Undo: Log 30 g protein · at 03:10" }).click();
    await expect.poll(async () => (await getProteinEntries(day.id)).length).toBe(0);
  });

  it("an unusable call is answered to Alfred, not shown as a card or left as 'pending'", async () => {
    vi.setSystemTime(new Date(2026, 10, 15, 4, 21));
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [
      () => reply([{ type: "tool_use", id: "x1", name: "set_work_context", input: { context: "SOMETIMES" } }]),
      () => reply([{ type: "text", text: "BEYOND can't do that one yet." }], "end_turn"),
    ];
    const sheet = await openAlfred();
    await send(sheet, "make today sort of a work day");
    await expect.element(sheet.getByText("BEYOND can't do that one yet.")).toBeVisible();
    expect(JSON.stringify(chats()[1]!.messages)).toContain("couldn't read that request as a card");
    expect(await db.events.where("type").equals("WORK_CONTEXT_SET").count()).toBe(0);
  });
});
