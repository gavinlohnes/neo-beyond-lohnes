import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { setWorkContext, startDay } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { AlfredBrief, briefIsDue, briefSignature } from "../../src/ui/components/AlfredBrief";
import { db } from "../../src/persistence/db";

/** ALFRED-003: everyday Alfred is cheap, THINK HARDER is deep, he can do what the buttons do, and TODAY opens on his brief. */
let requests: Record<string, unknown>[] = [];
const chats = () => requests.filter((b) => b.tools);
const briefs = () => requests.filter((b) => !b.tools);
function reply(content: unknown[], stop = "tool_use") {
  return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content, stop_reason: stop, stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }), { headers: { "content-type": "application/json" } });
}
let next: () => Response;
beforeEach(async () => {
  await page.viewport(412, 915);
  requests = [];
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.anthropic.com/")) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push(body);
    return body.tools ? next() : reply([{ type: "text", text: "Sleep first: the shift starts 18:00 and nothing is logged since you woke." }], "end_turn");
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openAlfred() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Ask Alfred" }).first().click();
  return { screen, sheet: screen.getByRole("dialog", { name: "ALFRED" }) };
}
async function say(sheet: ReturnType<Awaited<ReturnType<typeof openAlfred>>["screen"]["getByRole"]>, text: string, button = "SEND") {
  await sheet.getByRole("textbox", { name: "Message Alfred" }).fill(text);
  await sheet.getByRole("button", { name: button, exact: true }).click();
}

describe("ALFRED-003 go cheap", () => {
  it("answers on the everyday model; THINK HARDER sends that one question to the deep model with the fallback", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    next = () => reply([{ type: "text", text: "Here's the plan." }], "end_turn");
    const { sheet } = await openAlfred();
    await say(sheet, "how's my week");
    await expect.element(sheet.getByText("Here's the plan.")).toBeVisible();
    await say(sheet, "plan my flip to days", "THINK HARDER");
    await expect.element(sheet.getByText("YOU · THINK HARDER")).toBeVisible();
    await expect.poll(() => chats().length).toBe(2);
    expect(chats()[0]!.model).toBe("claude-haiku-5-5");
    expect(chats()[0]!.betas).toBeUndefined();
    expect(chats()[1]!.model).toBe("claude-opus-5-5");
    expect(chats()[1]!.fallbacks).toBe("default");
    expect((await axe.run(sheet.element())).violations).toEqual([]);
  });
});

describe("ALFRED-003 Alfred can do it", () => {
  it("check-in, task done and a new date run BEYOND's own commands on SAVE", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const call = await createObligation({ title: "Call the bank", dueAt: "2026-11-02" });
    const pay = await createObligation({ title: "Pay the car", dueAt: "2026-11-03" });
    expect(await buildAlfredContext()).toContain(`[${call.id}] "Call the bank" due 2026-11-02`);
    next = () => reply([
      { type: "tool_use", id: "t1", name: "check_in", input: { energy: 2, stress: 3, mood: 3, soreness: 1, alcohol_urge: 0 } },
      { type: "tool_use", id: "t2", name: "task_done", input: { task_id: call.id, title: "Call the bank" } },
      { type: "tool_use", id: "t3", name: "task_new_date", input: { task_id: pay.id, title: "Pay the car", due_date: "2026-11-05" } },
    ]);
    const { sheet } = await openAlfred();
    await say(sheet, "tired, a bit stressed, called the bank, push the car payment to the 5th");
    await sheet.getByRole("group", { name: /^Check in · energy 2/ }).getByRole("button", { name: "SAVE" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(1);
    await sheet.getByRole("group", { name: "Done: Call the bank" }).getByRole("button", { name: "SAVE" }).click();
    await expect.poll(async () => (await db.obligations.get(call.id))?.status).toBe("SATISFIED");
    await sheet.getByRole("group", { name: "New date: Pay the car · 2026-11-05" }).getByRole("button", { name: "SAVE" }).click();
    await expect.poll(async () => (await db.obligations.get(pay.id))?.dueAt).toBe("2026-11-05");
  });

  it("says why when the record can't apply, and changes nothing", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    next = () => reply([{ type: "tool_use", id: "t1", name: "work_ended", input: {} }]);
    const { sheet } = await openAlfred();
    await say(sheet, "shift's done");
    await sheet.getByRole("group", { name: "Work ended" }).getByRole("button", { name: "SAVE" }).click();
    await expect.element(sheet.getByRole("alert")).toHaveTextContent("Today isn't set as a work day");
    expect(await db.events.where("type").equals("WORK_PERIOD_ENDED").count()).toBe(0);
  });

  it("OPEN takes him to TRAIN for today's workout", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    next = () => reply([{ type: "tool_use", id: "t1", name: "open_training", input: {} }]);
    const { screen, sheet } = await openAlfred();
    await say(sheet, "let's lift");
    await sheet.getByRole("group", { name: "Open TRAIN for today's workout" }).getByRole("button", { name: "OPEN" }).click();
    await expect.element(screen.getByRole("dialog", { name: "ALFRED" })).not.toBeInTheDocument();
    await expect.poll(() => document.getElementById("workspace-TRAIN")?.hidden).toBe(false);
  });
});

