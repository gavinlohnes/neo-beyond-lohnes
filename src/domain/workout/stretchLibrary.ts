// Domain layer must not import React, Dexie, or UI code.

/**
 * GRAYSON-HOME-STRETCH-001 slice B (Gavin, 2026-11-26: "body weight exercises and stretching"): a small hand-written
 * set of stretches and three starter routines named for when he uses them. Written fresh in plain words from general
 * wellness knowledge, not copied from any app or site. General cues, not treatment: every routine says to stop if
 * anything hurts.
 */
export type StretchArea = "Neck" | "Upper back" | "Chest" | "Shoulders" | "Back" | "Hips" | "Legs" | "Whole body";

export interface Stretch {
  id: string;
  name: string;
  area: StretchArea;
  /** Done on each side in turn when a routine step says both sides. */
  oneSided: boolean;
  defaultHoldSeconds: number;
  cues: string[];
  /** Time only (slow breathing): no position to hold. */
  timeOnly?: true;
}

export const STRETCHES: readonly Stretch[] = [
  { id: "stretch-neck-side", name: "Neck side stretch", area: "Neck", oneSided: true, defaultHoldSeconds: 30, cues: ["Sit or stand tall, shoulders down", "Tip your ear toward your shoulder", "Keep the other shoulder relaxed and low"] },
  { id: "stretch-upper-back-reach", name: "Upper-back reach", area: "Upper back", oneSided: false, defaultHoldSeconds: 30, cues: ["Clasp your hands in front at chest height", "Round your upper back and push your hands away", "Let your head drop gently"] },
  { id: "stretch-doorway-chest", name: "Doorway chest stretch", area: "Chest", oneSided: false, defaultHoldSeconds: 30, cues: ["Forearms on the door frame, elbows at shoulder height", "Step one foot through until you feel the chest open", "Keep your ribs down; don't arch"] },
  { id: "stretch-standing-quad", name: "Standing quad stretch", area: "Legs", oneSided: true, defaultHoldSeconds: 30, cues: ["Hold a wall for balance", "Bring your heel toward your seat", "Knees side by side, hips pushed slightly forward"] },
  { id: "stretch-kneeling-hip-flexor", name: "Kneeling hip-flexor stretch", area: "Hips", oneSided: true, defaultHoldSeconds: 30, cues: ["Kneel on one knee, the other foot in front", "Squeeze the back glute and tuck your hips under", "Shift forward until the front of the hip opens"] },
  { id: "stretch-standing-calf", name: "Standing calf stretch", area: "Legs", oneSided: true, defaultHoldSeconds: 30, cues: ["Hands on a wall, one foot back", "Back heel down, back knee straight", "Lean in until the calf stretches"] },
  { id: "stretch-seated-hamstring", name: "Seated hamstring fold", area: "Legs", oneSided: false, defaultHoldSeconds: 30, cues: ["Sit with legs straight out in front", "Hinge forward from the hips with a long back", "Reach toward your shins, not your toes"] },
  { id: "stretch-figure-4", name: "Figure-4 glute stretch (lying)", area: "Hips", oneSided: true, defaultHoldSeconds: 30, cues: ["Lie on your back, cross one ankle over the other knee", "Pull the bottom thigh toward your chest", "Keep your head and shoulders relaxed on the floor"] },
  { id: "stretch-cross-body-shoulder", name: "Cross-body shoulder stretch", area: "Shoulders", oneSided: true, defaultHoldSeconds: 30, cues: ["Bring one arm across your chest", "Hold it above the elbow with the other hand", "Keep the shoulder down, away from your ear"] },
  { id: "stretch-overhead-lat", name: "Overhead lat stretch", area: "Back", oneSided: true, defaultHoldSeconds: 30, cues: ["Reach one arm overhead", "Lean your body the other way", "Feel it along your side, from hip to armpit"] },
  { id: "stretch-lying-twist", name: "Lying spinal twist", area: "Back", oneSided: true, defaultHoldSeconds: 30, cues: ["Lie on your back, arms out wide", "Drop both bent knees to one side", "Let your shoulders stay on the floor"] },
  { id: "stretch-childs-pose", name: "Child's pose", area: "Back", oneSided: false, defaultHoldSeconds: 30, cues: ["Kneel and sit back toward your heels", "Walk your hands forward and rest your forehead down", "Breathe into your back"] },
  { id: "stretch-legs-up-wall", name: "Legs up the wall", area: "Whole body", oneSided: false, defaultHoldSeconds: 60, cues: ["Lie with your seat near a wall, legs up it", "Arms out, palms up", "Let everything go heavy"] },
  { id: "stretch-slow-breathing", name: "Slow breathing", area: "Whole body", oneSided: false, defaultHoldSeconds: 60, cues: ["In through your nose for about four", "Out slowly for about six", "Let your shoulders and jaw soften"], timeOnly: true },
];

