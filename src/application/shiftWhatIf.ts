import type { PictureRow } from "./wholePictureProjection";
import { groupRuns, RUN_MEAN_FLOOR } from "./rotationProjection";

/**
 * BIG-IDEAS-001 item 1 — shift what-if (approved 2026-11-09). "What if my run is N shifts?" Look back at your own
 * complete work runs of exactly N recorded shifts (a run followed by recorded days off) and say what followed:
 * energy on the last shift, and main sleep on the first two days off, each with its day count. Silent under
 * RUN_MEAN_FLOOR comparable runs. A pattern from your records, never a prediction or advice. Read only.
 */
export interface WhatIfSide { mean: number | undefined; days: number }
export interface ShiftWhatIf { shifts: number; runs: number; lastShiftEnergy: WhatIfSide; offDay1Sleep: WhatIfSide; offDay2Sleep: WhatIfSide; enough: boolean }

const side = (values: (number | undefined)[]): WhatIfSide => {
  const v = values.filter((x): x is number => x !== undefined);
  return { mean: v.length >= RUN_MEAN_FLOOR ? v.reduce((a, b) => a + b, 0) / v.length : undefined, days: v.length };
};

export function shiftWhatIf(rows: readonly PictureRow[], shifts: number): ShiftWhatIf {
  const runs = groupRuns(rows);
  const matches = runs.flatMap((run, i) => {
    const next = runs[i + 1];
    // The first run may be clipped by the start of the history window (as in runPositions), so it never counts.
    return i > 0 && run.context === "WORK" && run.rows.length === shifts && next?.context === "OFF" ? [{ run, off: next }] : [];
  });
  return {
    shifts,
    runs: matches.length,
    lastShiftEnergy: side(matches.map((m) => m.run.rows.at(-1)!.energy)),
    offDay1Sleep: side(matches.map((m) => m.off.rows[0]?.sleepHours)),
    offDay2Sleep: side(matches.map((m) => m.off.rows[1]?.sleepHours)),
    enough: matches.length >= RUN_MEAN_FLOOR,
  };
}
