import { App } from "../../src/app/App";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, cdp } from "vitest/browser";
import axe from "axe-core";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { MemoryPanel } from "../../src/ui/components/MemoryPanel";
import { WorkPreparation } from "../../src/ui/components/WorkPreparation";
import { startDay } from "../../src/application/commands";
import { createMission } from "../../src/application/intentCommands";
import { getMemoryFacts, recordMemory } from "../../src/application/memory";
import { db } from "../../src/persistence/db";

let requests: Record<string, unknown>[] = [], responses: (() => Promise<Response> | Response)[] = [];
const response = (text: string, tool?: { name: string; input: unknown }) => new Response(JSON.stringify({ id: "msg_context", type: "message", role: "assistant", model: "claude-haiku-5-5", content: tool ? [{ type: "tool_use", id: "call1", ...tool }] : [{ type: "text", text }], stop_reason: tool ? "tool_use" : "end_turn", stop_sequence: null, usage: { input_tokens: 100, output_tokens: 20 } }), { headers: { "content-type": "application/json" } });
const fact = (dayId: string) => recordMemory({ dayId, factId: "quiet", kind: "CONSTRAINT", statement: "Keep my first morning quiet.", action: "CREATED", expectedPreviousId: null });
const show = () => render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
const send = async (screen: Awaited<ReturnType<typeof show>>, text: string, wait = true) => {
  await screen.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await screen.getByRole("button", { name: "SEND", exact: true }).click();
  if (wait) await expect.element(screen.getByText("Alfred is reading your records…", { exact: true })).not.toBeInTheDocument();
};
const optIn = async (screen: Awaited<ReturnType<typeof show>>) => {
  await screen.getByText("CONTEXT & SOURCES", { exact: true }).click();
  await screen.getByRole("checkbox", { name: "Include my Missions and confirmed personal memory in this conversation" }).click();
};
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17));
  await page.viewport(360, 800); localStorage.setItem("beyond.alfredKey", "sk-ant-test-context");
  requests = []; responses = [];
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    if (!String(input instanceof Request ? input.url : input).startsWith("https://api.anthropic.com/")) throw new Error("Unexpected destination");
    requests.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
    return (responses.shift() ?? (() => response("Ready.")))();
  });
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });

it("keeps direction and constraints correctable offline without leaking them into PREP", async () => {
  await startDay(); const screen = await render(<MemoryPanel scope="PERSONAL" />);
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await screen.getByRole("combobox", { name: "Applies to" }).selectOptions("CONSTRAINT");
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Keep my first morning quiet.");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY" }).click();
  await expect.element(screen.getByText("Keep my first morning quiet.", { exact: true }).first()).toBeVisible();
  await screen.getByText("Inspect or fix this memory").click();
  await screen.getByRole("button", { name: "CORRECT MEMORY" }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Keep my afternoon quiet.");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY" }).click();
  await expect.poll(async () => (await getMemoryFacts())[0]?.statement).toBe("Keep my afternoon quiet.");
  const day = (await db.beyondDays.toArray())[0]!;
  await cleanup();
  const prep = await render(<WorkPreparation dayId={day.id} beforeWork active />);
  await prep.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
  expect(prep.getByRole("dialog", { name: "PREPARATION", exact: true }).element().textContent).not.toContain("Keep my afternoon quiet");
  expect(requests).toHaveLength(0); expect(await db.obligations.count()).toBe(0);
});

