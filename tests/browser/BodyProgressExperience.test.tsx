import { holdToConfirm } from "./helpers/hold";
import { afterEach, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { BodyComposition } from "../../src/ui/screens/body/BodyComposition";
import { SessionDraftProvider, useHasSessionDrafts } from "../../src/ui/sessionDrafts";
import { db } from "../../src/persistence/db";
import { logMeasurement, correctMeasurement } from "../../src/application/measurementCommands";
import { getMeasurements } from "../../src/application/measurementQueries";
import { addProgressPhoto } from "../../src/application/progressPhotoCommands";
import { getProgressPhotos } from "../../src/application/progressPhotoQueries";
import { startDay } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";

vi.mock("../../src/application/progressPhotoCommands", async (original) => {
  const actual = await original<typeof import("../../src/application/progressPhotoCommands")>();
  return { ...actual, addProgressPhoto: vi.fn(actual.addProgressPhoto) };
});
vi.mock("../../src/application/measurementCommands", async (original) => {
  const actual = await original<typeof import("../../src/application/measurementCommands")>();
  return { ...actual, logMeasurement: vi.fn(actual.logMeasurement) };
});
vi.mock("../../src/application/measurementQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/measurementQueries")>();
  return { ...actual, getMeasurements: vi.fn(actual.getMeasurements) };
});
vi.mock("../../src/application/progressPhotoQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/progressPhotoQueries")>();
  return { ...actual, getProgressPhotos: vi.fn(actual.getProgressPhotos) };
});
const NOW = new Date(2026, 9, 18, 4);
function clock() { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); }
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.clearAllMocks(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });
function DraftSignal() { return <output aria-label="Unsaved input">{useHasSessionDrafts() ? "yes" : "no"}</output>; }
function mountComposition() { return render(<SessionDraftProvider><BodyComposition active refreshKey={0} weights={[]} onWeight={() => {}}><p>Existing trends</p></BodyComposition><DraftSignal /></SessionDraftProvider>); }
async function photoBlob(): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 120;
  canvas.getContext("2d")!.fillRect(0, 0, 80, 120);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg"));
}
async function pickPhoto(blob: Blob) {
  const input = document.querySelector<HTMLInputElement>('[aria-label="Import progress photo"]')!;
  const transfer = new DataTransfer(); transfer.items.add(new File([blob], "synthetic-photo.jpg", { type: "image/jpeg" }));
  input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
}

