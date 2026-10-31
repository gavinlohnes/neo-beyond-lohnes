import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { captureItem, startDay } from "../../src/application/commands";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { getDays, searchRecords } from "../../src/application/alfred/alfredSearch";
import { db } from "../../src/persistence/db";
import { formatLocalDate } from "../../src/engine/scheduledContext";

/** ALFRED-004: Alfred remembers, searches the whole history, reads periods, talks back, and debriefs. */
let requests: Record<string, unknown>[] = [];
const chats = () => requests.filter((b) => b.tools);
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
let replies: (() => Response)[] = [];
beforeEach(async () => {
  await page.viewport(412, 915);
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
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openAlfred() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
  return { screen, sheet: screen.getByRole("dialog", { name: "ALFRED" }) };
}

describe("ALFRED-004 memory", () => {
  it("keeps a fact on SAVE, carries it into his records, and forgets it on the owner's word", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [() => reply([{ type: "tool_use", id: "t1", name: "remember", input: { text: "Sam's birthday is March 3", topic: "PERSON" } }])];
    const { sheet } = await openAlfred();
    await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("remember Sam's birthday is March 3");
    await sheet.getByRole("button", { name: "SEND", exact: true }).click();
    await sheet.getByRole("group", { name: "Remember (person): Sam's birthday is March 3" }).getByRole("button", { name: "SAVE" }).click();
    await expect.poll(() => db.alfredMemories.count()).toBe(1);
    expect(await buildAlfredContext()).toMatch(/WHAT HE ASKED YOU TO REMEMBER.*PERSON: Sam's birthday is March 3/);
    await sheet.getByRole("button", { name: "Memory" }).click();
    const list = sheet.getByRole("group", { name: "What Alfred remembers" });
    await expect.element(list).toHaveTextContent("Sam's birthday is March 3");
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    await list.getByRole("button", { name: "Forget: Sam's birthday is March 3" }).click();
    await expect.poll(() => db.alfredMemories.count()).toBe(0);
  });
});

describe("ALFRED-004 reading the whole history", () => {
  it("runs search_records himself and answers from what it found", async () => {
    await startDay();
    await captureItem("Called the CPAP supply place about a new mask");
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    replies = [
      () => reply([{ type: "tool_use", id: "r1", name: "search_records", input: { query: "CPAP" } }]),
      () => reply([{ type: "text", text: "You last noted the CPAP place today." }], "end_turn"),
    ];
    const { sheet } = await openAlfred();
    await sheet.getByRole("button", { name: "When did I last…?" }).click();
    await expect.element(sheet.getByRole("textbox", { name: "Message Alfred" })).toHaveValue("When did I last ");
    await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("When did I last call the CPAP place?");
    await sheet.getByRole("button", { name: "SEND", exact: true }).click();
    await expect.element(sheet.getByText("You last noted the CPAP place today.")).toBeVisible();
    expect(chats()).toHaveLength(2);
    const result = JSON.stringify((chats()[1]!.messages as { content: unknown }[]).at(-1)!.content);
    expect(result).toContain("tool_result");
    expect(result).toContain("CPAP supply place");
    expect(sheet.element().querySelectorAll(".alfred-card")).toHaveLength(0);
  });

  it("search and get_days read stored records only", async () => {
    const day = await startDay();
    await captureItem("Bench felt strong");
    expect(await searchRecords("bench strong")).toMatch(/^1 match for "bench strong"/);
    expect(await searchRecords("nothing-like-this")).toBe('No records match "nothing-like-this".');
    const around = (d: number) => formatLocalDate(new Date(new Date(day.startedAt).getTime() + d * 86_400_000));
    expect(await getDays(around(-1), around(1))).toMatch(/^1 lived days/);
    expect(await getDays("1999-01-01", "1999-01-07")).toMatch(/^No BEYOND days/);
  });
});

describe("ALFRED-004 talk mode and starters", () => {
  it("offers the debrief and the planning starters; Speak answers is remembered", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const { sheet } = await openAlfred();
    await expect.element(sheet.getByRole("button", { name: "DEBRIEF MY SHIFT" })).toBeVisible();
    for (const name of ["Weekly review", "Plan my flip", "Meal plan + grocery list"]) await expect.element(sheet.getByRole("button", { name })).toBeVisible();
    await sheet.getByRole("button", { name: "Speak answers" }).click();
    await expect.element(sheet.getByRole("button", { name: "Speaking answers" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("beyond.alfredSpeak")).toBe("1");
    await sheet.getByRole("button", { name: "Weekly review" }).click();
    await expect.poll(() => chats().length).toBe(1);
    expect(JSON.stringify(chats()[0]!.messages)).toContain("weekly review");
  });
});
