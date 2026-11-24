import { db } from "../persistence/db";
import type { StandardTestKind } from "../domain/common/types";
import { isStandardTestKind, projectStandardResults, standardValueProblem, type StandardResult } from "../domain/workout/standardTests";

/** GRAYSON-TRAIN-STANDARDS-001: every standing standards result, newest first. Read only. */
export async function getStandardResults(): Promise<StandardResult[]> {
  const events = await db.events.where("type").anyOf(["STANDARD_TEST_RECORDED", "STANDARD_TEST_VOIDED", "LOG_VOID_UNDONE"]).toArray();
  return projectStandardResults(events);
}

/**
 * His own target per test ("Target: 13:30, set by you"), blank by default. A preference, not an event: localStorage
 * key `beyond.standardTargets.v1`, validated on read (anything unreadable or out of range is no target), carried in the
 * backup's settings block as "Standards targets".
 */
export const STANDARD_TARGETS_KEY = "beyond.standardTargets.v1";
export type StandardTargets = Partial<Record<StandardTestKind, number>>;

export function readStandardTargets(): StandardTargets {
  let raw: unknown;
  try { raw = JSON.parse(localStorage.getItem(STANDARD_TARGETS_KEY) ?? "null"); } catch { raw = null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const targets: StandardTargets = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isStandardTestKind(k) && typeof v === "number" && standardValueProblem(k, v) === null) targets[k] = v;
  }
  return targets;
}

/** Sets or clears (null) one target. Throws with the words to show when the value doesn't fit the test. */
export function writeStandardTarget(test: StandardTestKind, value: number | null): StandardTargets {
  const targets = readStandardTargets();
  if (value === null) delete targets[test];
  else {
    const problem = standardValueProblem(test, value);
    if (problem) throw new Error(`STANDARD_VALUE_INVALID: ${problem}`);
    targets[test] = value;
  }
  try { localStorage.setItem(STANDARD_TARGETS_KEY, JSON.stringify(targets)); } catch { /* storage blocked: unchanged */ }
  return targets;
}
