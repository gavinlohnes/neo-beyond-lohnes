import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { MemoryPanel } from "../../src/ui/components/MemoryPanel";
import { AlfredMemoryList } from "../../src/ui/components/AlfredMemoryList";
import { getMemoryFacts } from "../../src/application/memory";
import { getMemories } from "../../src/application/alfred/alfredMemory";
import { db } from "../../src/persistence/db";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("saves and corrects global facts offline without a day, then stops using and restores with retained history", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetch = vi.spyOn(window, "fetch");
  const screen = await render(<MemoryPanel />);
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await screen.getByRole("combobox", { name: "Applies to" }).selectOptions("PERSONAL_FACT");
  await screen.getByRole("combobox", { name: "About", exact: true }).selectOptions("HOME");
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Filter size 16x25x1");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY" }).click();
  await expect.element(screen.getByRole("article")).toHaveTextContent("Filter size 16x25x1");
  await screen.getByText("Inspect or fix this memory", { exact: true }).click();
  await screen.getByRole("button", { name: "CORRECT MEMORY" }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Filter size 20x25x1");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY" }).click();
  await expect.element(screen.getByRole("article")).toHaveTextContent("Filter size 20x25x1");
  await screen.getByText("Inspect or fix this memory", { exact: true }).click();
  await screen.getByRole("button", { name: "STOP USING", exact: true }).click();
  await expect.poll(() => getMemories().then((m) => m.length)).toBe(0);
  await screen.getByRole("button", { name: "RESTORE & CONFIRM" }).click();
  await expect.poll(() => getMemories().then((m) => m.length)).toBe(1);
  expect((await getMemoryFacts())[0]!.history).toHaveLength(4);
  expect(await db.beyondDays.count()).toBe(0); expect(fetch).not.toHaveBeenCalled();
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800); expect((await axe.run(screen.container)).violations).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  }
});
it("requires a reviewed individual conversion, keeps long drafts and rejects stale original evidence", async () => {
  await db.alfredMemories.add({ id: "legacy", text: "z".repeat(400), topic: "PERSON", savedAt: "2026-01-01T12:00:00.000Z" });
  const screen = await render(<><MemoryPanel /><AlfredMemoryList active /></>);
  await screen.getByText("Original Alfred entries (1)", { exact: true }).click();
  await screen.getByRole("button", { name: "REVIEW CONVERSION" }).click();
  await expect.element(screen.getByRole("button", { name: "CONVERT & CONFIRM THIS ENTRY" })).toBeDisabled();
  await screen.getByRole("textbox", { name: "Destination wording" }).fill("Operator chooses shorter words");
  expect(await getMemoryFacts()).toEqual([]);
  await db.alfredMemories.update("legacy", { text: "Changed elsewhere" });
  await screen.getByRole("button", { name: "CONVERT & CONFIRM THIS ENTRY" }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Original memory changed");
  await expect.element(screen.getByRole("textbox", { name: "Destination wording" })).toHaveValue("Operator chooses shorter words");
  await screen.getByRole("button", { name: "DISCARD CONVERSION DRAFT" }).click();
  await screen.getByRole("button", { name: "REVIEW CONVERSION" }).click();
  await screen.getByRole("button", { name: "CONVERT & CONFIRM THIS ENTRY" }).click();
  await expect.poll(() => getMemoryFacts().then((f) => f.length)).toBe(1);
  expect(await db.alfredMemories.count()).toBe(1);
  expect((await getMemories())[0]!.reference!.source).toBe("PERSONAL_FACT");
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("drops retired facts and old model transcript before the next request; pending sibling cards cannot revive them", async () => {
  const { AlfredSheet } = await import("../../src/ui/components/AlfredSheet");
  const { rememberFact, stopUsingMemory } = await import("../../src/application/alfred/alfredMemory");
  const memory = await rememberFact("Synthetic private keepsake", "OTHER");
  localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic");
  const requests: unknown[] = [];
  vi.spyOn(window, "fetch").mockImplementation(async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: "synthetic", type: "message", role: "assistant", model: "claude-haiku-5-5",
      content: requests.length === 1 ? [{ type: "text", text: "Synthetic private keepsake" }, { type: "tool_use", id: "water", name: "log_water", input: { oz: 8 } }] : [{ type: "text", text: "Fresh answer" }],
      stop_reason: requests.length === 1 ? "tool_use" : "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }), { headers: { "content-type": "application/json" } });
  });
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  const send = async (text: string) => { await screen.getByRole("textbox", { name: "Message Alfred" }).fill(text); await screen.getByRole("button", { name: "SEND", exact: true }).click(); };
  await send("Help me review"); await expect.element(screen.getByText("Synthetic private keepsake", { exact: true })).toBeVisible();
  await stopUsingMemory(memory.reference!);
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText(/changed/).last()).toBeVisible();
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  await send("Help again"); await expect.element(screen.getByText("Fresh answer", { exact: true })).toBeVisible();
  expect(JSON.stringify(requests[0])).toContain("Synthetic private keepsake");
  expect(JSON.stringify(requests[1])).not.toContain("Synthetic private keepsake");
  localStorage.removeItem("beyond.alfredKey");
});
