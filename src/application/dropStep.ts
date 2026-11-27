/**
 * GRAYSON-SET-TYPES-001: ADD DROP's step, his to change in MORE (5 to 50%, default 20%). Travels with backups
 * (settingsTransfer's TRAVELLING_SETTINGS). Reads never throw; a bad value reads as the default.
 */
export const DROP_STEP_KEY = "beyond.dropStep.v1";
export const DROP_STEP_DEFAULT = 20;
export const DROP_STEP_MIN = 5;
export const DROP_STEP_MAX = 50;

export function getDropStepPercent(): number {
  try {
    const n = Number(localStorage.getItem(DROP_STEP_KEY));
    return Number.isInteger(n) && n >= DROP_STEP_MIN && n <= DROP_STEP_MAX ? n : DROP_STEP_DEFAULT;
  } catch { return DROP_STEP_DEFAULT; }
}

export function setDropStepPercent(percent: number): void {
  if (!Number.isInteger(percent) || percent < DROP_STEP_MIN || percent > DROP_STEP_MAX) throw new Error(`DROP_STEP_INVALID: ${DROP_STEP_MIN} to ${DROP_STEP_MAX}%.`);
  try { localStorage.setItem(DROP_STEP_KEY, String(percent)); } catch { /* Storage may be unavailable. */ }
}

/** A drop set's weight: the step lighter, rounded down to the exercise's own weight step (never below 0). */
export function dropWeight(parentWeight: number, incrementLbs: number, percent = getDropStepPercent()): number {
  const step = incrementLbs > 0 ? incrementLbs : 5;
  return Math.max(0, Math.floor((parentWeight * (1 - percent / 100)) / step) * step);
}
