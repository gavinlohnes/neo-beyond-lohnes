import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { getCoachCards, readCoachSkips, skipCoachCard, type CoachCard as Card } from "../../src/application/coachCards";
import { CoachCard } from "../../src/ui/screens/today/CoachCard";
vi.mock("../../src/application/coachCards", async (original) => ({ ...await original<typeof import("../../src/application/coachCards")>(), getCoachCards: vi.fn() }));
afterEach(async () => { await cleanup(); vi.clearAllMocks(); });
const cards: Card[] = [
  { id: "lift-1", key: "lift-evidence-1", title: "One lighter session", evidence: "Four recorded sessions at 100 lb. Suggests 90 lb.", destination: "TRAIN",
    why: { rule: "Deload: 4 sessions in a row without a record, so about 90% of the stalled load, once.", facts: [{ label: "Lift", value: "Squat · standard session" }, { label: "Last sets", value: "100 lb × 5 (Nov 20)" }] } },
  { id: "experiment-1", key: "experiment-1", title: "Review your test", evidence: "Your 14-day test ended.", destination: "JOURNAL",
    why: { rule: "A test you started has reached its end date; only you give the verdict.", facts: [] } },
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


it("a skip preserves temporarily ineligible evidence and storage failures stay explicit", async () => {
  skipCoachCard(cards[0]!);
  skipCoachCard(cards[1]!);
  expect(readCoachSkips()).toContain(cards[0]!.key);
  skipCoachCard({ ...cards[0]!, key: "new-lift-evidence" });
  expect(readCoachSkips()).not.toContain(cards[0]!.key);
  expect(readCoachSkips()).toContain(cards[1]!.key);
  vi.mocked(getCoachCards).mockResolvedValue(cards);
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  const screen = await render(<CoachCard active refreshKey={0} onOpen={vi.fn()} />);
  await expect.element(screen.getByRole("button", { name: "RETRY COACH" })).toBeVisible();
  await expect.element(screen.getByRole("region", { name: "One coach suggestion" })).not.toBeInTheDocument();
  get.mockRestore();
  await screen.getByRole("button", { name: "RETRY COACH" }).click();
  await expect.element(screen.getByRole("heading", { name: cards[0]!.title })).toBeVisible();
});

// GRAYSON C6.4: a coach card says why: its rule and the dated facts. REVIEW SUGGESTION stays the way to the records.
it("WHY THIS? opens to the card's rule and dated facts", async () => {
  vi.mocked(getCoachCards).mockResolvedValue(cards);
  const screen = await render(<CoachCard active refreshKey={0} onOpen={vi.fn()} />);
  await screen.getByText("WHY THIS?", { exact: true }).click();
  await expect.element(screen.getByText("Deload: 4 sessions in a row without a record, so about 90% of the stalled load, once.")).toBeVisible();
  await expect.element(screen.getByText("100 lb × 5 (Nov 20)")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "REVIEW SUGGESTION" })).toBeVisible();
});
