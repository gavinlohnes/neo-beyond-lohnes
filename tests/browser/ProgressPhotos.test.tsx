/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportDB } from "dexie-export-import";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import {
  addProgressPhoto,
  correctProgressPhoto,
  deleteProgressPhotoPermanently,
  hideProgressPhoto,
} from "../../src/application/progressPhotoCommands";
import { getProgressPhotos } from "../../src/application/progressPhotoQueries";
import { PHOTO_MAX_EDGE_PX } from "../../src/domain/body/types";

/**
 * REVIEW-001 Phase 1a progress photos, in real Chromium (its own image
 * decoder and canvas): metadata is stripped before anything is stored,
 * photos travel in the normal backup (Decision 2, option (a)), and a
 * permanent delete removes the image from this device and from later
 * backups (Gavin, 2026-10-17).
 */

const NOW = new Date(2026, 9, 17, 12);
const SECRET = "GPS-41.8781N-87.6298W-SECRET-DEVICE";

beforeEach(async () => {
  await db.open();
});
afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

function canvasJpeg(width: number, height: number, noise = false): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#5a3a2a");
  gradient.addColorStop(1, "#c9a27e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  if (noise) {
    // Photo-like texture so the size measurement isn't flattered by a flat image.
    const image = context.getImageData(0, 0, width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = ((i * 2654435761) >>> 24) % 24;
      image.data[i] = Math.min(255, image.data[i]! + n);
      image.data[i + 1] = Math.min(255, image.data[i + 1]! + n);
    }
    context.putImageData(image, 0, 0);
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

/** A camera-style JPEG: an APP1 EXIF segment, carrying SECRET, right after the start-of-image marker. */
async function jpegWithExif(width: number, height: number): Promise<Blob> {
  const base = new Uint8Array(await (await canvasJpeg(width, height)).arrayBuffer());
  const body = [...new TextEncoder().encode("Exif"), 0, 0, 0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...new TextEncoder().encode(SECRET)];
  const length = body.length + 2;
  const segment = [0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...body];
  const out = new Uint8Array(base.length + segment.length);
  out.set(base.subarray(0, 2));
  out.set(segment, 2);
  out.set(base.subarray(2), 2 + segment.length);
  return new Blob([out], { type: "image/jpeg" });
}

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function contains(haystack: Uint8Array, needle: string): boolean {
  return new TextDecoder("latin1").decode(haystack).includes(needle);
}

async function restore(blob: Blob): Promise<void> {
  await applyAnyRestore(new File([blob], "backup.json", { type: "application/json" }));
}

describe("adding a photo", () => {
  it("stores a re-encoded JPEG with no EXIF segment and none of the original metadata", async () => {
    const original = await jpegWithExif(640, 480);
    expect(contains(await bytes(original), SECRET)).toBe(true);
    expect(contains(await bytes(original), "Exif")).toBe(true);

    const photo = await addProgressPhoto(original, { pose: "FRONT", takenOn: "2026-10-17" }, "CAMERA", NOW);
    const [stored] = await db.progressPhotos.toArray();
    const storedBytes = await bytes(stored!.image);
    expect(stored!.image.type).toBe("image/jpeg");
    expect([storedBytes[0], storedBytes[1]]).toEqual([0xff, 0xd8]);
    expect(contains(storedBytes, SECRET)).toBe(false);
    expect(contains(storedBytes, "Exif")).toBe(false);
    expect(photo).toMatchObject({ pose: "FRONT", takenOn: "2026-10-17", source: "CAMERA", width: 640, height: 480, byteSize: stored!.image.size });

    const [event] = await db.events.where("type").equals("PROGRESS_PHOTO_ADDED").toArray();
    expect(event!.payload).toMatchObject({ photoId: photo.id, pose: "FRONT", takenOn: "2026-10-17", source: "CAMERA" });
    expect(event!.beyondDayId).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain(SECRET);
  });

  it("scales a large photo to the maximum edge, keeping its proportions", async () => {
    const photo = await addProgressPhoto(await canvasJpeg(4032, 3024), { pose: "SIDE", takenOn: "2026-10-01" }, "IMPORT", NOW);
    expect([photo.width, photo.height]).toEqual([PHOTO_MAX_EDGE_PX, 1200]);
  });

  it("refuses an unreadable file, a future date and an invalid pose, writing nothing", async () => {
    const jpeg = await canvasJpeg(32, 32);
    await expect(addProgressPhoto(new Blob(["not an image"], { type: "image/jpeg" }), { pose: "FRONT", takenOn: "2026-10-17" }, "IMPORT", NOW)).rejects.toThrow(/^PHOTO_UNREADABLE:/);
    await expect(addProgressPhoto(jpeg, { pose: "FRONT", takenOn: "2026-10-18" }, "CAMERA", NOW)).rejects.toThrow(/^PHOTO_IN_FUTURE:/);
    await expect(addProgressPhoto(jpeg, { pose: "TOP" as never, takenOn: "2026-10-17" }, "CAMERA", NOW)).rejects.toThrow();
    expect(await db.progressPhotos.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });
});

describe("correcting, hiding and deleting", () => {
  it("corrects pose and date in place, with an event; the image is unchanged", async () => {
    const photo = await addProgressPhoto(await canvasJpeg(64, 64), { pose: "FRONT", takenOn: "2026-10-10" }, "IMPORT", NOW);
    const before = await bytes(photo.image);
    await correctProgressPhoto(photo.id, { pose: "BACK", takenOn: "2026-10-09" }, NOW);
    const [after] = await getProgressPhotos();
    expect(after).toMatchObject({ id: photo.id, pose: "BACK", takenOn: "2026-10-09" });
    expect(await bytes(after!.image)).toEqual(before);
    await expect(correctProgressPhoto(photo.id, { pose: "BACK" }, NOW)).rejects.toThrow(/^NO_OP_CORRECTION:/);
    await expect(correctProgressPhoto(photo.id, { takenOn: "2026-12-01" }, NOW)).rejects.toThrow(/^PHOTO_IN_FUTURE:/);
    expect(await db.events.where("type").equals("PROGRESS_PHOTO_CORRECTED").count()).toBe(1);
  });

  it("hide keeps the image but leaves it out of the default list; repeating is a no-op", async () => {
    const photo = await addProgressPhoto(await canvasJpeg(64, 64), { pose: "FRONT", takenOn: "2026-10-10" }, "IMPORT", NOW);
    await hideProgressPhoto(photo.id);
    await hideProgressPhoto(photo.id);
    expect(await getProgressPhotos()).toEqual([]);
    const [hidden] = await getProgressPhotos({ includeHidden: true });
    expect(hidden!.hiddenAt).toBeDefined();
    expect(hidden!.image.size).toBe(photo.byteSize);
    expect(await db.events.where("type").equals("PROGRESS_PHOTO_HIDDEN").count()).toBe(1);
  });

  it("delete permanently removes the image from this device; the event keeps no image data", async () => {
    const photo = await addProgressPhoto(await jpegWithExif(64, 64), { pose: "FRONT", takenOn: "2026-10-10" }, "CAMERA", NOW);
    await deleteProgressPhotoPermanently(photo.id);
    await deleteProgressPhotoPermanently(photo.id);
    expect(await db.progressPhotos.count()).toBe(0);
    expect(await getProgressPhotos({ includeHidden: true })).toEqual([]);
    const deleted = await db.events.where("type").equals("PROGRESS_PHOTO_DELETED").toArray();
    expect(deleted.map((e) => e.payload)).toEqual([expect.objectContaining({ photoId: photo.id })]);
    await expect(deleteProgressPhotoPermanently("never-existed")).rejects.toThrow(/^PHOTO_NOT_FOUND:/);
  });
});

describe("backups (Decision 2, option (a): photos in the normal backup)", () => {
  it("a backup carries every photo, hidden ones included, and restore brings back identical images", async () => {
    const shown = await addProgressPhoto(await canvasJpeg(320, 240), { pose: "FRONT", takenOn: "2026-10-01" }, "IMPORT", NOW);
    const hidden = await addProgressPhoto(await canvasJpeg(240, 320), { pose: "SIDE", takenOn: "2026-10-02" }, "IMPORT", NOW);
    await hideProgressPhoto(hidden.id);
    const backup = await exportDB(db);
    const shownBytes = await bytes(shown.image);
    const hiddenBytes = await bytes(hidden.image);

    await Promise.all(db.tables.map((t) => t.clear()));
    await restore(backup);

    const restored = await getProgressPhotos({ includeHidden: true });
    expect(restored.map((p) => [p.id, p.pose, p.takenOn, Boolean(p.hiddenAt)])).toEqual([
      [shown.id, "FRONT", "2026-10-01", false],
      [hidden.id, "SIDE", "2026-10-02", true],
    ]);
    expect(await bytes(restored[0]!.image)).toEqual(shownBytes);
    expect(await bytes(restored[1]!.image)).toEqual(hiddenBytes);
    expect(restored[0]!.image.type).toBe("image/jpeg");
  });

  it("after delete permanently, a new backup no longer contains the photo", async () => {
    const photo = await addProgressPhoto(await canvasJpeg(320, 240), { pose: "FRONT", takenOn: "2026-10-01" }, "IMPORT", NOW);
    const before = JSON.parse(await (await exportDB(db)).text());
    expect(before.data.tables.find((t: { name: string }) => t.name === "progressPhotos").rowCount).toBe(1);
    await deleteProgressPhotoPermanently(photo.id);
    const after = JSON.parse(await (await exportDB(db)).text());
    expect(after.data.tables.find((t: { name: string }) => t.name === "progressPhotos").rowCount).toBe(0);
    expect(after.data.data.find((t: { tableName: string }) => t.tableName === "progressPhotos").rows).toEqual([]);
    // The event trail names the photo, but no image data is left anywhere in the backup.
    expect(JSON.stringify(after)).not.toContain("image/jpeg");
    expect(JSON.stringify(before)).toContain("image/jpeg");
  });

  it("restoring an older (v12) backup, which predates photos, leaves no photos behind", async () => {
    await addProgressPhoto(await canvasJpeg(64, 64), { pose: "FRONT", takenOn: "2026-10-01" }, "IMPORT", NOW);
    const json = JSON.parse(await (await exportDB(db)).text());
    json.data.databaseVersion = 12;
    json.data.tables = json.data.tables.filter((t: { name: string }) => t.name !== "progressPhotos");
    json.data.data = json.data.data.filter((t: { tableName: string }) => t.tableName !== "progressPhotos");
    await restore(new Blob([JSON.stringify(json)]));
    expect(await db.progressPhotos.count()).toBe(0);
  });

  it("measures real backup sizes for three full-resolution photos", async () => {
    const empty = (await exportDB(db)).size;
    const photos = [];
    for (const pose of ["FRONT", "SIDE", "BACK"] as const) {
      photos.push(await addProgressPhoto(await canvasJpeg(4032, 3024, true), { pose, takenOn: "2026-10-17" }, "CAMERA", NOW));
    }
    const withPhotos = (await exportDB(db)).size;
    const photoBytes = photos.reduce((sum, p) => sum + p.byteSize, 0);
    const growth = withPhotos - empty;
    console.log(
      `[backup size] 3 photos from 4032x3024 sources: stored ${photos.map((p) => `${p.width}x${p.height} ${Math.round(p.byteSize / 1024)} KB`).join(", ")}; ` +
        `backup grew ${Math.round(growth / 1024)} KB (${(growth / photoBytes).toFixed(2)}x the image bytes)`,
    );
    for (const p of photos) expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(PHOTO_MAX_EDGE_PX);
    // The export stores images as base64 text, about 4/3 of their bytes.
    expect(growth).toBeGreaterThan(photoBytes);
    expect(growth).toBeLessThan(photoBytes * 1.5);
  });
});