export const STRETCH_BY_ID: ReadonlyMap<string, Stretch> = new Map(STRETCHES.map((s) => [s.id, s]));

/**
 * One step of a routine: which stretch, how long each hold, how many rounds, and whether a one-sided stretch is done on
 * both sides (left, right, left, right for two rounds).
 */
export interface StretchStep { stretchId: string; holdSeconds: number; bothSides: boolean; rounds: number }
export interface StretchRoutine {
  id: string;
  name: string;
  steps: StretchStep[];
  /** Which starter this began as, so RESET can bring it back; absent for his own. */
  starter?: StarterRoutineId;
}
export type StarterRoutineId = "AFTER_SHIFT" | "BEFORE_SLEEP" | "AFTER_LIFTING";

export const STRETCH_HOLD_MIN = 10;
export const STRETCH_HOLD_MAX = 300;
export const STRETCH_STEPS_MAX = 30;
export const STRETCH_NAME_MAX = 60;
export const STRETCH_ROUNDS_MAX = 5;

const step = (stretchId: string): StretchStep => ({ stretchId, holdSeconds: 30, bothSides: STRETCH_BY_ID.get(stretchId)!.oneSided, rounds: 2 });

/**
 * The three starters: 30 s holds, both sides on one-sided stretches, two rounds each, so each runs 8 to 10 minutes
 * (one round of six 30 s holds would be about 4).
 */
export const STARTER_ROUTINES: Readonly<Record<StarterRoutineId, StretchRoutine>> = {
  AFTER_SHIFT: {
    id: "starter-after-shift", name: "After shift", starter: "AFTER_SHIFT",
    steps: [step("stretch-neck-side"), step("stretch-upper-back-reach"), step("stretch-doorway-chest"), step("stretch-kneeling-hip-flexor"), step("stretch-standing-calf"), step("stretch-childs-pose")],
  },
  BEFORE_SLEEP: {
    id: "starter-before-sleep", name: "Before sleep", starter: "BEFORE_SLEEP",
    steps: [step("stretch-seated-hamstring"), step("stretch-figure-4"), step("stretch-lying-twist"), step("stretch-childs-pose"), step("stretch-legs-up-wall"), step("stretch-slow-breathing")],
  },
  AFTER_LIFTING: {
    id: "starter-after-lifting", name: "After lifting", starter: "AFTER_LIFTING",
    steps: [step("stretch-standing-quad"), step("stretch-seated-hamstring"), step("stretch-doorway-chest"), step("stretch-overhead-lat"), step("stretch-figure-4"), step("stretch-standing-calf")],
  },
};

export const STARTER_ORDER: readonly StarterRoutineId[] = ["AFTER_SHIFT", "BEFORE_SLEEP", "AFTER_LIFTING"];

/** How many holds a step plays: rounds, doubled for a one-sided stretch done on both sides. */
export const stepHolds = (s: StretchStep): number => s.rounds * (s.bothSides && STRETCH_BY_ID.get(s.stretchId)?.oneSided ? 2 : 1);

/** The routine's played length in seconds. */
export function stretchRoutineSeconds(routine: Pick<StretchRoutine, "steps">): number {
  return routine.steps.reduce((sum, s) => sum + s.holdSeconds * stepHolds(s), 0);
}

/** A routine he could save: a name, 1 to 30 known stretches, each hold 10 s to 5 min. Returns why not, or null. */
export function stretchRoutineProblem(routine: Pick<StretchRoutine, "name" | "steps">): string | null {
  const name = routine.name.trim();
  if (!name) return "Give the routine a name.";
  if (name.length > STRETCH_NAME_MAX) return `Keep the name to ${STRETCH_NAME_MAX} characters.`;
  if (routine.steps.length === 0) return "Add at least one stretch.";
  if (routine.steps.length > STRETCH_STEPS_MAX) return `Keep a routine to ${STRETCH_STEPS_MAX} stretches.`;
  for (const s of routine.steps) {
    if (!STRETCH_BY_ID.has(s.stretchId)) return "One stretch isn't in the list any more.";
    if (!Number.isInteger(s.holdSeconds) || s.holdSeconds < STRETCH_HOLD_MIN || s.holdSeconds > STRETCH_HOLD_MAX) return `Holds are ${STRETCH_HOLD_MIN} seconds to ${STRETCH_HOLD_MAX / 60} minutes.`;
    if (!Number.isInteger(s.rounds) || s.rounds < 1 || s.rounds > STRETCH_ROUNDS_MAX) return `Rounds are 1 to ${STRETCH_ROUNDS_MAX}.`;
  }
  return null;
}
