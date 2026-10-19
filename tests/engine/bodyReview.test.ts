import { describe, expect, it } from "vitest";
import { summarizePhotos, summarizeSite } from "../../src/engine/bodyReview";

describe("body review questions", () => {
  const entries = [
    { site: "WAIST", inches: 36.25, measuredOn: "2026-09-01" },
    { site: "CHEST", inches: 42, measuredOn: "2026-09-01" },
    { site: "WAIST", inches: 35.75, measuredOn: "2026-10-01" },
    { site: "WAIST", inches: 35.5, measuredOn: "2026-10-15" },
  ];
  it("reports the latest reading and its changes since the previous and first readings", () => {
    const waist = summarizeSite(entries, "WAIST");
    expect([waist.count, waist.latest?.inches, waist.sincePrevious, waist.sinceFirst]).toEqual([3, 35.5, -0.25, -0.75]);
    expect(waist.first?.measuredOn).toBe("2026-09-01");
  });
  it("gives a single reading no change, and a missing site nothing", () => {
    expect(summarizeSite(entries, "CHEST")).toMatchObject({ count: 1, sinceFirst: undefined, sincePrevious: undefined });
    expect(summarizeSite(entries, "ARMS")).toMatchObject({ count: 0, latest: undefined });
  });
  it("counts visible photos per pose with their date span, ignoring hidden ones", () => {
    const photos = [
      { pose: "FRONT", takenOn: "2026-10-01" }, { pose: "FRONT", takenOn: "2026-09-01" },
      { pose: "SIDE", takenOn: "2026-10-02" }, { pose: "SIDE", takenOn: "2026-10-09", hiddenAt: "2026-10-10T00:00:00.000Z" },
    ];
    expect(summarizePhotos(photos, ["FRONT", "SIDE", "BACK"])).toEqual([
      { pose: "FRONT", count: 2, first: "2026-09-01", latest: "2026-10-01", comparable: true },
      { pose: "SIDE", count: 1, first: "2026-10-02", latest: "2026-10-02", comparable: false },
      { pose: "BACK", count: 0, first: undefined, latest: undefined, comparable: false },
    ]);
  });
});
