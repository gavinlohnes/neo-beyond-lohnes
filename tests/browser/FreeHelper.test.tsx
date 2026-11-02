import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { AlfredSheet } from "../../src/ui/components/AlfredSheet";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { createSavedMeal, updateSavedMeal } from "../../src/application/nutritionCommands";

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
  await send(screen, "16 oz water and sort out the car insurance");
  await expect.element(screen.getByRole("group", { name: "Log 16 oz water" })).toBeVisible();
  await expect.element(screen.getByText(/I couldn't do “sort out the car insurance”\. Alfred needs a Claude key/)).toBeVisible();
  expect(requests).toBe(0);
});

it("hands anything it isn't sure of to Alfred when he's available", async () => {
  await startDay();
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-free");
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "16 oz water");
  await expect.element(screen.getByText("BEYOND · FREE")).toBeVisible();
  expect(requests).toBe(0);
  await send(screen, "16 oz water and sort out the car insurance");
  await expect.element(screen.getByText("Alfred here.")).toBeVisible();
  expect(requests).toBe(1);
});

it("an unknown food is looked up free first; Alfred's estimate is one tap, not automatic (FREE-HELPER-002)", async () => {
  await startDay();
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-free");
  const asked: string[] = [];
  const onFind = (e: Event) => asked.push((e as CustomEvent<string>).detail);
  window.addEventListener("beyond:find-food", onFind);
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "For dinner I just ate 2 pieces of pepperoni pizza from Little Caesars, and 8 oz water");
  await expect.element(screen.getByRole("group", { name: "Log 8 oz water" })).toBeVisible();
  await expect.element(screen.getByText(/I don't know that food yet/)).toBeVisible();
  expect(requests).toBe(0);
  await screen.getByRole("button", { name: "FIND “pepperoni pizza little caesars” FREE" }).click();
  expect(asked).toEqual(["pepperoni pizza little caesars"]);
  await screen.getByRole("button", { name: "ASK ALFRED TO ESTIMATE" }).click();
  await expect.element(screen.getByText("Alfred here.")).toBeVisible();
  expect(requests).toBe(1);
  window.removeEventListener("beyond:find-food", onFind);
});

it("the on-phone AI check only asks the browser and reports plainly", async () => {
  const { checkOnPhoneAi } = await import("../../src/ui/components/AiCheck");
  const r = await checkOnPhoneAi();
  expect(Object.keys(r)).toEqual(["builtIn", "webgpu", "memory"]);
  expect(r.builtIn.length).toBeGreaterThan(0);
  expect(requests).toBe(0);
});

it("a free meal card refuses to save if the saved meal changed after it was shown (review of #366)", async () => {
  await startDay();
  const meal = await createSavedMeal({ name: "Chicken bowl", calories: 600, proteinG: 50, carbsG: 60, fatG: 15 });
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "ate the chicken bowl");
  const card = screen.getByRole("group", { name: /^Log Chicken bowl/ });
  await expect.element(card).toBeVisible();
  await updateSavedMeal(meal.id, { calories: 900, proteinG: 20 });
  await card.getByRole("button", { name: "SAVE" }).click();
  await expect.element(screen.getByText("Your context changed. Ask again before saving this proposal. Nothing changed.")).toBeVisible();
  expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
});

it("SAVE + REMEMBER MEAL keeps a food as a saved meal, so next time it logs free (FREE-HELPER-002)", async () => {
  await startDay();
  const screen = await render(<AlfredSheet open onClose={() => {}} onSaved={() => {}} />);
  await send(screen, "burger 650 cal 30g protein");
  const card = screen.getByRole("group", { name: /^Log burger/ });
  await card.getByRole("button", { name: "SAVE + REMEMBER MEAL" }).click();
  await expect.element(card.getByText("Saved.")).toBeVisible();
  expect((await db.savedMeals.toArray()).map((m) => m.name)).toEqual(["burger"]);
  await send(screen, "ate a burger");
  await expect.poll(() => document.querySelectorAll(".alfred-card").length).toBe(2);
  await expect.element(screen.getByRole("group", { name: /^Log burger · 650 kcal/ }).last().getByRole("button", { name: "SAVE + REMEMBER MEAL" })).not.toBeInTheDocument(); // matched the saved meal
  expect(requests).toBe(0);
});
