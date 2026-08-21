import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { captureItem, resolveCaptureItem, reopenCaptureItem, startDay } from "../../src/application/commands";
import { getOpenCaptureItems, getAllCaptureItems } from "../../src/application/queries";
import { applyAnyRestore } from "../../src/persistence/restore";

/**
 * Overdrive Phase 10 (first connective capability). Deliberately the
 * smallest slice of the approved CAPTURE R&D that doesn't require
 * inventing unbuilt policy — see CaptureItem's doc comment in
 * domain/common/types.ts. No classification, no AI, no linking to any
 * other domain: raw text in, open/resolved state, nothing else.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("captureItem — the only writer", () => {
  it("rejects empty or whitespace-only text rather than creating a blank record", async () => {
    await expect(captureItem("")).rejects.toThrow("EMPTY_CAPTURE");
    await expect(captureItem("   ")).rejects.toThrow("EMPTY_CAPTURE");
    expect(await getAllCaptureItems()).toHaveLength(0);
  });

  it("trims surrounding whitespace and stores the rest verbatim", async () => {
    const item = await captureItem("  call the dentist  ");
    expect(item.text).toBe("call the dentist");
  });

  it("creates an OPEN item with no resolvedAt", async () => {
    const item = await captureItem("water the plants");
    expect(item.status).toBe("OPEN");
    expect(item.resolvedAt).toBeUndefined();
    expect(item.capturedAt).toBeTypeOf("string");
  });

  it("does not require an active BeyondDay — capture is not day-scoped", async () => {
    // Deliberately no startDay() call here.
    await expect(captureItem("no day started yet")).resolves.not.toThrow();
    expect(await getOpenCaptureItems()).toHaveLength(1);
  });

  it("does not log any DomainEvent — capture is its own record, not day-scoped history", async () => {
    const day = await startDay();
    const eventsBefore = await db.events.where("beyondDayId").equals(day.id).count();
    await captureItem("something to remember");
    expect(await db.events.where("beyondDayId").equals(day.id).count()).toBe(eventsBefore);
  });
});

describe("getOpenCaptureItems / getAllCaptureItems", () => {
  it("returns items oldest-first, and only OPEN ones from getOpenCaptureItems", async () => {
    const first = await captureItem("first thought");
    const second = await captureItem("second thought");
    await resolveCaptureItem(second.id);

    const open = await getOpenCaptureItems();
    expect(open.map((i) => i.id)).toEqual([first.id]);

    const all = await getAllCaptureItems();
    expect(all.map((i) => i.id)).toEqual([first.id, second.id]);
  });
});

describe("resolveCaptureItem / reopenCaptureItem", () => {
  it("resolving sets status and resolvedAt, and removes it from the open list", async () => {
    const item = await captureItem("pay the internet bill");
    await resolveCaptureItem(item.id);

    const all = await getAllCaptureItems();
    const resolved = all.find((i) => i.id === item.id)!;
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTypeOf("string");
    expect(await getOpenCaptureItems()).toHaveLength(0);
  });

  it("reopening undoes an accidental resolve — status flips back, resolvedAt clears, text is untouched", async () => {
    const item = await captureItem("ask about the warranty");
    await resolveCaptureItem(item.id);
    await reopenCaptureItem(item.id);

    const all = await getAllCaptureItems();
    const reopened = all.find((i) => i.id === item.id)!;
    expect(reopened.status).toBe("OPEN");
    expect(reopened.resolvedAt).toBeUndefined();
    expect(reopened.text).toBe("ask about the warranty");
    expect(await getOpenCaptureItems()).toHaveLength(1);
  });

  it("resolving does not delete the record — it stays in getAllCaptureItems permanently", async () => {
    const item = await captureItem("something resolved");
    await resolveCaptureItem(item.id);
    expect((await getAllCaptureItems()).some((i) => i.id === item.id)).toBe(true);
  });
});

describe("CaptureItem survives native backup export/restore", () => {
  it("round-trips open and resolved items with status intact", async () => {
    const open = await captureItem("still open");
    const resolved = await captureItem("will be resolved");
    await resolveCaptureItem(resolved.id);

    const blob = await db.export({ prettyJson: true });
    const backupFile = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await captureItem("this should not survive the restore");
    expect(await getAllCaptureItems()).toHaveLength(3);

    await applyAnyRestore(backupFile);

    const all = await getAllCaptureItems();
    expect(all.map((i) => i.id).sort()).toEqual([open.id, resolved.id].sort());
    expect(all.find((i) => i.id === open.id)!.status).toBe("OPEN");
    expect(all.find((i) => i.id === resolved.id)!.status).toBe("RESOLVED");
  });
});