for (const width of [320, 360, 412]) it(`records, corrects and retains measurement drafts at ${width}px with accessible mobile layout`, async () => {
  clock(); await page.viewport(width, 800);
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const root = await logMeasurement({ site: "WAIST", inches: 38, measuredOn: "2026-09-01" }, NOW);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Latest measurements", exact: true })).toHaveTextContent("38 in");
  const inches = screen.getByRole("spinbutton", { name: "Inches", exact: true });
  await inches.fill("37.5"); await screen.getByLabelText("Measured on", { exact: true }).fill("2026-10-17");
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
  await expect.element(inches).toHaveValue(37.5);
  expect(await db.events.where("type").equals("MEASUREMENT_LOGGED").count()).toBe(1);
  await screen.getByRole("button", { name: "SAVE MEASUREMENT", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Waist saved" })).toHaveTextContent("37.5 in");
  expect(await db.events.where("type").equals("MEASUREMENT_LOGGED").count()).toBe(2);
  await screen.getByRole("button", { name: "Correct Waist 38 inches measured 2026-09-01", exact: true }).click();
  await expect.poll(() => document.activeElement?.id).toBe("measurement-correction-inches");
  await screen.getByRole("spinbutton", { name: "Corrected inches", exact: true }).fill("38.25");
  await screen.getByRole("button", { name: "SAVE CORRECTION", exact: true }).click();
  await expect.poll(async () => (await getMeasurements()).find((row) => row.rootEventId === root)?.inches).toBe(38.25);
  const [original] = await db.events.where("id").equals(root).toArray(); expect(original?.payload).toMatchObject({ inches: 38 });
  expect((await db.events.where("type").equals("MEASUREMENT_LOGGED").toArray()).every((event) => event.beyondDayId === undefined)).toBe(true);
  await expect.element(screen.getByText("-0.75 in since Sep 1, 2026", { exact: true })).toBeVisible();
  await inches.fill("37.25");
  await screen.getByRole("button", { name: "TRENDS", exact: true }).click();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
  await expect.element(inches).toHaveValue(37.25);
  expect(document.querySelectorAll("main")).toHaveLength(1);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("keeps failed-save input, blocks duplicate taps, and retries a read without replaying the save", async () => {
  clock(); const screen = await mountComposition();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
  await screen.getByRole("spinbutton", { name: "Inches", exact: true }).fill("36");
  await expect.element(screen.getByRole("status", { name: "Unsaved input", exact: true })).toHaveTextContent("yes");
  vi.mocked(logMeasurement).mockRejectedValueOnce(new Error("WRITE_FAILED: Save failed. Try again."));
  await screen.getByRole("button", { name: "SAVE MEASUREMENT", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Save failed");
  await expect.element(screen.getByRole("spinbutton", { name: "Inches", exact: true })).toHaveValue(36);
  expect(await db.events.count()).toBe(0);
  vi.mocked(getMeasurements).mockRejectedValueOnce(new Error("read failed"));
  const button = screen.getByRole("button", { name: "SAVE MEASUREMENT", exact: true }).element() as HTMLButtonElement;
  button.click(); button.click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Waist saved" })).toBeVisible();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Could not read measurements");
  expect(await db.events.where("type").equals("MEASUREMENT_LOGGED").count()).toBe(1);
  const calls = vi.mocked(logMeasurement).mock.calls.length;
  await screen.getByRole("button", { name: "RETRY MEASUREMENTS", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Latest measurements", exact: true })).toHaveTextContent("36 in");
  expect(vi.mocked(logMeasurement).mock.calls.length).toBe(calls);
});

it("reports a stale correction without overwriting a newer canonical correction", async () => {
  clock(); const root = await logMeasurement({ site: "WAIST", inches: 38, measuredOn: "2026-10-17" });
  const screen = await mountComposition(); await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
  await screen.getByRole("button", { name: "Correct Waist 38 inches measured 2026-10-17", exact: true }).click();
  await correctMeasurement(root, { inches: 37 });
  await screen.getByRole("spinbutton", { name: "Corrected inches", exact: true }).fill("35");
  await screen.getByRole("button", { name: "SAVE CORRECTION", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("already been corrected");
  expect((await getMeasurements())[0]?.inches).toBe(37);
  await expect.element(screen.getByRole("spinbutton", { name: "Corrected inches", exact: true })).toHaveValue(35);
});

it("preserves workout set input and measurement draft through progress and the 16:30 boundary", async () => {
  clock(); const day = await startDay(); const workout = await startWorkout(day.id, "A", "STANDARD");
  const screen = await render(<App />);
  const reps = screen.getByRole("spinbutton", { name: "Set 1 repetitions", exact: true }); await reps.fill("9");
  await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click(); await screen.getByRole("spinbutton", { name: "Inches", exact: true }).fill("37");
  const before = await db.events.toArray();
  vi.setSystemTime(new Date(2026, 9, 18, 16, 31));
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.element(reps).toHaveAttribute("placeholder", "9");
  (reps.element() as HTMLInputElement).blur(); await expect.element(reps).toHaveValue(9);
  await screen.getByRole("button", { name: "DATA", exact: true }).click(); await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click(); await expect.element(screen.getByRole("spinbutton", { name: "Inches", exact: true })).toHaveValue(37);
  expect((await db.workoutSessions.get(workout.id))?.status).toBe("ACTIVE"); expect(await db.events.toArray()).toEqual(before);
});

it("keeps a selected photo across views and tab navigation, requires an explicit save, compares same-pose records and confirms hide/delete", async () => {
  clock(); await addProgressPhoto(await photoBlob(), { pose: "FRONT", takenOn: "2026-09-01" }, "IMPORT");
  const screen = await render(<App />); await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await screen.getByRole("button", { name: "PHOTOS", exact: true }).click(); await pickPhoto(await photoBlob());
  await expect.element(screen.getByRole("img", { name: "Selected photo, not yet saved", exact: true })).toBeVisible();
  await screen.getByLabelText("Taken on", { exact: true }).fill("2026-10-17");
  await screen.getByRole("button", { name: "TODAY", exact: true }).click(); await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("img", { name: "Selected photo, not yet saved", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click(); await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  expect(await db.progressPhotos.count()).toBe(1);
  await screen.getByRole("button", { name: "SAVE PHOTO", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Front photo saved" })).toBeVisible();
  expect(await db.progressPhotos.count()).toBe(2);
  await screen.getByRole("button", { name: "COMPARE PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Same-pose photo comparison", exact: true })).toBeVisible();
  const before = await db.events.toArray();
  await screen.getByRole("combobox", { name: "First photo", exact: true }).selectOptions((await getProgressPhotos())[1]!.id);
  expect(await db.events.toArray()).toEqual(before);
  await screen.getByRole("button", { name: "Manage front photo 2026-10-17 · 1 of 2", exact: true }).click();
  await screen.getByRole("button", { name: "HIDE PHOTO", exact: true }).click();
  expect((await getProgressPhotos()).length).toBe(2);
  await screen.getByRole("button", { name: "KEEP PHOTO", exact: true }).click();
  await screen.getByRole("button", { name: "DELETE PHOTO PERMANENTLY", exact: true }).click();
  expect(await db.progressPhotos.count()).toBe(2);
  await screen.getByRole("button", { name: "CONFIRM PERMANENT DELETE", exact: true }).click();
  expect(await db.progressPhotos.count()).toBeGreaterThan(0);
  await holdToConfirm(screen.getByRole("button", { name: "CONFIRM PERMANENT DELETE", exact: true }));
  await expect.poll(() => db.progressPhotos.count()).toBe(1);
  await expect.poll(() => document.activeElement?.id).toBe("photo-filter");
  expect((await db.events.where("type").equals("PROGRESS_PHOTO_DELETED").toArray())[0]?.payload).toHaveProperty("photoId");
});

it("does not call a failed photo read an empty timeline and can retry without writes", async () => {
  clock(); vi.mocked(getProgressPhotos).mockRejectedValueOnce(new Error("interrupted read"));
  const screen = await mountComposition(); await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Could not read photos");
  expect(screen.getByText("No front photos here yet.", { exact: false }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "RETRY PHOTOS", exact: true }).click();
  await expect.element(screen.getByText("No front photos here yet.", { exact: false })).toBeVisible();
  expect(await db.events.count()).toBe(0);
});

it("reveals an explicit metric request after measurements while retaining its unsaved input", async () => {
  clock(); const screen = await render(<BodyScreen />); await screen.getByRole("button", { name: "YOUR PROGRESS", exact: true }).click();
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click(); await screen.getByRole("spinbutton", { name: "Inches", exact: true }).fill("36");
  await screen.getByRole("button", { name: "TODAY", exact: true }).click(); await screen.getByRole("button", { name: "water history", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  await screen.getByRole("button", { name: "Open weight trends", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("weight");
  await screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).click(); await expect.element(screen.getByRole("spinbutton", { name: "Inches", exact: true })).toHaveValue(36);
});

it("preserves a photo after a failed save and separates saved-but-read-failed from write failure", async () => {
  clock(); const screen = await mountComposition(); await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  await pickPhoto(await photoBlob());
  vi.mocked(addProgressPhoto).mockRejectedValueOnce(new Error("WRITE_FAILED: Storage unavailable. Try again."));
  await screen.getByRole("button", { name: "SAVE PHOTO", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Storage unavailable");
  await expect.element(screen.getByRole("img", { name: "Selected photo, not yet saved", exact: true })).toBeVisible();
  expect(await db.progressPhotos.count()).toBe(0);
  vi.mocked(getProgressPhotos).mockRejectedValueOnce(new Error("read interrupted"));
  const save = screen.getByRole("button", { name: "SAVE PHOTO", exact: true }).element() as HTMLButtonElement;
  save.click(); save.click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Front photo saved" })).toBeVisible();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Could not read photos");
  expect(await db.progressPhotos.count()).toBe(1);
  const calls = vi.mocked(addProgressPhoto).mock.calls.length;
  await screen.getByRole("button", { name: "RETRY PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Manage front photo 2026-10-18 · 1 of 1", exact: true })).toBeVisible();
  expect(vi.mocked(addProgressPhoto).mock.calls.length).toBe(calls);
});

it("corrects photo metadata without changing pixels, then hides without deleting or comparing hidden photos", async () => {
  clock(); const blob = await photoBlob();
  const original = await addProgressPhoto(blob, { pose: "FRONT", takenOn: "2026-09-01" }, "IMPORT");
  await addProgressPhoto(blob, { pose: "SIDE", takenOn: "2026-10-01" }, "IMPORT");
  const screen = await mountComposition(); await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  await screen.getByRole("button", { name: "Manage front photo 2026-09-01 · 1 of 1", exact: true }).click();
  await screen.getByRole("combobox", { name: "Corrected photo pose", exact: true }).selectOptions("SIDE");
  await screen.getByLabelText("Corrected photo date", { exact: true }).fill("2026-09-02");
  await screen.getByRole("button", { name: "SAVE PHOTO DETAILS", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Photo details corrected" })).toBeVisible();
  const changed = (await getProgressPhotos()).find((photo) => photo.id === original.id)!;
  expect(changed).toMatchObject({ pose: "SIDE", takenOn: "2026-09-02" });
  expect(await changed.image.arrayBuffer()).toEqual(await original.image.arrayBuffer());
  await screen.getByRole("button", { name: "COMPARE PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Same-pose photo comparison", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Manage side photo 2026-09-02 · 2 of 2", exact: true }).click();
  await screen.getByRole("button", { name: "HIDE PHOTO", exact: true }).click();
  await screen.getByRole("button", { name: "CONFIRM HIDE", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Photo hidden" })).toBeVisible();
  expect(await db.progressPhotos.count()).toBe(2); expect((await getProgressPhotos()).length).toBe(1);
  await expect.element(screen.getByRole("button", { name: "COMPARE PHOTOS", exact: true })).toBeDisabled();
  expect(screen.getByRole("region", { name: "Same-pose photo comparison", exact: true }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "MANAGE HIDDEN PHOTOS", exact: true }).click();
  await expect.element(screen.getByRole("img", { name: "Side progress photo taken 2026-09-02, hidden", exact: true })).toBeVisible();
});

it("supports keyboard view switching and explicit form submission with focus returned to the next entry", async () => {
  clock(); const screen = await mountComposition();
  screen.getByRole("button", { name: "MEASUREMENTS", exact: true }).element().focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("button", { name: "MEASUREMENTS", exact: true })).toHaveAttribute("aria-pressed", "true");
  const input = screen.getByRole("spinbutton", { name: "Inches", exact: true }); await input.fill("35.5"); input.element().focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("status").filter({ hasText: "Waist saved" })).toBeVisible();
  await expect.poll(() => document.activeElement?.id).toBe("measurement-inches");
  expect(await db.events.where("type").equals("MEASUREMENT_LOGGED").count()).toBe(1);
  screen.getByRole("button", { name: "PHOTOS", exact: true }).element().focus(); await userEvent.keyboard(" ");
  await expect.element(screen.getByRole("heading", { name: "Progress photos", exact: true })).toBeVisible();
});
