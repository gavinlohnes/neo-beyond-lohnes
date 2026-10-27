import { describe, expect, it } from "vitest";
import { lastWorkout, mostTrainedDayOff } from "../src/ui/screens/review/rotationCopy";
import type { RunPosition } from "../src/application/rotationProjection";
import type { PictureRow } from "../src/application/wholePictureProjection";

const place = (position: number, days: number, of: number, context: "WORK" | "OFF" = "OFF") => ({ context, position, trained: { days, of } } as RunPosition);

describe("ROTATION-002 — next-window copy", () => {
  it("names the most-trained day off only with enough runs and no tie", () => {
    expect(mostTrainedDayOff([place(1, 0, 4), place(2, 3, 4)])?.position).toBe(2);
    expect(mostTrainedDayOff([place(1, 2, 4), place(2, 2, 4)])).toBeNull();
    expect(mostTrainedDayOff([place(1, 2, 2)])).toBeNull();
    expect(mostTrainedDayOff([place(1, 3, 3, "WORK")])).toBeNull();
    expect(mostTrainedDayOff([place(1, 0, 5)])).toBeNull();
  });

  it("finds the newest finished day with a counted workout", () => {
    const rows = [{ start: "2026-10-20T21:30:00.000Z", sessions: 1 }, { start: "2026-10-22T21:30:00.000Z", sessions: 0 }] as PictureRow[];
    expect(lastWorkout(rows, "2026-10-27T03:00:00.000Z")).toEqual({ start: "2026-10-20T21:30:00.000Z", daysAgo: 6 });
    expect(lastWorkout([], "2026-10-27T03:00:00.000Z")).toBeNull();
  });
});
