import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { startDay } from "../../src/application/commands";
import { getHydrationEntries, getSleepEntries } from "../../src/application/queries";

/**
 * ALFRED-ACT-001 (Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo"): a clear low-risk
 * log saves at once and shows "Logged." with a real UNDO button for 10 seconds; the timer never takes focus and holds
 * while UNDO is focused; after it the entry stays. Other kinds keep SAVE/SKIP. 320 px, axe clean. Invented data.
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

const T0 = new Date(2026, 10, 15, 4, 21);
async function openAlfred(withKey = true) {
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
  const day = await startDay();
  vi.setSystemTime(T0);
  if (withKey) localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
  await page.viewport(320, 740);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
  return { day, sheet: screen.getByRole("dialog", { name: "ALFRED" }) };
}
const send = async (sheet: ReturnType<typeof page.getByRole>, text: string) => {
  await sheet.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await sheet.getByRole("button", { name: "SEND", exact: true }).click();
};
const water = async (dayId: string) => (await getHydrationEntries(dayId)).reduce((sum, e) => sum + e.effectiveAmountOz, 0);

describe("ALFRED-ACT-001", () => {
  it("Alfred's clear water log saves at once; UNDO (a real button, never focused for him) takes it back", async () => {
    const { day, sheet } = await openAlfred();
    replies = [() => reply([{ type: "text", text: "Logged 20 oz." }, { type: "tool_use", id: "w1", name: "log_water", input: { oz: 20 } }])];
    await send(sheet, "put down a big glass, twenty ounces");
    const card = sheet.getByRole("group", { name: "Log 20 oz water" });
    await expect.element(card.getByText("Logged.")).toBeVisible();
    await expect.poll(() => water(day.id)).toBe(20);
    const undo = card.getByRole("button", { name: "Undo: Log 20 oz water" });
    await expect.element(undo).toBeVisible();
    await expect.poll(() => document.activeElement).not.toBe(undo.element());
    expect(card.getByRole("button", { name: "SAVE" }).elements()).toHaveLength(0);
    expect((await axe.run(sheet.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    await undo.click();
    await expect.element(card.getByText("Undone. Nothing of it is counted.")).toBeVisible();
    expect(await water(day.id)).toBe(0);
    // Alfred is told what happened: he undid it.
    await send(sheet, "thanks");
    await expect.poll(() => chats().length).toBe(2);
    expect(JSON.stringify(chats()[0]!.system)).toContain("BEYOND itself saves a few clear, low-risk logs at once");
    expect(JSON.stringify(chats()[1]!.messages)).toContain("He tapped UNDO; nothing of it is counted.");
  });

  it("after 10 seconds UNDO is gone and the entry stays; it says where to change it", async () => {
    const { day, sheet } = await openAlfred();
    replies = [() => reply([{ type: "tool_use", id: "w1", name: "log_water", input: { oz: 16 } }])];
    await send(sheet, "sixteen ounces of the wet stuff");
    const card = sheet.getByRole("group", { name: "Log 16 oz water" });
    await expect.element(card.getByRole("button", { name: "Undo: Log 16 oz water" })).toBeVisible();
    vi.setSystemTime(T0.getTime() + 11_000);
    await expect.element(card.getByText("Logged. To change it, use LOG or HISTORY.")).toBeVisible();
    expect(card.getByRole("button", { name: /Undo/ }).elements()).toHaveLength(0);
    expect(await water(day.id)).toBe(16);
  });

  it("keyboard: focusing UNDO holds the timer, and Enter undoes it after the 10 seconds would have run out", async () => {
    const { day, sheet } = await openAlfred(false);
    // The free helper, offline and keyless: the same rule.
    await send(sheet, "drank 24 oz water");
    const card = sheet.getByRole("group", { name: "Log 24 oz water" });
    const undo = card.getByRole("button", { name: "Undo: Log 24 oz water" });
    await expect.element(undo).toBeVisible();
    await expect.poll(() => water(day.id)).toBe(24);
    (undo.element() as HTMLButtonElement).focus();
    await expect.element(card.getByText("held")).toBeVisible();
    vi.setSystemTime(T0.getTime() + 30_000);
    await new Promise((r) => setTimeout(r, 600));
    await expect.element(undo).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await expect.element(card.getByText("Undone. Nothing of it is counted.")).toBeVisible();
    expect(await water(day.id)).toBe(0);
  });

  it("anything else (sleep, a time, a guessed meal) still waits for SAVE", async () => {
    const { day, sheet } = await openAlfred();
    replies = [() => reply([
      { type: "tool_use", id: "s1", name: "log_sleep", input: { minutes: 420 } },
      { type: "tool_use", id: "w1", name: "log_water", input: { oz: 12, time: "03:10" } },
      { type: "tool_use", id: "m1", name: "log_meal", input: { name: "Pizza slice", calories: 300, protein_g: 12 } },
    ])];
    await send(sheet, "slept 7h, 12 oz water at 3:10, slice of pizza");
    for (const name of ["Log main sleep 7h 00m", "Log 12 oz water · at 03:10", "Log Pizza slice · 300 kcal · 12 g protein"]) {
      await expect.element(sheet.getByRole("group", { name }).getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    }
    expect(await water(day.id)).toBe(0);
    expect(await getSleepEntries(day.id)).toEqual([]);
    expect((await axe.run(sheet.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
  });
  it("a failing refresh after an immediate save still shows it saved with UNDO, never a SAVE that would write twice (#560 review note 3)", async () => {
    vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
    const day = await startDay();
    vi.setSystemTime(T0);
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    await page.viewport(320, 740);
    const onSaved = vi.fn(() => { throw new Error("refresh failed"); });
    const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={onSaved} />);
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    replies = [() => reply([{ type: "tool_use", id: "w1", name: "log_water", input: { oz: 20 } }])];
    await send(sheet, "twenty ounces of water");
    const card = sheet.getByRole("group", { name: "Log 20 oz water" });
    await expect.element(card.getByText("Logged.")).toBeVisible();
    expect(onSaved).toHaveBeenCalled();
    expect(card.getByRole("button", { name: "SAVE" }).elements()).toHaveLength(0);
    await expect.element(card.getByRole("button", { name: "Undo: Log 20 oz water" })).toBeVisible();
    expect(await water(day.id)).toBe(20);
  });
});