it("opts in explicitly, supplies source-linked context and inspects a cited record at 360px", async () => {
  const day = await startDay(); const saved = await fact(day.id); await createMission({ title: "More energy outside work" });
  const screen = await show();
  await send(screen, "Hello"); await expect.poll(() => requests.length).toBe(1);
  expect(JSON.stringify(requests[0])).not.toContain("Keep my first morning quiet");
  await optIn(screen);
  responses.push(() => response("You asked to keep the morning quiet. [[MEMORY:quiet]] [[invented:key]]"));
  await screen.getByRole("button", { name: "Plan my next days off", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Source: Keep my first morning quiet." })).toBeVisible();
  expect(JSON.stringify(requests.at(-1))).toContain("More energy outside work");
  expect(JSON.stringify(requests.at(-1))).toContain("Keep my first morning quiet");
  await screen.getByRole("button", { name: "Source: Keep my first morning quiet." }).click();
  const source = screen.getByRole("region", { name: "Source record", exact: true });
  await expect.element(source).toHaveTextContent("Current record matches the supplied revision");
  await expect.element(screen.getByText("[Source unavailable]", { exact: true })).toBeVisible();
  expect((await getMemoryFacts())[0]!.id).toBe(saved.id);
  expect((await axe.run(screen.getByRole("dialog", { name: "ALFRED" }).element())).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
});

it("removes superseded text from the actual next request and resets history after opt-out", async () => {
  const day = await startDay(), first = await fact(day.id); const screen = await show(); await optIn(screen);
  responses.push(() => response("Keep my first morning quiet."));
  await send(screen, "Plan my time"); await expect.element(screen.getByText("Keep my first morning quiet.", { exact: true }).last()).toBeVisible();
  await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "CORRECTED", statement: "Keep my second morning quiet." });
  await send(screen, "Use my current constraint"); await expect.poll(() => requests.length).toBe(2);
  expect(JSON.stringify(requests.at(-1))).not.toContain("Keep my first morning quiet");
  expect(JSON.stringify(requests.at(-1))).toContain("Keep my second morning quiet");
  await screen.getByRole("checkbox", { name: "Include my Missions and confirmed personal memory in this conversation" }).click();
  responses.push(() => response("", { name: "search_records", input: { query: "morning quiet" } }), () => response("No matching active context."));
  await send(screen, "Search for morning quiet"); await expect.poll(() => requests.length).toBe(4);
  expect(JSON.stringify(requests.at(-1))).not.toContain("Keep my second morning quiet");
  expect(JSON.stringify(requests.at(-1))).toContain("No records match");
});

it("rejects a stale proposal, then confirms one fresh action exactly once", async () => {
  const day = await startDay(), first = await fact(day.id); const screen = await show(); await optIn(screen);
  responses.push(() => response("", { name: "log_water", input: { oz: 8 } }));
  await send(screen, "Log eight ounces");
  const save = screen.getByRole("group", { name: "Log 8 oz water" }).getByRole("button", { name: "SAVE" });
  await expect.element(save).toBeVisible();
  await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "IRRELEVANT" });
  await save.click(); await expect.element(screen.getByRole("alert")).toHaveTextContent("Your context changed");
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  responses.push(() => response("", { name: "log_water", input: { oz: 8 } }));
  await send(screen, "Try again"); await expect.element(screen.getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
  const button = screen.getByRole("button", { name: "SAVE", exact: true }).element() as HTMLButtonElement;
  button.click(); button.click();
  await expect.poll(() => db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
});

it("does not present an answer whose personal sources changed while Claude was answering", async () => {
  const day = await startDay(), first = await fact(day.id); const screen = await show(); await optIn(screen);
  let release: ((r: Response) => void) | undefined;
  responses.push(() => new Promise<Response>((resolve) => { release = resolve; }));
  await send(screen, "Plan my time", false); await expect.poll(() => !!release).toBe(true);
  await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "IRRELEVANT" });
  release!(response("Stale answer must not appear."));
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Your context changed");
  expect(screen.getByText("Stale answer must not appear.").elements()).toHaveLength(0);
  expect(await db.obligations.count()).toBe(0);
});

it("keeps an old card bound to its original lived day after asking another question", async () => {
  await startDay(); const screen = await show();
  responses.push(() => response("", { name: "log_water", input: { oz: 8 } }));
  await send(screen, "Log eight ounces");
  await expect.element(screen.getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
  vi.setSystemTime(new Date(2026, 10, 1, 17)); await startDay();
  await send(screen, "What is my schedule now?");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Your context changed");
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
});

it("opens the exact original memory from an answer for correction through the canonical route", async () => {
  const day = await startDay(); await fact(day.id);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred", exact: true }).first().click();
  const sheet = screen.getByRole("dialog", { name: "ALFRED", exact: true });
  await sheet.getByText("CONTEXT & SOURCES", { exact: true }).click();
  await sheet.getByRole("checkbox").click();
  responses.push(() => response("Your constraint. [[MEMORY:quiet]]"));
  await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("Help me plan");
  await sheet.getByRole("button", { name: "SEND", exact: true }).click();
  await sheet.getByRole("button", { name: "Source: Keep my first morning quiet." }).click();
  const source = sheet.getByRole("region", { name: "Source record", exact: true });
  await source.getByRole("button", { name: "OPEN ORIGINAL RECORD", exact: true }).click();
  await expect.element(sheet).not.toBeVisible();
  const memory = screen.getByRole("region", { name: "What BEYOND should remember", exact: true });
  await expect.element(memory.getByRole("button", { name: "CORRECT MEMORY", exact: true })).toBeVisible();
  expect((document.activeElement as HTMLElement).dataset.memoryId).toBe("quiet");
});
