import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { lastFinishedWeek, weekLabel } from "../../src/application/alfred/alfredReview";
import { CaveMonthView } from "../../src/ui/screens/systems/CaveMonth";
import { db } from "../../src/persistence/db";

/** ALFRED-006: Alfred writes the week's review once, TODAY shows it until GOT IT, MONTH keeps them all. */
let asks: string[] = [];
beforeEach(async () => {
  await page.viewport(412, 915);
  asks = [];
  vi.spyOn(window, "fetch").mockImplementation(async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { messages: { content: string }[] };
    const ask = String(body.messages.at(-1)?.content ?? "");
    asks.push(ask);
    const text = ask.includes("weekly review") ? "**Steady week: sleep held on work nights.**\n- Sleep 7h30 on 1 day\n- One thing to try: protein before the shift" : "Brief.";
    return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 1000, output_tokens: 100 } }), { headers: { "content-type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ALFRED-006", () => {
  it("the week turns when Sunday's lived day ends (Monday 16:30)", () => {
    expect(lastFinishedWeek(new Date(2026, 9, 31, 6, 0))).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(lastFinishedWeek(new Date(2026, 10, 2, 10, 0))).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(lastFinishedWeek(new Date(2026, 10, 2, 17, 0))).toEqual({ start: "2026-10-26", end: "2026-11-01" });
  });

  it("writes last week's review once, shows it on TODAY until GOT IT, and keeps it in MONTH", async () => {
    const week = lastFinishedWeek();
    await startDay(new Date(`${week.start}T17:00:00`).toISOString());
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const label = weekLabel(week);
    const screen = await render(<App />);
    const card = screen.getByRole("region", { name: `Your week, ${label}` });
    await expect.element(card).toHaveTextContent("Steady week: sleep held on work nights.");
    expect(await db.alfredReviews.count()).toBe(1);
    const reviewAsk = asks.find((a) => a.includes("weekly review"))!;
    expect(reviewAsk).toContain(label);
    await card.getByRole("button", { name: "READ" }).click();
    await expect.element(card.getByText("One thing to try: protein before the shift")).toBeVisible();
    for (const animation of document.getAnimations()) animation.finish();
    expect((await axe.run(card.element())).violations).toEqual([]);
    await card.getByRole("button", { name: "GOT IT" }).click();
    await expect.element(card).not.toBeInTheDocument();
    expect(localStorage.getItem("beyond.alfredReviewSeen")).toBe(week.start);
    expect(asks.filter((a) => a.includes("weekly review"))).toHaveLength(1);
  });

  it("MONTH lists every review", async () => {
    await db.alfredReviews.add({ id: "r1", weekStart: "2026-10-19", weekEnd: "2026-10-25", text: "**Steady week.**", writtenAt: new Date().toISOString() });
    const screen = await render(<CaveMonthView />);
    const reviews = screen.getByRole("region", { name: "Weekly reviews" });
    await reviews.getByText("Oct 19–Oct 25").click();
    await expect.element(reviews.getByText("Steady week.")).toBeVisible();
  });
});
