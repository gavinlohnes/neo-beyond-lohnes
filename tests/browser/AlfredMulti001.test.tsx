import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { startDay } from "../../src/application/commands";
import { getHydrationEntries, getSleepEntries } from "../../src/application/queries";

/**
 * ALFRED-MULTI-001: one message, several records. The clear low-risk ones save at once, each with its own UNDO; the
 * rest wait for SAVE; more than 5 at once and none save at once, and he is told. 320 px, axe clean. Invented data.
 */
let replies: (() => Response)[] = [];
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  replies = [];
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.anthropic.com/")) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    if (!body.tools) return reply([{ type: "text", text: "Brief." }], "end_turn");
    return (replies.shift() ?? (() => reply([{ type: "text", text: "Done." }], "end_turn")))();
  });
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); try { localStorage.clear(); } catch { /* ignore */ } });

const T0 = new Date(2026, 10, 15, 4, 21);
async function openAlfred(withKey: boolean) {
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

describe("ALFRED-MULTI-001", () => {
  it("free helper: two waters save at once, each with its own UNDO; sleep and the reminder wait for SAVE", async () => {
    const { day, sheet } = await openAlfred(false);
    await send(sheet, "drank 16 oz water, 8 oz water, slept 7h and remind me to call mum tomorrow");
    await expect.element(sheet.getByText("Logged 2 at once (UNDO within 10 seconds). SAVE the others you want.")).toBeVisible();
    await expect.poll(() => water(day.id)).toBe(24);
    const a = sheet.getByRole("group", { name: "Log 16 oz water" }), b = sheet.getByRole("group", { name: "Log 8 oz water" });
    await expect.element(b.getByRole("button", { name: "Undo: Log 8 oz water" })).toBeVisible();
    await expect.element(sheet.getByRole("group", { name: "Log main sleep 7h 00m" }).getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    await expect.element(sheet.getByRole("group", { name: /^Remind: Call mum/ }).getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    expect(await getSleepEntries(day.id)).toEqual([]);
    expect((await axe.run(sheet.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    // Undo only the second: the first stays.
    await b.getByRole("button", { name: "Undo: Log 8 oz water" }).click();
    await expect.element(b.getByText("Undone. Nothing of it is counted.")).toBeVisible();
    expect(await water(day.id)).toBe(16);
    await expect.element(a.getByRole("button", { name: "Undo: Log 16 oz water" })).toBeVisible();
  });

  it("more than 5 logs in one message: none save at once, all wait for SAVE, and it says so", async () => {
    const { day, sheet } = await openAlfred(false);
    await send(sheet, "4 oz water, 6 oz water, 8 oz water, 10 oz water, 12 oz water, 14 oz water");
    await expect.element(sheet.getByText("That's more than 5 logs in one message, so BEYOND saved none of them at once. SAVE the ones you want.")).toBeVisible();
    for (const oz of [4, 6, 8, 10, 12, 14]) await expect.element(sheet.getByRole("group", { name: `Log ${oz} oz water` }).getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    expect(await water(day.id)).toBe(0);
  });

  it("Alfred: several cards from one message keep their order; over the cap he is told on the reply", async () => {
    const { day, sheet } = await openAlfred(true);
    replies = [() => reply([1, 2, 3, 4, 5, 6].map((n) => ({ type: "tool_use", id: `w${n}`, name: "log_water", input: { oz: n * 2 + 2 } })))];
    await send(sheet, "log these waters: 4, 6, 8, 10, 12 and 14 oz");
    await expect.element(sheet.getByText("That's more than 5 logs in one message, so BEYOND saved none of them at once. SAVE the ones you want.")).toBeVisible();
    const names = (await sheet.getByRole("group", { name: /^Log \d+ oz water$/ }).elements()).map((e) => e.getAttribute("aria-label"));
    expect(names).toEqual([4, 6, 8, 10, 12, 14].map((oz) => `Log ${oz} oz water`));
    expect(await water(day.id)).toBe(0);
  });
  it("a failing refresh after several immediate saves keeps every one saved with its UNDO; no SAVE that would write twice", async () => {
    vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
    const day = await startDay();
    vi.setSystemTime(T0);
    await page.viewport(320, 740);
    const onSaved = vi.fn(() => { throw new Error("refresh failed"); });
    const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={onSaved} />);
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await send(sheet, "drank 16 oz water, 8 oz water and slept 7h");
    await expect.element(sheet.getByText("Logged 2 at once (UNDO within 10 seconds). SAVE the others you want.")).toBeVisible();
    expect(onSaved).toHaveBeenCalled();
    for (const oz of [16, 8]) {
      const card = sheet.getByRole("group", { name: `Log ${oz} oz water` });
      await expect.element(card.getByRole("button", { name: `Undo: Log ${oz} oz water` })).toBeVisible();
      expect(card.getByRole("button", { name: "SAVE" }).elements()).toHaveLength(0);
    }
    expect(sheet.getByText(/couldn't check these/).elements()).toHaveLength(0);
    await expect.element(sheet.getByRole("group", { name: "Log main sleep 7h 00m" }).getByRole("button", { name: "SAVE", exact: true })).toBeVisible();
    expect(await water(day.id)).toBe(24);
  });
});
