import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { getCoachCards, type CoachCard as Card } from "../../src/application/coachCards";
import { CoachCard } from "../../src/ui/screens/today/CoachCard";
vi.mock("../../src/application/coachCards", async (original) => ({ ...await original<typeof import("../../src/application/coachCards")>(), getCoachCards: vi.fn() }));
afterEach(async () => { await cleanup(); vi.clearAllMocks(); });
const cards: Card[] = [
  { key: "lift-evidence-1", title: "One lighter session", evidence: "Four recorded sessions at 100 lb. Suggests 90 lb.", destination: "TRAIN" },
  { key: "experiment-1", title: "Review your test", evidence: "Your 14-day test ended.", destination: "JOURNAL" },
];
it("shows only one suggestion, opens its existing flow and skips locally until evidence changes", async () => {
  vi.mocked(getCoachCards).mockResolvedValue(cards);
  const onOpen = vi.fn();
  const screen = await render(<CoachCard active refreshKey={0} onOpen={onOpen} />);
  await expect.element(screen.getByRole("heading", { name: cards[0]!.title })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: cards[1]!.title })).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "REVIEW SUGGESTION" }).click(); expect(onOpen).toHaveBeenCalledWith("TRAIN");
  await screen.getByRole("button", { name: "SKIP", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: cards[1]!.title })).toBeVisible();
  await screen.rerender(<CoachCard active refreshKey={1} onOpen={onOpen} />);
  await expect.element(screen.getByRole("heading", { name: cards[1]!.title })).toBeVisible();
  vi.mocked(getCoachCards).mockResolvedValue([{ ...cards[0]!, key: "lift-evidence-2" }, cards[1]!]);
  await screen.rerender(<CoachCard active refreshKey={2} onOpen={onOpen} />);
  await expect.element(screen.getByRole("heading", { name: cards[0]!.title })).toBeVisible();
});
it("stays quiet without candidates; a failed read offers retry instead of old advice", async () => {
  vi.mocked(getCoachCards).mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue([]);
  const screen = await render(<CoachCard active refreshKey={0} onOpen={vi.fn()} />);
  await screen.getByRole("button", { name: "RETRY COACH" }).click();
  await expect.element(screen.getByRole("region", { name: "One coach suggestion" })).not.toBeInTheDocument();
});

it("sits below the Engine on TODAY and opens the existing feature without saving", async () => {
  const { App } = await import("../../src/app/App");
  const { startDay, submitCheckIn } = await import("../../src/application/commands");
  const { db } = await import("../../src/persistence/db");
  vi.mocked(getCoachCards).mockResolvedValue(cards);
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const screen = await render(<App />);
  const coach = screen.getByRole("region", { name: "One coach suggestion" });
  await expect.element(coach).toBeVisible();
  const primary = screen.container.querySelector('[aria-label="Current recommendation"]');
  // The current production hero contains canonical RecommendationCard, even when its section label differs.
  const primaryCard = screen.container.querySelector('.next-action-card');
  expect(Boolean((primary ?? primaryCard)?.compareDocumentPosition(coach.element())! & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  const count = await db.events.count();
  await coach.getByRole("button", { name: "REVIEW SUGGESTION" }).click();
  await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await db.events.count()).toBe(count);
});
