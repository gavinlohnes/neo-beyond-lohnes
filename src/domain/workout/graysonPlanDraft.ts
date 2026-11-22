export type TrainingFocus = "Chest" | "Triceps" | "Traps" | "Back" | "Legs" | "Shoulders" | "Core";
export type SessionMinutes = 35 | 50 | 65;

export interface DraftExercise {
  exerciseId: string;
  name: string;
  role: string;
  muscles: TrainingFocus[];
  sets: number;
  reps: string;
  repRangeLow: number;
  repRangeHigh: number;
  incrementLbs: number;
  home: string;
}

export interface DraftSession {
  id: "A" | "B" | "C";
  title: string;
  purpose: string;
  full: DraftExercise[];
  short: DraftExercise[];
  minimum: DraftExercise[];
  home: DraftExercise[];
}

const PRESCRIPTIONS: Record<string, Pick<DraftExercise, "exerciseId" | "repRangeLow" | "repRangeHigh" | "incrementLbs">> = {
  "Barbell Bench Press": { exerciseId: "barbell-bench-press", repRangeLow: 6, repRangeHigh: 8, incrementLbs: 5 },
  "Leg Press": { exerciseId: "leg-press", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 },
  "Seated Cable Row": { exerciseId: "seated-cable-row", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "Triceps Pressdown": { exerciseId: "triceps-pressdown", repRangeLow: 10, repRangeHigh: 15, incrementLbs: 5 },
  "Dumbbell Shrug": { exerciseId: "dumbbell-shrug", repRangeLow: 10, repRangeHigh: 15, incrementLbs: 5 },
  "Sit-Up Practice": { exerciseId: "sit-up-practice", repRangeLow: 8, repRangeHigh: 15, incrementLbs: 5 },
  "Hamstring Mobility": { exerciseId: "hamstring-mobility", repRangeLow: 1, repRangeHigh: 1, incrementLbs: 5 },
  "Dumbbell Romanian Deadlift": { exerciseId: "dumbbell-romanian-deadlift", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "Lat Pulldown": { exerciseId: "lat-pulldown", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "Machine Shoulder Press": { exerciseId: "machine-shoulder-press", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 },
  "Incline Dumbbell Press": { exerciseId: "incline-dumbbell-press", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "Face Pull": { exerciseId: "face-pull", repRangeLow: 12, repRangeHigh: 15, incrementLbs: 5 },
  "Plank or Dead Bug": { exerciseId: "plank-or-dead-bug", repRangeLow: 6, repRangeHigh: 12, incrementLbs: 5 },
  "Reverse Lunge": { exerciseId: "reverse-lunge", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "One-Arm Dumbbell Row": { exerciseId: "one-arm-dumbbell-row", repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  "Pec Deck": { exerciseId: "pec-deck", repRangeLow: 10, repRangeHigh: 15, incrementLbs: 10 },
  "Overhead Triceps Extension": { exerciseId: "overhead-triceps-extension", repRangeLow: 10, repRangeHigh: 15, incrementLbs: 5 },
  "Standing Calf Raise": { exerciseId: "standing-calf-raise", repRangeLow: 12, repRangeHigh: 20, incrementLbs: 5 },
  "One-Minute Sit-Up Practice": { exerciseId: "one-minute-sit-up-practice", repRangeLow: 1, repRangeHigh: 50, incrementLbs: 5 },
};

const ex = (name: string, role: string, muscles: TrainingFocus[], sets: number, reps: string, home: string): DraftExercise => {
  const prescription = PRESCRIPTIONS[name];
  if (!prescription) throw new Error(`Missing GRAYSON prescription for ${name}`);
  return { ...prescription, name, role, muscles, sets, reps, home };
};

const BASE: DraftSession[] = [
  { id: "A", title: "Bench strength", purpose: "Practice the tested press while training legs, horizontal pull, triceps and core.", full: [
    ex("Barbell Bench Press", "Primary strength press", ["Chest", "Triceps"], 3, "6–8", "Appropriate push-up level"),
    ex("Leg Press", "Knee-dominant legs", ["Legs"], 3, "8–12", "Chair or bodyweight squat"),
    ex("Seated Cable Row", "Horizontal pull", ["Back"], 3, "8–12", "Prone Y-T-W; movement only, not equivalent load"),
    ex("Triceps Pressdown", "Direct emphasis", ["Triceps"], 2, "10–15", "Close-grip incline push-up"),
    ex("Dumbbell Shrug", "Trap emphasis", ["Traps"], 2, "10–15", "Controlled scapular shrug"),
    ex("Sit-Up Practice", "Performance standard", ["Core"], 2, "controlled", "Same exercise"),
    ex("Hamstring Mobility", "Sit-and-reach support", ["Legs"], 2, "easy holds", "Same drill"),
  ], short: [], minimum: [], home: [] },
  { id: "B", title: "Pull and posterior chain", purpose: "Build the back, shoulders, traps and posterior chain while keeping a secondary press.", full: [
    ex("Dumbbell Romanian Deadlift", "Hip hinge", ["Legs"], 3, "8–12", "Glute bridge"),
    ex("Lat Pulldown", "Vertical pull", ["Back"], 3, "8–12", "Prone Y-T-W (movement only; loaded pull remains due)"),
    ex("Machine Shoulder Press", "Vertical press", ["Shoulders", "Triceps"], 2, "8–12", "Elevated pike push-up if appropriate"),
    ex("Incline Dumbbell Press", "Secondary chest work", ["Chest", "Triceps"], 2, "8–12", "Incline push-up"),
    ex("Face Pull", "Upper back and rear shoulders", ["Back", "Traps", "Shoulders"], 2, "12–15", "Prone Y-T-W"),
    ex("Dumbbell Shrug", "Trap emphasis", ["Traps"], 2, "10–15", "Controlled scapular shrug"),
    ex("Plank or Dead Bug", "Trunk control", ["Core"], 2, "controlled", "Same exercise"),
  ], short: [], minimum: [], home: [] },
  { id: "C", title: "Bench volume and balance", purpose: "Repeat the press at a manageable dose and complete balanced legs, pull and performance work.", full: [
    ex("Barbell Bench Press", "Volume press", ["Chest", "Triceps"], 3, "8–10", "Appropriate push-up level"),
    ex("Reverse Lunge", "Single-leg pattern", ["Legs"], 3, "8–12/side", "Bodyweight reverse lunge"),
    ex("One-Arm Dumbbell Row", "Horizontal pull", ["Back"], 3, "8–12/side", "Prone Y-T-W; movement only, not equivalent load"),
    ex("Pec Deck", "Direct chest emphasis", ["Chest"], 2, "10–15", "Push-up"),
    ex("Overhead Triceps Extension", "Direct triceps emphasis", ["Triceps"], 2, "10–15", "Close-grip incline push-up"),
    ex("Standing Calf Raise", "Lower-leg balance", ["Legs"], 2, "12–20", "Bodyweight calf raise"),
    ex("One-Minute Sit-Up Practice", "Performance standard", ["Core"], 2, "paced", "Same exercise"),
  ], short: [], minimum: [], home: [] },
];

function ordered(full: DraftExercise[], focus: TrainingFocus[]) {
  const foundations = full.slice(0, 3);
  return [...foundations, ...full.slice(3).sort((a, b) => Number(b.muscles.some((m) => focus.includes(m))) - Number(a.muscles.some((m) => focus.includes(m))))];
}

export function buildGraysonPlanDraft(focus: TrainingFocus[], minutes: SessionMinutes): DraftSession[] {
  return BASE.map((session) => {
    const full = ordered(session.full, focus).slice(0, minutes === 35 ? 5 : minutes === 50 ? 6 : 7);
    const short = full.slice(0, 3);
    const minimum = [full[0]!, full[1]!];
    const home = full.slice(0, 5).map((item) => ({ ...item, name: item.home, role: `${item.role} · home`, sets: Math.min(item.sets, 2), reps: "comfortable, controlled" }));
    return { ...session, full, short, minimum, home };
  });
}

/** The exact owner-reviewable records GRAYSON can save; variants remain preview-only. */
export function buildGraysonTemplateSetDraft(focus: TrainingFocus[], minutes: SessionMinutes) {
  return buildGraysonPlanDraft(focus, minutes).map((session) => ({
    name: `Grayson ${session.id} - ${session.title}`,
    exercises: session.full.map(({ exerciseId, name, sets, repRangeLow, repRangeHigh, incrementLbs }) => ({
      exerciseId,
      name,
      sets,
      repRangeLow,
      repRangeHigh,
      incrementLbs,
    })),
  }));
}

export const TRAINING_FOCUS_OPTIONS: TrainingFocus[] = ["Chest", "Triceps", "Traps", "Back", "Legs", "Shoulders", "Core"];
