import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";
import { db } from "../../src/persistence/db";

/**
 * SHEETS-FOUNDATION-001 (Gavin, 2026-11-19: "1A"; HARVEST-001 #11): every sheet built on LogSheet wears the visual
 * foundation. The sheet has a thin red top edge and one cut corner; its header is a command bar (red slashes, the red
 * bracket). CHECK IN's scales are numerals; LOG's water amounts are numerals; ALFRED's speakers are mono labels and its
 * proposal cards are framed panels. Same controls, words and saves. Synthetic data only; Alfred's replies are mocked.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const RED = "rgb(208, 20, 27)";
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  await page.viewport(360, 800);
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.anthropic.com/")) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return body.tools
      ? reply([{ type: "text", text: "Here it is to confirm." }, { type: "tool_use", id: "toolu_1", name: "log_sleep", input: { minutes: 420 } }])
      : reply([{ type: "text", text: "Sleep first." }], "end_turn");
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
};
const shot = async (name: string) => { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/sheets-foundation-${name}.png` }); } };

/** The shell every sheet shares: the foundation tokens, the red top edge, the cut corner, the command-bar header. */
function expectFoundationShell(sheet: HTMLElement) {
  expect(sheet.classList.contains("bf")).toBe(true);
  const cs = getComputedStyle(sheet);
  // The palette's red (the HUD's red, or its dimmed "no day" red): the top edge and the bracket are the same red.
  const [r, g, b] = cs.borderTopColor.match(/\d+/g)!.map(Number) as [number, number, number];
  expect(r > 4 * g && r > 4 * b, cs.borderTopColor).toBe(true);
  expect(cs.clipPath).not.toBe("none");
  const head = sheet.querySelector(".log-sheet__header")!;
  expect(getComputedStyle(head, "::before").borderLeftColor).toBe(cs.borderTopColor);
  expect(getComputedStyle(head.querySelector("h2")!, "::before").content).toContain("///");
}
/** Nothing spills, sentences and controls stay 16 px, short mono labels never under 10 px, and axe passes. */
async function expectReadable(sheet: HTMLElement, label: string) {
  for (const width of [320, 412, 1024]) {
    await page.viewport(width, 900); await settle();
    expect(sheet.scrollWidth, `${label} ${width}`).toBeLessThanOrEqual(sheet.clientWidth + 1);
    const small: string[] = [];
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || !el.getClientRects().length || el.closest("svg, details:not([open]) > :not(summary), .visually-hidden")) continue;
      const cs = getComputedStyle(el), isLabel = !el.closest("button, input, select, textarea") && t === t.toUpperCase() && t.length <= 32;
      if (parseFloat(cs.fontSize) < (isLabel ? 10 : 16)) small.push(`${t} (${cs.fontSize})`);
    }
    expect(small, `${label} ${width}`).toEqual([]);
  }
  await page.viewport(360, 800); await settle();
  const result = await axe.run(sheet, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

describe("SHEETS-FOUNDATION-001: the sheets on the foundation", () => {
  it("LOG: the foundation shell, water amounts as numerals, the same save", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Open LOG" }).click();
    const sheet = screen.getByRole("dialog", { name: "LOG" });
    await expect.element(sheet).toBeVisible();
    await shot("log");
    expectFoundationShell(sheet.element() as HTMLElement);
    await sheet.getByRole("button", { name: "WATER", exact: true }).click();
    const water = screen.getByRole("dialog", { name: "WATER" });
    await expect.element(water.getByRole("button", { name: "+16 oz" })).toBeVisible();
    await shot("water");
    const amount = water.getByRole("button", { name: "+16 oz" }).element();
    expect(getComputedStyle(amount).fontFamily).toMatch(/Chakra Petch/);
    expect(parseFloat(getComputedStyle(amount).fontSize)).toBeGreaterThanOrEqual(24);
    await expectReadable(water.element() as HTMLElement, "WATER");
    await water.getByRole("button", { name: "+16 oz" }).click();
    await expect.poll(async () => (await db.events.where("type").equals("WATER_LOGGED").toArray()).length).toBe(1);
  });

  it("CHECK IN: mono scale names, numeral choices, the chosen one marked in red, the same submit", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
    const sheet = screen.getByRole("dialog", { name: "CHECK IN", exact: true });
    await expect.element(sheet).toBeVisible();
    const el = sheet.element() as HTMLElement;
    const energy = sheet.getByRole("group", { name: "Energy" }).last();
    await energy.getByRole("button", { name: "4", exact: true }).click();
    await shot("check-in");
    expectFoundationShell(el);
    const chosen = energy.getByRole("button", { name: "4", exact: true }).element();
    expect(getComputedStyle(chosen).fontFamily).toMatch(/Chakra Petch/);
    expect(parseFloat(getComputedStyle(chosen).fontSize)).toBeGreaterThanOrEqual(24);
    expect(getComputedStyle(chosen).boxShadow).toContain(RED);
    expect(getComputedStyle(el.querySelector(".check-in-scale h3")!).fontFamily).toMatch(/mono|Mono|JetBrains|IBM Plex Mono/i);
    await expectReadable(el, "CHECK IN");
  });

  it("ALFRED: speakers as mono labels with the slashes, a proposal as a framed panel, nothing saved until SAVE", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await expect.element(sheet).toBeVisible();
    await sheet.getByRole("textbox", { name: "Message Alfred" }).fill("I slept 7 hours");
    await sheet.getByRole("button", { name: "SEND", exact: true }).click();
    const card = sheet.getByRole("group", { name: "Log main sleep 7h 00m" });
    await expect.element(card).toBeVisible();
    await shot("alfred");
    expectFoundationShell(sheet.element() as HTMLElement);
    const cardEl = card.element();
    expect(getComputedStyle(cardEl).clipPath).not.toBe("none");
    expect(getComputedStyle(cardEl, "::before").borderTopColor).toBe(RED);
    expect(getComputedStyle(sheet.element().querySelector(".alfred-turn__who")!, "::before").content).toContain("///");
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(0);
    await expectReadable(sheet.element() as HTMLElement, "ALFRED");
  });

  it("SLEEP from TODAY: the shell, and the period arrows keep their own 24 px (the 16 px rule never shrinks a control)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const now = new Date(2026, 9, 21, 22, 10).getTime();
      vi.setSystemTime(now);
      const fixture = syntheticGarminMonth(new Date(2026, 8, 22, 16, 30).getTime(), 30, now);
      await db.beyondDays.bulkAdd(fixture.days); await importSleepSnapshot(fixture.sleep);
      const screen = await render(<App />);
      await screen.getByRole("button", { name: /open sleep$/ }).click();
      const sheet = screen.getByRole("dialog", { name: "SLEEP", exact: true });
      await expect.element(sheet.getByRole("button", { name: "Earlier sleep period" })).toBeVisible();
      expectFoundationShell(sheet.element() as HTMLElement);
      for (const name of ["Earlier sleep period", "Later sleep period"]) {
        expect(getComputedStyle(sheet.getByRole("button", { name }).element()).fontSize, name).toBe("24px");
      }
      await expectReadable(sheet.element() as HTMLElement, "SLEEP");
    } finally { vi.useRealTimers(); }
  });
});
