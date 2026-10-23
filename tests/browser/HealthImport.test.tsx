import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { applyRestore } from "../../src/persistence/backup";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { HealthImportScreen } from "../../src/ui/screens/health/HealthImportScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { ImportedSleepEvidence } from "../../src/ui/screens/health/ImportedSleepEvidence";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";
import { syntheticSleep } from "../helpers/syntheticSleep";
import { syntheticActivity } from "../helpers/syntheticActivity";
import { ImportedActivityEvidence } from "../../src/ui/screens/health/ImportedActivityEvidence";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";

vi.mock("../../src/application/advisoryQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/advisoryQueries")>();
  return { ...actual, getAdvisoryNotes: vi.fn(actual.getAdvisoryNotes) };
});
afterEach(async () => { await cleanup(); });
function chooseFile(input: HTMLInputElement, content = JSON.stringify(syntheticSleep())) {
  const transfer = new DataTransfer(); transfer.items.add(new File([content], "synthetic-sleep.json", { type: "application/json" }));
  input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
}
describe("Health Connect sleep import", () => {
  it("keeps a large valid preview summary-sized until individual review is requested", async () => {
    const snapshot = syntheticSleep();
    snapshot.records = Array.from({ length: 68 }, (_, index) => ({ ...snapshot.records[0]!, id: `synthetic-sleep-${index}` }));
    const screen = await render(<HealthImportScreen />);
    chooseFile(screen.getByLabelText("Health export file").element() as HTMLInputElement, JSON.stringify(snapshot));
    await expect.element(screen.getByText("68 sleep sessions", { exact: false })).toBeVisible();
    expect(screen.getByRole("article", { name: /^Sleep preview/ }).elements()).toHaveLength(0);
    await screen.getByText("Review individual sessions · 68", { exact: true }).click();
    await expect.poll(() => screen.getByRole("article", { name: /^Sleep preview/ }).elements().length).toBe(68);
    expect(await db.externalSleepRecords.count()).toBe(0);
  });

  it("round-trips imported evidence in a real browser and rolls back a failed replacement", async () => {
    await importSleepSnapshot(syntheticSleep());
    const before = await db.externalSleepRevisions.toArray(), receipt = await db.healthImportReceipts.toArray();
    const file = new File([await db.export()], "synthetic-backup.json");
    await db.externalSleepRecords.clear(); await db.externalSleepRevisions.clear(); await db.healthImportReceipts.clear();
    await applyRestore(file);
    expect(await db.externalSleepRevisions.toArray()).toEqual(before); expect(await db.healthImportReceipts.toArray()).toEqual(receipt);
    expect((await importSleepSnapshot(syntheticSleep())).skipped).toBe(1);
    const malformed = JSON.parse(await file.text());
    malformed.data.tables.push({ name: "not-a-live-table", schema: "id", rowCount: 1 });
    malformed.data.data.push({ tableName: "not-a-live-table", inbound: true, rows: [{ id: "invalid" }] });
    await expect(applyRestore(new File([JSON.stringify(malformed)], "invalid-backup.json"))).rejects.toThrow();
    expect(await db.externalSleepRevisions.toArray()).toEqual(before); expect(await db.healthImportReceipts.toArray()).toEqual(receipt);
    expect(await db.externalSleepRecords.count()).toBe(1);
  });
  it.each([320, 360, 390, 412])("previews accessibly at %i px; cancel writes nothing", async (width) => {
    await page.viewport(width, 844);
    const screen = await render(<HealthImportScreen />);
    const input = screen.getByLabelText("Health export file").element() as HTMLInputElement;
    expect(input.hasAttribute("accept")).toBe(false); // Android SAF must not hide a valid file because of provider MIME metadata.
    chooseFile(input);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    await expect.element(screen.getByText("1 sleep session", { exact: false })).toBeVisible();
    expect(screen.getByRole("article", { name: "Sleep preview 1" }).elements()).toHaveLength(0);
    await screen.getByText("Review individual sessions · 1", { exact: true }).click();
    await expect.element(screen.getByRole("article", { name: "Sleep preview 1" })).toBeVisible();
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
    const input = screen.getByLabelText("Health export file").element() as HTMLInputElement;
    chooseFile(input);
    await screen.getByRole("button", { name: "CONFIRM SLEEP IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 1 new, 0 revised/)).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toMatch(/^Imported 1 new/);
    expect(await db.events.count()).toBe(0); expect(await db.beyondDays.count()).toBe(0);
    chooseFile(input);
    await screen.getByRole("button", { name: "CONFIRM SLEEP IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 0 new, 0 revised; 1 unchanged/)).toBeVisible();
    expect(await db.externalSleepRevisions.count()).toBe(1); expect(await db.healthImportReceipts.count()).toBe(1);
    await cleanup();
    const evidence = await render(<ImportedSleepEvidence />);
    await expect.element(evidence.getByText(/asleep · Garmin$/)).toBeVisible();
    await evidence.getByText("Source details and revisions").click();
    await expect.element(evidence.getByText("Garmin measurement without a matching BEYOND day.")).toBeVisible();
    await evidence.getByRole("button", { name: "SHOW REVISION HISTORY" }).click();
    await expect.poll(() => document.querySelectorAll(".health-import li").length).toBe(1);
  });

  it("keeps Garmin archives behind one deliberate HEALTH HISTORY destination", async () => {
    await importSleepSnapshot(syntheticSleep());
    await importActivitySnapshot(syntheticActivity());
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("Health history", { exact: true })).toBeVisible();
    expect(screen.getByText("Garmin history", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("Browse health days", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "MEASURED · GARMIN" }).elements()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "GARMIN SLEEP" }).elements()).toHaveLength(0);
    await screen.getByText("Health history", { exact: true }).click();
    // UX-COHESION-001: DAYS first; Garmin is a deliberate second choice.
    await expect.element(screen.getByRole("group", { name: "Seven lived days" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "MEASURED · GARMIN" }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "GARMIN", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "MEASURED · GARMIN" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "GARMIN SLEEP" })).toBeVisible();
  });
  it("rejects unsupported files and offers a fresh selection", async () => {
    const screen = await render(<HealthImportScreen />);
    const input = screen.getByLabelText("Health export file").element() as HTMLInputElement;
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
    chooseFile(screen.getByLabelText("Health export file").element() as HTMLInputElement);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    await screen.getByRole("button", { name: "BACK TO COMMAND" }).click();
    await screen.getByLabelText("Find a screen or action").fill("health connect");
    await screen.getByRole("button", { name: /^IMPORT HEALTH DATA/ }).click();
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
  });
  it.each([320, 412])("previews and imports a steps and heart rate file accessibly at %i px, shown as measured by lived day", async (width) => {
    await page.viewport(width, 844);
    await db.beyondDays.add({ id: "day-1", startedAt: "2026-10-17T21:30:00Z", timezoneId: "America/Chicago", workContext: "WORK", status: "ENDED", createdAt: "2026-10-17T21:30:00Z", updatedAt: "2026-10-17T21:30:00Z" });
    const screen = await render(<HealthImportScreen />);
    chooseFile(screen.getByLabelText("Health export file").element() as HTMLInputElement, JSON.stringify(syntheticActivity()));
    await expect.element(screen.getByRole("heading", { name: "REVIEW STEPS AND HEART RATE" })).toBeVisible();
    await expect.element(screen.getByText(/^3 measured hours · 1,500 steps · heart rate 55–120 bpm · average 71 · 1 resting/)).toBeVisible();
    await expect.element(screen.getByText("2026-10-12T00:00:00Z", { exact: false })).not.toBeVisible();
    await screen.getByText("Source details", { exact: true }).click();
    await expect.element(screen.getByText("2026-10-12T00:00:00Z", { exact: false })).toBeVisible();
    expect(await db.externalActivityHours.count()).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations.map((v) => v.id)).toEqual([]);
    await screen.getByRole("button", { name: "CANCEL PREVIEW" }).click();
    await expect.element(screen.getByRole("heading", { name: "REVIEW STEPS AND HEART RATE" })).not.toBeInTheDocument();
    expect(await db.externalActivityHours.count()).toBe(0); expect(await db.healthImportReceipts.count()).toBe(0);
    chooseFile(screen.getByLabelText("Health export file").element() as HTMLInputElement, JSON.stringify(syntheticActivity()));
    await screen.getByRole("button", { name: "CONFIRM STEPS AND HEART RATE IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 4 new, 0 updated/)).toBeVisible();
    expect(await db.events.count()).toBe(0); expect(await db.externalSleepRecords.count()).toBe(0);
    await cleanup();
    const evidence = await render(<ImportedActivityEvidence />);
    await expect.element(evidence.getByRole("heading", { name: "MEASURED · GARMIN" })).toBeVisible();
    await expect.element(evidence.getByText(/1,500 steps · resting HR 54 · 2h coverage/)).toBeVisible();
  });
  it("SEND TO BEYOND: previews both shared files once, imports nothing until confirmed", async () => {
    const cache = await caches.open("beyond-shared-health");
    await cache.put("/shared-health-0", new Response(JSON.stringify(syntheticSleep()), { headers: { "X-Beyond-Name": "beyond-sleep.json" } }));
    await cache.put("/shared-health-1", new Response(JSON.stringify(syntheticActivity()), { headers: { "X-Beyond-Name": "beyond-activity.json" } }));
    const screen = await render(<HealthImportScreen />);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "REVIEW STEPS AND HEART RATE" })).toBeVisible();
    await expect.element(screen.getByText(/^Preview ready: 1 Garmin sleep records and 3 hours of Garmin steps/)).toBeVisible();
    expect(await caches.has("beyond-shared-health")).toBe(false);
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.externalActivityHours.count()).toBe(0);
    await screen.getByRole("button", { name: "CONFIRM STEPS AND HEART RATE IMPORT" }).click();
    await expect.element(screen.getByText(/^Imported 4 new, 0 updated/)).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
  });
});

