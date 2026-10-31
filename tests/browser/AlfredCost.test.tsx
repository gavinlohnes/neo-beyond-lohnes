import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { AlfredBrief } from "../../src/ui/components/AlfredBrief";
import { addSpend, automaticAlfredOn, capReached, getMonthlyCap, setAutomaticAlfred, setMonthlyCap } from "../../src/application/alfred/alfredSpend";
import { startDay } from "../../src/application/commands";

/** ALFRED-COST-001: a monthly limit and an automatic-Alfred switch. No request is made past either. */
let requests = 0;
beforeEach(async () => {
  await page.viewport(360, 800);
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-cost");
  requests = 0;
  vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    if (!String(input instanceof Request ? input.url : input).startsWith("https://api.anthropic.com/")) throw new Error("Unexpected destination");
    requests++;
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text: "Brief." }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 1000, output_tokens: 50 } }), { headers: { "content-type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); try { localStorage.clear(); } catch { /* ignore */ } });

it("keeps the limit and the switch on this phone, with honest defaults", () => {
  expect(getMonthlyCap()).toBeNull(); expect(capReached()).toBe(false); expect(automaticAlfredOn()).toBe(true);
  setMonthlyCap(5); addSpend(4.99); expect(capReached()).toBe(false);
  addSpend(0.02); expect(capReached()).toBe(true);
  setMonthlyCap(null); expect(capReached()).toBe(false);
  setMonthlyCap(-1); expect(getMonthlyCap()).toBeNull();
  setAutomaticAlfred(false); expect(automaticAlfredOn()).toBe(false);
});

it("at the limit Alfred sends nothing, says why, and keeps your words", async () => {
  setMonthlyCap(1); addSpend(1);
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await screen.getByRole("textbox", { name: "Message Alfred" }).fill("How am I doing?");
  await screen.getByRole("button", { name: "SEND", exact: true }).click();
  await expect.element(screen.getByText("Alfred has reached this month's limit of $1.00", { exact: false })).toBeVisible();
  expect(requests).toBe(0);
  await expect.element(screen.getByRole("textbox", { name: "Message Alfred" })).toHaveValue("How am I doing?");
});

it("sets a limit and turns automatic Alfred off from Limits", async () => {
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await screen.getByRole("button", { name: "Limits" }).click();
  await screen.getByRole("spinbutton", { name: "Monthly limit ($)" }).fill("5");
  await screen.getByRole("button", { name: "SET LIMIT" }).click();
  expect(getMonthlyCap()).toBe(5);
  await expect.element(screen.getByText("of $5.00", { exact: false }).first()).toBeVisible();
  await screen.getByRole("checkbox", { name: "Automatic Alfred: write TODAY's brief and the weekly review on his own" }).click();
  expect(automaticAlfredOn()).toBe(false);
  await expect.element(screen.getByText("Off. Alfred only speaks when you open him and ask.")).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(requests).toBe(0);
});

it("with automatic Alfred off, TODAY's brief makes no request and shows no old brief", async () => {
  await startDay();
  localStorage.setItem("beyond.alfredBrief", JSON.stringify({ text: "An old brief.", at: new Date().toISOString(), sig: "x" }));
  setAutomaticAlfred(false);
  const screen = await render(<AlfredBrief active refreshKey={1} onOpen={() => {}} />);
  await new Promise((r) => setTimeout(r, 300));
  expect(requests).toBe(0);
  expect(screen.container.textContent).not.toContain("An old brief.");
});

it("at the limit TODAY's brief makes no request", async () => {
  await startDay();
  setMonthlyCap(1); addSpend(2);
  await render(<AlfredBrief active refreshKey={1} onOpen={() => {}} />);
  await new Promise((r) => setTimeout(r, 300));
  expect(requests).toBe(0);
});
