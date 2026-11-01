import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** FREE-HELPER-001 in Alfred's sheet: free first, Alfred only when needed. Invented data only. */
let requests = 0;
beforeEach(async () => {
  await page.viewport(360, 800);
  try { localStorage.clear(); } catch { /* ignore */ }
  requests = 0;
  vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    if (!String(input instanceof Request ? input.url : input).startsWith("https://api.anthropic.com/")) throw new Error("Unexpected destination");
    requests++;
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text: "Alfred here." }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } }), { headers: { "content-type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); try { localStorage.clear(); } catch { /* ignore */ } });
const send = async (screen: Awaited<ReturnType<typeof render>>, text: string) => {
  await screen.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await screen.getByRole("button", { name: "SEND", exact: true }).click();
};

it("logs and answers for free with no key and no signal; SAVE writes through BEYOND's own commands", async () => {
  await startDay();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "16 oz water and slept 6h");
  await expect.element(screen.getByText("BEYOND · FREE")).toBeVisible();
  await screen.getByRole("group", { name: "Log 16 oz water" }).getByRole("button", { name: "SAVE" }).click();
  await expect.poll(() => db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  await send(screen, "how much water today?");
  await expect.element(screen.getByText("Water today: 16 oz.")).toBeVisible();
  expect(requests).toBe(0);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});

it("does what it can without Alfred and says plainly what's left", async () => {
  await startDay();
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "16 oz water and ate a burger");
  await expect.element(screen.getByRole("group", { name: "Log 16 oz water" })).toBeVisible();
  await expect.element(screen.getByText(/I couldn't do “ate a burger”\. Alfred needs a Claude key/)).toBeVisible();
  expect(requests).toBe(0);
});

it("hands anything it isn't sure of to Alfred when he's available", async () => {
  await startDay();
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-free");
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "16 oz water");
  await expect.element(screen.getByText("BEYOND · FREE")).toBeVisible();
  expect(requests).toBe(0);
  await send(screen, "16 oz water and ate a burger");
  await expect.element(screen.getByText("Alfred here.")).toBeVisible();
  expect(requests).toBe(1);
});

it("the on-phone AI check only asks the browser and reports plainly", async () => {
  const { checkOnPhoneAi } = await import("../../src/ui/components/AiCheck");
  const r = await checkOnPhoneAi();
  expect(Object.keys(r)).toEqual(["builtIn", "webgpu", "memory"]);
  expect(r.builtIn.length).toBeGreaterThan(0);
  expect(requests).toBe(0);
});
