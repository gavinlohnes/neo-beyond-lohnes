export type TrainingFocus = "Chest" | "Triceps" | "Traps" | "Back" | "Legs" | "Shoulders" | "Core";
export type SessionMinutes = 35 | 50 | 65;

export interface DraftExercise {
  name: string;
  role: string;
  muscles: TrainingFocus[];
  sets: number;
  reps: string;
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

const ex = (name: string, role: string, muscles: TrainingFocus[], sets: number, reps: string, home: string): DraftExercise => ({ name, role, muscles, sets, reps, home });

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

export const TRAINING_FOCUS_OPTIONS: TrainingFocus[] = ["Chest", "Triceps", "Traps", "Back", "Legs", "Shoulders", "Core"];
