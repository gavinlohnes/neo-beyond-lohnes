import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { captureItem, deleteCaptureItem } from "../../src/application/commands";
import { convertCaptureToObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

vi.mock("../../src/application/commands", async (load) => {
  const actual = await load<typeof import("../../src/application/commands")>();
  return { ...actual, captureItem: vi.fn(actual.captureItem) };
});
vi.mock("../../src/application/intentCommands", async (load) => {
  const actual = await load<typeof import("../../src/application/intentCommands")>();
  return { ...actual, convertCaptureToObligation: vi.fn(actual.convertCaptureToObligation) };
});
beforeEach(async () => { await page.viewport(375, 850); });
afterEach(async () => { await cleanup(); vi.mocked(captureItem).mockReset(); vi.mocked(convertCaptureToObligation).mockReset(); });
async function open() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Capture a note", exact: true }).click();
  return { screen, sheet: screen.getByRole("dialog", { name: "NOTE", exact: true }) };
}
async function raw(text = "Call the bank next Tuesday") {
  const result = await open();
  await result.sheet.getByRole("textbox", { name: "Capture a thought", exact: true }).fill(text);
  await result.sheet.getByRole("button", { name: "CAPTURE", exact: true }).click();
  await expect.element(result.sheet.getByRole("status")).toHaveTextContent("It can stay raw");
  return result;
}
it("one-tap entry has no destination or dates, and opening, Enter, and closing never save", async () => {
  const { screen, sheet } = await open();
  await expect.element(sheet.getByRole("textbox", { name: "Capture a thought", exact: true })).toBeVisible();
  expect(sheet.getByRole("combobox").elements()).toHaveLength(0);
  expect(sheet.getByLabelText("Planned day (optional)").elements()).toHaveLength(0);
  await sheet.getByRole("textbox", { name: "Capture a thought", exact: true }).fill("A raw thought"); await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("{Escape}"); expect(await db.captureItems.count()).toBe(0); expect(await db.obligations.count()).toBe(0);
  await screen.getByRole("button", { name: "Capture a note", exact: true }).click();
  await expect.element(sheet.getByRole("textbox", { name: "Capture a thought", exact: true })).toHaveValue("A raw thought\n");
});
it("saving is raw, dates in words are not inferred, and optional preview/cancel never creates a task", async () => {
  const { sheet } = await raw();
  const capture = (await db.captureItems.toArray())[0]!;
  expect(capture).toMatchObject({ text: "Call the bank next Tuesday", status: "OPEN" });
  expect(await db.obligations.count()).toBe(0);
  await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
  await expect.element(sheet.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue(capture.text);
  await expect.element(sheet.getByLabelText("Planned day (optional)")).toHaveValue("");
  await expect.element(sheet.getByLabelText("Due date (optional)")).toHaveValue("");
  await sheet.getByRole("button", { name: "KEEP RAW", exact: true }).click();
  expect((await db.captureItems.get(capture.id))?.status).toBe("OPEN"); expect(await db.obligations.count()).toBe(0);
});
it("confirmed promotion uses the canonical source link, resolves once and never changes original raw text", async () => {
  const { sheet } = await raw("A long thought about making an appointment");
  const capture = (await db.captureItems.toArray())[0]!;
  await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
  await sheet.getByRole("textbox", { name: "Task title", exact: true }).fill("Book appointment");
  await sheet.getByLabelText("Planned day (optional)").fill("2026-11-20");
  await sheet.getByLabelText("Due date (optional)").fill("2026-11-23");
  expect(await db.obligations.count()).toBe(0);
  const save = sheet.getByRole("button", { name: "CREATE PLAN ITEM", exact: true }).element() as HTMLButtonElement;
  save.click(); save.click();
  await expect.poll(() => db.obligations.count()).toBe(1);
  expect(vi.mocked(convertCaptureToObligation)).toHaveBeenCalledTimes(1);
  expect((await db.obligations.toArray())[0]).toMatchObject({ title: "Book appointment", plannedAt: "2026-11-20", dueAt: "2026-11-23" });
  expect(await db.captureItems.get(capture.id)).toMatchObject({ text: capture.text, status: "RESOLVED" });
  const event = (await db.events.where("type").equals("OBLIGATION_CREATED").toArray())[0]!;
  expect(event.payload).toMatchObject({ sourceCaptureId: capture.id });
});
it("a raw save failure keeps text, and retry saves exactly one raw item", async () => {
  const { sheet } = await open(); await sheet.getByRole("textbox", { name: "Capture a thought", exact: true }).fill("Keep my words");
  vi.mocked(captureItem).mockRejectedValueOnce(new Error("Storage unavailable"));
  await sheet.getByRole("button", { name: "CAPTURE", exact: true }).click(); await expect.element(sheet.getByRole("alert")).toBeVisible();
  await expect.element(sheet.getByRole("textbox", { name: "Capture a thought", exact: true })).toHaveValue("Keep my words");
  expect(await db.captureItems.count()).toBe(0);
  await sheet.getByRole("button", { name: "CAPTURE", exact: true }).click(); await expect.poll(() => db.captureItems.count()).toBe(1);
});
it("failed promotion retains the raw item and choices; close/reopen keeps the draft and explicit retry creates one task", async () => {
  const { screen, sheet } = await raw("Keep it safe");
  await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
  await sheet.getByRole("textbox", { name: "Task title", exact: true }).fill("My chosen task");
  vi.mocked(convertCaptureToObligation).mockRejectedValueOnce(new Error("Task storage unavailable"));
  await sheet.getByRole("button", { name: "CREATE TASK", exact: true }).click(); await expect.element(sheet.getByRole("alert")).toBeVisible();
  expect((await db.captureItems.toArray())[0]?.status).toBe("OPEN"); expect(await db.obligations.count()).toBe(0);
  await userEvent.keyboard("{Escape}"); await screen.getByRole("button", { name: "Capture a note", exact: true }).click();
  await expect.element(sheet.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("My chosen task");
  await sheet.getByRole("button", { name: "CREATE TASK", exact: true }).click(); await expect.poll(() => db.obligations.count()).toBe(1);
});
it("an externally removed capture cannot be promoted; the typed task draft remains available", async () => {
  const { sheet } = await raw("Remove me elsewhere"); const capture = (await db.captureItems.toArray())[0]!;
  await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
  await deleteCaptureItem(capture.id);
  await sheet.getByRole("button", { name: "CREATE TASK", exact: true }).click();
  await expect.element(sheet.getByRole("alert")).toHaveTextContent("already processed or removed");
  await expect.element(sheet.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue(capture.text);
  expect(await db.obligations.count()).toBe(0);
});
it.each([320, 375, 768])("raw and promotion forms fit %spx and pass axe", async (width) => {
  await page.viewport(width, 850); const { sheet } = await raw("A thought that needs no folder or type");
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(sheet.element())).violations).toEqual([]);
  await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(sheet.element())).violations).toEqual([]);
});

it("raw capture and explicit promotion remain usable while offline", async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "onLine");
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
  window.dispatchEvent(new Event("offline"));
  try {
    const { sheet } = await raw("Offline thought");
    await sheet.getByRole("button", { name: "MAKE A TASK", exact: true }).click();
    await sheet.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    await expect.poll(() => db.obligations.count()).toBe(1);
    expect((await db.obligations.toArray())[0]?.title).toBe("Offline thought");
  } finally {
    if (previous) Object.defineProperty(navigator, "onLine", previous);
    else Reflect.deleteProperty(navigator, "onLine");
    window.dispatchEvent(new Event("online"));
  }
});

it("leaving it raw survives a remount and the existing Capture route can process it later", async () => {
  await raw("Keep this for later"); await cleanup();
  const { screen, sheet } = await open();
  await sheet.getByRole("button", { name: "OPEN CAPTURE", exact: true }).click();
  await expect.element(screen.getByText("Keep this for later", { exact: true })).toBeVisible();
  expect(await db.obligations.count()).toBe(0);
  expect((await db.captureItems.toArray())[0]?.status).toBe("OPEN");
});
