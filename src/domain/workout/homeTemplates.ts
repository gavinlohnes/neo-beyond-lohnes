import type { ExercisePrescription } from "./types";

const ex = (exerciseId: string, name: string, sets: number, repRangeLow: number, repRangeHigh: number): ExercisePrescription => ({ exerciseId, name, sets, repRangeLow, repRangeHigh, incrementLbs: 0 });

/** Reviewable bodyweight defaults. Creating these never links or starts them. */
export const GRAYSON_HOME_TEMPLATE_INPUTS = [
  { name: "Grayson HOME A", exercises: [ex("home-incline-push-up", "Incline Push-Up", 3, 6, 15), ex("home-bodyweight-squat", "Bodyweight Squat", 3, 8, 20), ex("home-close-grip-push-up", "Close-Grip Push-Up", 2, 5, 12), ex("home-dead-bug", "Dead Bug", 2, 6, 12)] },
  { name: "Grayson HOME B", exercises: [ex("home-prone-pull-down", "Prone Pull-Down", 3, 8, 15), ex("home-glute-bridge", "Glute Bridge", 3, 10, 20), ex("home-reverse-snow-angel", "Reverse Snow Angel", 2, 8, 15), ex("home-plank", "Plank", 2, 1, 3)] },
  { name: "Grayson HOME C", exercises: [ex("home-pike-push-up", "Pike Push-Up", 3, 5, 12), ex("home-split-squat", "Split Squat", 3, 6, 15), ex("home-diamond-push-up", "Diamond Push-Up", 2, 5, 12), ex("home-side-plank", "Side Plank", 2, 1, 3)] },
];
