/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { cdp, page } from "vitest/browser";
import axe from "axe-core";
import { MemoryPanel } from "../../src/ui/components/MemoryPanel";
import { WorkPreparation } from "../../src/ui/components/WorkPreparation";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { startDay, endDay } from "../../src/application/commands";
import { getMemoryFacts, getMemoryWorkspace, recordMemory } from "../../src/application/memory";
import { getPreparation } from "../../src/application/preparation";
import { db } from "../../src/persistence/db";

vi.mock("../../src/application/memory", async (original) => {
  const actual = await original<typeof import("../../src/application/memory")>();
  return { ...actual, getMemoryWorkspace: vi.fn(actual.getMemoryWorkspace) };
});
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 27, 17)); await page.viewport(360, 800); });
afterEach(async () => { cleanup(); vi.useRealTimers(); vi.mocked(getMemoryWorkspace).mockClear(); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });
const words = "Frozen meals are a good backup for me.";
async function food(dayId: string) { return recordMemory({ dayId, factId: "food", action: "CREATED", kind: "PREP_FOOD", statement: words, expectedPreviousId: null }); }

it("adds an editable starter from PREP, shows provenance, and removes irrelevant context without logging food or tasks", async () => {
  const day = await startDay(), before = await db.events.toArray();
  const screen = await render(<WorkPreparation dayId={day.id} beforeWork active />);
  await screen.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "PREPARATION", exact: true });
  const memory = sheet.getByRole("region", { name: "Your preparation memory", exact: true });
  await memory.getByRole("button", { name: "REMEMBER FOR PREPARATION", exact: true }).click();
  await memory.getByRole("button", { name: "USE AN EDITABLE STARTER", exact: true }).click();
  await expect.element(memory.getByRole("textbox", { name: "What should BEYOND remember?" })).toHaveValue(words);
  expect(await getMemoryFacts()).toEqual([]);
  await memory.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.element(memory.getByText(words, { exact: true }).first()).toBeVisible();
  await memory.getByText("Inspect or fix this memory", { exact: true }).click();
  await expect.element(memory.getByText(/Source: OPERATOR/)).toBeVisible();
  await memory.getByRole("article").getByRole("button", { name: "NO LONGER RELEVANT", exact: true }).click();
  await expect.element(memory.getByRole("article")).not.toBeInTheDocument();
  expect((await getMemoryFacts())[0]!.status).toBe("IRRELEVANT");
  expect((await getPreparation(day.id)).FOOD.value).toBe("UNCONFIRMED");
  expect((await getPreparation(day.id)).BOTTLE.value).toBe("UNCONFIRMED");
  expect(await db.obligations.count()).toBe(0);
  expect((await db.events.toArray()).filter((event) => !before.some((old) => old.id === event.id)).every((event) => event.type === "MEMORY_RECORDED")).toBe(true);
  await memory.getByRole("button", { name: "RESTORE & CONFIRM", exact: true }).click();
  await expect.element(memory.getByText(words, { exact: true }).first()).toBeVisible();
});

it("corrects words/kind through MORE, keeps previous words in history, and exposes irrelevant records", async () => {
  const day = await startDay(); await food(day.id);
  const screen = await render(<MoreScreen initialView="MEMORY" />);
  const memory = screen.getByRole("region", { name: "What BEYOND should remember", exact: true });
  await memory.getByText("Inspect or fix this memory", { exact: true }).click();
  await memory.getByRole("button", { name: "CORRECT MEMORY", exact: true }).click();
  await memory.getByRole("combobox", { name: "Applies to" }).selectOptions("RECOVERY");
  await memory.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Quiet first after work.");
  await memory.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.element(memory.getByText("Quiet first after work.", { exact: true }).first()).toBeVisible();
  const saved = (await getMemoryFacts())[0]!; expect(saved.kind).toBe("RECOVERY"); expect(saved.history[0]!.statement).toBe(words);
  await memory.getByText("Inspect or fix this memory", { exact: true }).click();
  await memory.getByRole("article").getByRole("button", { name: "NO LONGER RELEVANT", exact: true }).click();
  await memory.getByText("MANAGE MEMORY", { exact: true }).click();
  await memory.getByRole("group", { name: "Memory status" }).getByRole("button", { name: "NO LONGER RELEVANT", exact: true }).click();
  await expect.element(memory.getByText("Quiet first after work.", { exact: true }).first()).toBeVisible();
  await memory.getByText("Inspect or fix this memory", { exact: true }).click();
  await memory.getByText("Memory history (3)", { exact: true }).click();
  await expect.element(memory.getByText(words, { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "BACK TO MORE", exact: true })).toBeVisible();
});

