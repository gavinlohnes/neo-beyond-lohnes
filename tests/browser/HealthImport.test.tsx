import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { HealthImportScreen } from "../../src/ui/screens/health/HealthImportScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { ImportedSleepEvidence } from "../../src/ui/screens/health/ImportedSleepEvidence";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";
import { syntheticSleep } from "../helpers/syntheticSleep";

vi.mock("../../src/application/advisoryQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/advisoryQueries")>();
  return { ...actual, getAdvisoryNotes: vi.fn(actual.getAdvisoryNotes) };
});
afterEach(() => { cleanup(); });
function chooseFile(input: HTMLInputElement, content = JSON.stringify(syntheticSleep())) {
  const transfer = new DataTransfer(); transfer.items.add(new File([content], "synthetic-sleep.json", { type: "application/json" }));
  input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
}
describe("Health Connect sleep import", () => {
  it.each([320, 360, 390, 412])("previews accessibly at %i px; cancel writes nothing", async (width) => {
    await page.viewport(width, 844);
    const screen = await render(<HealthImportScreen />);
    const input = screen.getByLabelText("Sleep export file").element() as HTMLInputElement;
    expect(input.hasAttribute("accept")).toBe(false); // Android SAF must not hide a valid file because of provider MIME metadata.
    chooseFile(input);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.events.count()).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    const a11y = await axe.run(screen.container, { rules: { region: { enabled: false } } });
    expect(a11y.violations.map((v) => v.id)).toEqual([]);
    await screen.getByRole("button", { name: "CANCEL PREVIEW" }).click();
    expect(document.activeElement).toBe(input);
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.healthImportReceipts.count()).toBe(0);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).not.toBeInTheDocument();
  });
  it("confirms once, keeps focus on the result, skips duplicates and displays source evidence", async () => {
    const screen = await render(<HealthImportScreen />);
    const input = screen.getByLabelText("Sleep export file").element() as HTMLInputElement;
    chooseFile(input);
    await screen.getByRole("button", { name: "CONFIRM SLEEP IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 1 new, 0 revised/)).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toMatch(/^Imported 1 new/);
    expect(await db.events.count()).toBe(0); expect(await db.beyondDays.count()).toBe(0);
    chooseFile(input);
    await screen.getByRole("button", { name: "CONFIRM SLEEP IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 0 new, 0 revised; 1 unchanged/)).toBeVisible();
    expect(await db.externalSleepRevisions.count()).toBe(1); expect(await db.healthImportReceipts.count()).toBe(1);
    cleanup();
    const evidence = await render(<ImportedSleepEvidence />);
    await expect.element(evidence.getByRole("heading", { name: "Garmin Connect · sleep" })).toBeVisible();
    await expect.element(evidence.getByText("Source dates only · no lived day assigned")).toBeVisible();
    await evidence.getByText("Source details and revisions").click();
    await evidence.getByRole("button", { name: "SHOW REVISION HISTORY" }).click();
    await expect.poll(() => document.querySelectorAll(".health-import li").length).toBe(1);
  });
  it("rejects unsupported files and offers a fresh selection", async () => {
    const screen = await render(<HealthImportScreen />);
    const input = screen.getByLabelText("Sleep export file").element() as HTMLInputElement;
    chooseFile(input, '{"format":"anything-else"}');
    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
    chooseFile(input);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
  });
  it("is reachable from COMMAND and preserves its preview when returning", async () => {
    vi.mocked(getAdvisoryNotes).mockClear();
    const screen = await render(<MoreScreen />);
    await expect.poll(() => vi.mocked(getAdvisoryNotes).mock.results.length).toBeGreaterThan(0);
    await vi.mocked(getAdvisoryNotes).mock.results[0]!.value;
    await screen.getByLabelText("Find a screen or action").fill("health connect");
    await screen.getByRole("button", { name: /^IMPORT HEALTH DATA/ }).click();
    chooseFile(screen.getByLabelText("Sleep export file").element() as HTMLInputElement);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await screen.getByLabelText("Find a screen or action").fill("health connect");
    await screen.getByRole("button", { name: /^IMPORT HEALTH DATA/ }).click();
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
  });
});
