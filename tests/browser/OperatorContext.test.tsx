import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { OperatorContextPanel } from "../../src/ui/components/OperatorContextPanel";
import { LifeScreen } from "../../src/ui/screens/more/LifeScreen";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { startDay } from "../../src/application/commands";
import { rememberFact } from "../../src/application/alfred/alfredMemory";
import { createRoutine, modifyRoutine } from "../../src/application/routineCommands";
import { recordMemory } from "../../src/application/memory";
import { db } from "../../src/persistence/db";

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 17)); await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
it("inspects both local memory contracts offline without a key or writes, with accessible bounded sources", async () => {
  const day = await startDay();
  await recordMemory({ dayId: day.id, factId: "quiet", kind: "CONSTRAINT", statement: "Keep the morning quiet", expectedPreviousId: null, action: "CREATED" });
  await db.alfredMemories.add({ id: "old", text: "An old Alfred fact", topic: "OTHER", savedAt: new Date().toISOString() });
  for (let i = 0; i < 8; i++) await rememberFact(`Other fact ${i}`, "OTHER");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetch = vi.spyOn(window, "fetch"); const count = await db.events.count();
  const screen = await render(<OperatorContextPanel active />);
  await screen.getByText("WHAT BEYOND KNOWS", { exact: true }).click();
  await screen.getByText(/Your statements \(/).click();
  await screen.getByRole("button", { name: "INSPECT Keep the morning quiet", exact: true }).click();
  const detail = screen.getByRole("region", { name: "Local source record" });
  await expect.element(detail).toHaveTextContent("BEYOND memory — revision history available");
  expect(document.activeElement).toBe(detail.element());
  await screen.getByRole("button", { name: "CLOSE SOURCE", exact: true }).click();
  await expect.poll(() => document.activeElement?.textContent).toBe("INSPECT Keep the morning quiet");
  await screen.getByRole("button", { name: "INSPECT An old Alfred fact", exact: true }).click();
  await expect.element(detail).toHaveTextContent("no revision history");
  await expect.element(detail).toHaveTextContent("Forget deletes the local entry");
  expect(screen.getByRole("button", { name: /^INSPECT / }).elements()).toHaveLength(5);
  await screen.getByRole("button", { name: "SHOW MORE SOURCES", exact: true }).click();
  expect(screen.getByRole("button", { name: /^INSPECT / }).elements()).toHaveLength(10);
  expect(await db.events.count()).toBe(count); expect(fetch).not.toHaveBeenCalled();
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    expect((await axe.run(screen.container)).violations).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  }
});
it("LIFE Memory opens a confirmed fact's existing correction editor without creating another record", async () => {
  const day = await startDay();
  await recordMemory({ dayId: day.id, factId: "quiet", kind: "CONSTRAINT", statement: "Keep the morning quiet", expectedPreviousId: null, action: "CREATED" });
  const screen = await render(<LifeScreen active initialTab="Memory" />);
  await screen.getByText("WHAT BEYOND KNOWS", { exact: true }).click();
  await screen.getByText(/Your statements \(/).click();
  await screen.getByRole("button", { name: "INSPECT Keep the morning quiet", exact: true }).click();
  await screen.getByRole("button", { name: "OPEN MEMORY EDITOR", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "CORRECT MEMORY", exact: true })).toBeVisible();
  await expect.poll(() => (document.activeElement as HTMLElement)?.dataset.memoryId).toBe("quiet");
  expect(await db.events.where("type").equals("MEMORY_RECORDED").count()).toBe(1);
});
it("drops stale operational conversation history when a routine changes, and bounds oversized requests before sending", async () => {
  await startDay(); localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic");
  const routine = await createRoutine({ title: "Old routine wording", moment: "BEFORE_SHIFT", steps: ["Keys"] });
  const requests: Record<string, unknown>[] = [];
  vi.spyOn(window, "fetch").mockImplementation(async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ id: "synthetic", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text: "Old routine wording" }, { type: "tool_use", id: "water", name: "log_water", input: { oz: 8 } }], stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }), { headers: { "content-type": "application/json" } });
  });
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  const send = async (text: string) => { await screen.getByRole("textbox", { name: "Message Alfred" }).fill(text); await screen.getByRole("button", { name: "SEND", exact: true }).click(); await expect.element(screen.getByText("Alfred is reading your records…", { exact: true })).not.toBeInTheDocument(); };
  await send("Help me with my routine"); await expect.poll(() => requests.length).toBe(1);
  vi.setSystemTime(new Date(2026, 10, 1, 17, 1));
  await modifyRoutine(routine.id, { title: "Corrected routine wording" });
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Your context changed");
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  await send("Use the current records"); await expect.poll(() => requests.length).toBe(2);
  expect(JSON.stringify(requests[1])).not.toContain("Old routine wording");
  expect(JSON.stringify(requests[1])).toContain("Corrected routine wording");
  await send("z".repeat(130_000));
  await expect.element(screen.getByRole("alert")).toHaveTextContent("too large to send safely");
  expect(requests).toHaveLength(2);
});

it("inspects a historical day returned by a read tool outside the initial fourteen-day catalog", async () => {
  const old = await startDay(new Date(2026, 9, 1, 17).toISOString());
  for (let i = 2; i <= 17; i++) await startDay(new Date(2026, 9, i, 17).toISOString());
  localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic"); let calls = 0;
  vi.spyOn(window, "fetch").mockImplementation(async () => {
    calls++;
    const content = calls === 1 ? [{ type: "tool_use", id: "history", name: "get_days", input: { from: "2026-10-01", to: "2026-10-01" } }]
      : [{ type: "text", text: `Your recorded day. [[DAY:${old.id}]]` }];
    return new Response(JSON.stringify({ id: "synthetic-history", type: "message", role: "assistant", model: "claude-haiku-5-5", content, stop_reason: calls === 1 ? "tool_use" : "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }), { headers: { "content-type": "application/json" } });
  });
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await screen.getByRole("textbox", { name: "Message Alfred" }).fill("What happened on October 1?");
  await screen.getByRole("button", { name: "SEND", exact: true }).click();
  await screen.getByRole("button", { name: /^Source: Recorded day/ }).click();
  await expect.element(screen.getByRole("region", { name: "Source record", exact: true })).toHaveTextContent("Current record matches the supplied revision");
  expect(calls).toBe(2);
  expect(screen.getByText("[Source unavailable]", { exact: true }).elements()).toHaveLength(0);
});
