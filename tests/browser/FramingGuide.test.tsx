import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { setWorkContext, startDay } from "../../src/application/commands";
import { addProgressPhoto } from "../../src/application/progressPhotoCommands";
import { getProgressPhotos } from "../../src/application/progressPhotoQueries";
import { db } from "../../src/persistence/db";
import { coverCrop } from "../../src/ui/screens/body/FramingGuide";

/** REVIEW-001 optional framing guide: live camera + ghost of the last same-pose photo, saved through the existing flow. */
const realGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
let tracks: MediaStreamTrack[] = [];
/** A width × height stream: red outside the guide's 3:4 view, blue inside it (gray when even is set). */
function fakeCamera(width = 240, height = 320, even = true) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d")!;
  const view = coverCrop(width, height);
  const paint = () => {
    context.fillStyle = even ? "#6a6a6a" : "#ff0000"; context.fillRect(0, 0, width, height);
    if (!even) { context.fillStyle = "#0000ff"; context.fillRect(view.sx, view.sy, view.sw, view.sh); }
  };
  paint(); const timer = setInterval(paint, 50);
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: vi.fn(async () => {
    const stream = canvas.captureStream(20);
    tracks = stream.getTracks();
    return stream;
  }) });
  return () => clearInterval(timer);
}
afterEach(async () => {
  await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800);
  if (realGetUserMedia) Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: realGetUserMedia });
});
async function photoBlob(): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 60; canvas.height = 80;
  canvas.getContext("2d")!.fillRect(0, 0, 60, 80);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg"));
}
function clock() { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 18, 20)); }
async function openPhotos() {
  clock();
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await screen.getByRole("button", { name: "YOUR PROGRESS", exact: true }).click();
  await screen.getByRole("button", { name: "PHOTOS", exact: true }).click();
  return screen;
}

for (const width of [320, 360, 412]) it(`frames a new photo over the last same-pose ghost and saves it through the existing flow at ${width}px`, async () => {
  await page.viewport(width, 800);
  const stop = fakeCamera();
  try {
    clock();
    await addProgressPhoto(await photoBlob(), { pose: "SIDE", takenOn: "2026-10-01" }, "IMPORT");
    const screen = await openPhotos();
    await screen.getByRole("button", { name: "USE FRAMING GUIDE", exact: true }).click();
    const guide = screen.getByRole("dialog", { name: /framing guide$/ });
    await expect.element(guide).toBeVisible();
    await guide.getByRole("button", { name: "SIDE", exact: true }).click();
    await expect.poll(() => guide.element().querySelector(".framing-guide__ghost")).not.toBeNull();
    await expect.element(guide.getByText("Line up with your last side photo. Same distance, same light. Nothing saves until you choose SAVE PHOTO.", { exact: true })).toBeVisible();
    await expect.element(guide.getByRole("button", { name: "CAPTURE", exact: true })).toBeEnabled();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    for (const button of guide.element().querySelectorAll<HTMLElement>("button")) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect((await axe.run(guide.element(), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations).toEqual([]);
    const before = await db.progressPhotos.count();
    await guide.getByRole("button", { name: "CAPTURE", exact: true }).click();
    await expect.poll(() => document.querySelector(".framing-guide")).toBeNull();
    await expect.poll(() => tracks.length > 0 && tracks.every((track) => track.readyState === "ended")).toBe(true);
    expect(await db.progressPhotos.count()).toBe(before); // nothing saved yet
    await expect.element(screen.getByText("Selected photo · not saved yet", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("combobox", { name: "Photo pose" })).toHaveValue("SIDE");
    await screen.getByRole("button", { name: "SAVE PHOTO", exact: true }).click();
    await expect.poll(async () => (await getProgressPhotos({ pose: "SIDE" })).length).toBe(2);
    const saved = (await getProgressPhotos({ pose: "SIDE" })).at(-1)!;
    expect(saved.source).toBe("CAMERA");
  } finally { stop(); }
});

it("says plainly when the camera is unavailable and stops nothing it didn't start", async () => {
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: vi.fn(async () => { throw new DOMException("denied", "NotAllowedError"); }) });
  const screen = await openPhotos();
  await screen.getByRole("button", { name: "USE FRAMING GUIDE", exact: true }).click();
  const guide = screen.getByRole("dialog", { name: /framing guide$/ });
  await expect.element(guide.getByRole("alert")).toHaveTextContent("Camera unavailable here. Use TAKE PHOTO or IMPORT PHOTO instead.");
  await expect.element(guide.getByRole("button", { name: "CAPTURE", exact: true })).toBeDisabled();
  await guide.getByRole("button", { name: "CLOSE", exact: true }).click();
  await expect.poll(() => document.querySelector(".framing-guide")).toBeNull();
  expect(await db.progressPhotos.count()).toBe(0);
});

for (const [width, height] of [[160, 90], [90, 200]] as const) it(`captures the framing the guide shows from a ${width}×${height} camera, not the whole frame`, async () => {
  const stop = fakeCamera(width, height, false);
  try {
    const screen = await openPhotos();
    await screen.getByRole("button", { name: "USE FRAMING GUIDE", exact: true }).click();
    const guide = screen.getByRole("dialog", { name: /framing guide$/ });
    await expect.element(guide.getByRole("button", { name: "CAPTURE", exact: true })).toBeEnabled();
    await guide.getByRole("button", { name: "CAPTURE", exact: true }).click();
    await screen.getByRole("button", { name: "SAVE PHOTO", exact: true }).click();
    await expect.poll(async () => (await getProgressPhotos({})).length).toBe(1);
    const bitmap = await createImageBitmap((await getProgressPhotos({}))[0]!.image);
    expect(bitmap.width / bitmap.height).toBeCloseTo(3 / 4, 1);
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!; context.drawImage(bitmap, 0, 0);
    // Every edge is inside the view the operator saw: blue, never the red outside it.
    for (const [x, y] of [[1, bitmap.height / 2], [bitmap.width - 2, bitmap.height / 2], [bitmap.width / 2, 1], [bitmap.width / 2, bitmap.height - 2]]) {
      const [r, , b] = context.getImageData(Math.floor(x!), Math.floor(y!), 1, 1).data;
      expect(b, `pixel ${x},${y}`).toBeGreaterThan(150);
      expect(r, `pixel ${x},${y}`).toBeLessThan(100);
    }
  } finally { stop(); }
});