describe("SLEEP-FILING-001 — Garmin sleep that isn't counted says why", () => {
  it("marks a sleep during a worked shift and one with no open day", async () => {
    await db.beyondDays.add({ id: "worked", startedAt: "2026-10-17T21:30:00Z", timezoneId: "America/Chicago", workContext: "WORK", status: "ENDED", createdAt: "2026-10-17T21:30:00Z", updatedAt: "2026-10-17T21:30:00Z" });
    const base = syntheticSleep();
    const record = (id: string, startTime: string, endTime: string) => ({ ...base.records[0]!, id, startTime, endTime, stages: [] });
    await importSleepSnapshot({ ...base, window: { startTime: "2026-10-15T00:00:00Z", endTime: "2026-10-23T00:00:00Z" }, exportedAt: "2026-10-23T00:00:00Z",
      records: [record("at-work", "2026-10-18T02:47:00Z", "2026-10-18T08:24:00Z"), record("gap", "2026-10-20T12:00:00Z", "2026-10-20T18:00:00Z")] });
    const screen = await render(<ImportedSleepEvidence />);
    await expect.element(screen.getByText("During your shift, so BEYOND didn't count it as sleep. If you did sleep, log it in BODY → Sleep.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("No BEYOND day was open then, so it isn't counted as sleep.", { exact: true })).toBeVisible();
  });
});