it("recovery memory is present in the recovery choice and absent after selecting a standard workout", async () => {
  const day = await startDay(); await food(day.id);
  await recordMemory({ dayId: day.id, factId: "quiet", kind: "RECOVERY", statement: "Quiet first after work.", action: "CREATED", expectedPreviousId: null });
  const screen = await render(<TrainScreen destination="RECOVERY" />);
  const memory = screen.getByRole("region", { name: "Your recovery memory", exact: true });
  await expect.element(memory.getByText("Quiet first after work.", { exact: true }).first()).toBeVisible();
  await expect.element(memory.getByText(words, { exact: true })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "STANDARD", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Your recovery memory", exact: true })).not.toBeInTheDocument();
});

it("preserves a PREP draft across ended/no-day/new-day transitions and requires explicit day adoption", async () => {
  const day = await startDay();
  const screen = await render(<WorkPreparation dayId={day.id} beforeWork active />);
  await screen.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
  await screen.getByRole("button", { name: "REMEMBER FOR PREPARATION", exact: true }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("Keep my unfinished words.");
  await endDay(day.id); await screen.rerender(<WorkPreparation dayId={null} beforeWork={false} active />);
  await expect.element(screen.getByRole("dialog", { name: "PREPARATION", exact: true })).not.toBeInTheDocument();
  vi.setSystemTime(new Date(2026, 9, 28, 17)); const next = await startDay();
  await screen.rerender(<WorkPreparation dayId={next.id} beforeWork active />);
  await screen.getByRole("button", { name: "PREPARATION OPTIONS", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What should BEYOND remember?" })).toHaveValue("Keep my unfinished words.");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent(/day changed/);
  expect(await getMemoryFacts()).toEqual([]);
  await screen.getByRole("button", { name: "USE CURRENT DAY — KEEP MY WORDS", exact: true }).click();
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.poll(async () => (await getMemoryFacts())[0]?.statement).toBe("Keep my unfinished words.");
});

it.each([320, 360, 844, 1280])("keeps memory FIELD controls neutral, accessible and bounded at %ipx with reduced motion", async (width) => {
  await page.viewport(width, width === 844 ? 390 : 844);
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const day = await startDay();
  for (let index = 0; index < 7; index++) await recordMemory({ dayId: day.id, factId: `f${index}`, kind: "PREP_OTHER", statement: `My preparation preference ${index}`, action: "CREATED", expectedPreviousId: null });
  const screen = await render(<MemoryPanel />);
  await expect.element(screen.getByRole("button", { name: "SHOW MORE MEMORIES", exact: true })).toBeVisible();
  expect(screen.getByRole("article").elements()).toHaveLength(5);
  await screen.getByRole("button", { name: "SHOW MORE MEMORIES", exact: true }).click();
  expect(screen.getByRole("article").elements()).toHaveLength(7);
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What should BEYOND remember?" })).toBeVisible();
  expect(document.querySelectorAll('.memory-panel .btn-primary')).toHaveLength(0);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("retains draft text through read failure/retry and rejects an older in-flight read after re-entry", async () => {
  await startDay(); const old = await getMemoryWorkspace();
  const screen = await render(<MemoryPanel />);
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("My draft stays here.");
  await screen.rerender(<MemoryPanel active={false} />);
  vi.mocked(getMemoryWorkspace).mockRejectedValueOnce(new Error("Storage unavailable"));
  await screen.rerender(<MemoryPanel />);
  await expect.element(screen.getByRole("alert")).toHaveTextContent(/not empty/);
  await expect.element(screen.getByRole("textbox", { name: "What should BEYOND remember?" })).toHaveValue("My draft stays here.");
  await screen.getByRole("button", { name: "RELOAD MEMORY LIST", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true })).toBeEnabled();
  let release!: (value: typeof old) => void;
  vi.mocked(getMemoryWorkspace).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  await screen.rerender(<MemoryPanel active={false} />); await screen.rerender(<MemoryPanel />);
  await expect.element(screen.getByRole("status")).toHaveTextContent("Reading memory…");
  await screen.rerender(<MemoryPanel active={false} />);
  await food(old.dayId!); await screen.rerender(<MemoryPanel />);
  await expect.element(screen.getByText(words, { exact: true }).first()).toBeVisible();
  release(old);
  await expect.element(screen.getByText(words, { exact: true }).first()).toBeVisible();
});

it("returns to a saved fact rather than the old inspection target, then honors a new source request", async () => {
  const day = await startDay(); await food(day.id);
  await recordMemory({ dayId: day.id, factId: "other-source", action: "CREATED", expectedPreviousId: null, kind: "CONSTRAINT", statement: "Another explicit source" });
  const screen = await render(<MemoryPanel focusFactId="food" />);
  await expect.poll(() => (document.activeElement as HTMLElement)?.dataset.memoryId).toBe("food");
  await screen.getByRole("button", { name: "ADD MEMORY", exact: true }).click();
  await screen.getByRole("textbox", { name: "What should BEYOND remember?" }).fill("A new personal fact");
  await screen.getByRole("button", { name: "SAVE & CONFIRM MEMORY", exact: true }).click();
  await expect.poll(async () => (await getMemoryFacts()).find((f) => f.statement === "A new personal fact")?.factId).toBeTruthy();
  const saved = (await getMemoryFacts()).find((f) => f.statement === "A new personal fact")!;
  await expect.poll(() => (document.activeElement as HTMLElement)?.dataset.memoryId).toBe(saved.factId);
  await screen.rerender(<MemoryPanel focusFactId="other-source" />);
  await expect.poll(() => (document.activeElement as HTMLElement)?.dataset.memoryId).toBe("other-source");
});