describe("ALFRED-003 brief on TODAY", () => {
  it("leads TODAY with Alfred's brief; tapping it opens Alfred; it isn't rewritten while the records hold", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const screen = await render(<App />);
    const brief = screen.getByRole("region", { name: "Alfred's brief" });
    await expect.element(brief).toHaveTextContent("Sleep first: the shift starts 18:00");
    expect(briefs()[0]!.model).toBe("claude-haiku-5-5");
    expect(JSON.parse(localStorage.getItem("beyond.alfredBrief")!).text).toMatch(/^Sleep first/);
    // TODAY fades in; read contrast once the fade has finished (CI read it mid-fade).
    for (const animation of document.getAnimations()) animation.finish();
    expect((await axe.run(brief.element())).violations).toEqual([]);
    await brief.getByRole("button").click();
    await expect.element(screen.getByRole("dialog", { name: "ALFRED" })).toBeVisible();
  });

  it("shows nothing without a Claude key", async () => {
    await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("region", { name: "Day mode" })).toBeVisible();
    expect(screen.container.querySelector(".alfred-brief")).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it("rewrites when the records change (at most every 10 minutes) or after 3 hours; the clock alone doesn't count", () => {
    const sig = briefSignature("NOW: Sat 03:10\nFOOD TODAY: 40 g");
    expect(briefSignature("NOW: Sat 03:44\nFOOD TODAY: 40 g")).toBe(sig);
    expect(briefSignature("NOW: Sat 03:10\nFOOD TODAY: 70 g")).not.toBe(sig);
    const at = new Date("2026-10-31T03:00:00Z");
    const stored = { text: "x", at: at.toISOString(), sig };
    expect(briefIsDue(null, sig, at.getTime())).toBe(true);
    expect(briefIsDue(stored, sig, at.getTime() + 60 * 60_000)).toBe(false);
    expect(briefIsDue(stored, "other", at.getTime() + 5 * 60_000)).toBe(false);
    expect(briefIsDue(stored, "other", at.getTime() + 11 * 60_000)).toBe(true);
    expect(briefIsDue(stored, sig, at.getTime() + 3 * 60 * 60_000)).toBe(true);
  });
  // Last in the file: it opens the database without the shell, which a later App render here does not expect.
  it("keeps the brief it wrote while the records hold; no second call", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const first = await render(<AlfredBrief active refreshKey={0} onOpen={() => {}} />);
    await expect.element(first.getByRole("region", { name: "Alfred's brief" })).toHaveTextContent("Sleep first");
    first.unmount();
    const second = await render(<AlfredBrief active refreshKey={1} onOpen={() => {}} />);
    await expect.element(second.getByRole("region", { name: "Alfred's brief" })).toHaveTextContent("Sleep first");
    await new Promise((r) => setTimeout(r, 300));
    expect(briefs()).toHaveLength(1);
  });

});
