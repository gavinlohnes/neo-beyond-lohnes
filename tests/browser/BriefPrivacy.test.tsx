import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { AlfredBrief, briefSignature } from "../../src/ui/components/AlfredBrief";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { rememberFact, stopUsingMemory } from "../../src/application/alfred/alfredMemory";
import { recordMemory } from "../../src/application/memory";
import { writeAlfredBrief } from "../../src/application/alfred/alfredClient";
vi.mock("../../src/application/alfred/alfredClient", () => ({ writeAlfredBrief: vi.fn() }));
const STORE = "beyond.alfredBrief";
beforeEach(() => { localStorage.clear(); localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic"); vi.mocked(writeAlfredBrief).mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it.each([["retire", "beyond:memory-changed"], ["correct", "beyond:memory-changed"], ["retire", "focus"]] as const)("hides a %s cached fact offline after %s without bypassing the cost gate", async (action, event) => {
  const m = await rememberFact("Private old wording", "OTHER");
  localStorage.setItem(STORE, JSON.stringify({ text: "Private old wording", at: new Date().toISOString(), sig: briefSignature(await buildAlfredContext()) }));
  const screen = await render(<AlfredBrief active refreshKey={0} onOpen={() => {}} />);
  await expect.element(screen.getByText("Private old wording", { exact: true })).toBeVisible();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  if (action === "retire") await stopUsingMemory(m.reference!);
  else await recordMemory({ factId: m.id, expectedPreviousId: m.reference!.revision, action: "CORRECTED", statement: "New wording" });
  window.dispatchEvent(new Event(event));
  await expect.element(screen.getByText("Private old wording", { exact: true })).not.toBeInTheDocument();
  expect(writeAlfredBrief).not.toHaveBeenCalled();
  // Remount must validate, rather than flash the stale cache back into view.
  await screen.unmount();
  const again = await render(<AlfredBrief active refreshKey={1} onOpen={() => {}} />);
  await expect.element(again.getByRole("region", { name: "Alfred's brief" })).not.toBeInTheDocument();
  expect(writeAlfredBrief).not.toHaveBeenCalled();
});
it("discards an in-flight old answer and preserves the ten-minute gate", async () => {
  const m = await rememberFact("Private old wording", "OTHER");
  let resolve!: (value: { text: string; costUsd: number }) => void;
  vi.mocked(writeAlfredBrief).mockReturnValue(new Promise((done) => { resolve = done; }));
  const screen = await render(<AlfredBrief active refreshKey={0} onOpen={() => {}} />);
  await expect.poll(() => vi.mocked(writeAlfredBrief).mock.calls.length).toBe(1);
  await stopUsingMemory(m.reference!); window.dispatchEvent(new Event("beyond:memory-changed"));
  resolve({ text: "Private old wording", costUsd: 0.001 });
  await expect.element(screen.getByRole("region", { name: "Alfred's brief" })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORE)!).text).toBe("");
  await screen.unmount(); await render(<AlfredBrief active refreshKey={1} onOpen={() => {}} />);
  expect(writeAlfredBrief).toHaveBeenCalledTimes(1);
});
