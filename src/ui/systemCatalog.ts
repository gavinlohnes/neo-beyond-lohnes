import type { HiddenFeature } from "./hiddenFeatures";
import type { BodyFocus } from "./shortcuts";
import type { ToolsItem } from "./screens/today/shiftClock";
import type { MoreView } from "./screens/more/MoreScreen";

/**
 * COMMAND-CENTER-001: the capability catalog behind COMMAND's search (it was
 * TODAY's SYSTEM dialog). Navigation metadata only. No commands, personal
 * records or usage history.
 */
export type CommandSection = "NUTRITION_TARGETS" | "QUIT_TRACKER" | "TIME_CAPSULE" | "REMINDERS" | "BACKUP" | "DIAGNOSTICS" | "GUIDE" | "HIDDEN_FEATURES";

export type SystemDestination =
  | { kind: "daily"; tool: ToolsItem | "SHIFT_HANDOFF" | "SMALL_STEPS" }
  | { kind: "record"; target: "protein" | "myMeals" | "meal"; mealId?: string }
  | { kind: "exercise"; exerciseId: string }
  | { kind: "workspace"; tab: "TRAIN" | "BODY" }
  | { kind: "body"; focus: BodyFocus }
  | { kind: "workout" }
  | { kind: "capture" }
  | { kind: "stealth" }
  | { kind: "more"; view: MoreView }
  | { kind: "section"; section: CommandSection };

export const CAPABILITY_GROUPS = ["Log", "Today", "Review", "Plan", "Notes", "Systems", "Settings & backup"] as const;

export type Capability = {
  hiddenFeature?: HiddenFeature;
  label: string;
  description: string;
  aliases: readonly string[];
  group: (typeof CAPABILITY_GROUPS)[number];
  destination: SystemDestination | { kind: "tools" };
};

export const SYSTEM_CAPABILITIES = [
  { label: "WATER", description: "BODY · Add water to today", aliases: ["drink", "hydration"], group: "Log", destination: { kind: "body", focus: "water" } },
  { label: "MEAL", description: "BODY · Saved meals or manual entry", aliases: ["food", "nutrition", "protein", "eat"], group: "Log", destination: { kind: "body", focus: "meal" } },
  { hiddenFeature: "foodLookup", label: "FOOD LOOKUP", description: "BODY · Search the online USDA food database", aliases: ["usda", "food search", "lookup", "macros"], group: "Log", destination: { kind: "body", focus: "foodLookup" } },
  { label: "SLEEP", description: "BODY · Main sleep and naps", aliases: ["nap", "rest", "bed"], group: "Log", destination: { kind: "body", focus: "sleep" } },
  { label: "BODYWEIGHT", description: "BODY · Weight logging and trends", aliases: ["weigh in", "weigh-in", "weight", "scale"], group: "Log", destination: { kind: "body", focus: "weight" } },
  { label: "NOTE", description: "TODAY · Quick Capture", aliases: ["capture", "thought", "idea", "handoff"], group: "Log", destination: { kind: "capture" } },
  { label: "URGE", description: "BODY · Quit tracker entry", aliases: ["quit", "habit", "craving"], group: "Log", destination: { kind: "body", focus: "urge" } },
  { label: "SYSTEMS", description: "COMMAND · Sleep, fuel, training, state and device readings", aliases: ["status", "system status", "readout", "readings", "suit", "connection", "offline"], group: "Systems", destination: { kind: "more", view: "SYSTEMS" } },
  { label: "STEALTH", description: "Hide your numbers. Long-press the emblem anytime", aliases: ["hide", "privacy", "discreet", "screen"], group: "Today", destination: { kind: "stealth" } },
  { label: "TODAY TOOLS", description: "COMMAND · All daily controls", aliases: ["check in", "check-in", "minimum day", "end day", "shift down", "reset"], group: "Today", destination: { kind: "tools" } },
  { label: "PLAN TODAY", description: "COMMAND · Your chosen tasks and recorded deadlines", aliases: ["plan", "tasks", "today plan"], group: "Plan", destination: { kind: "more", view: "PLAN" } },
  { label: "TRAIN", description: "Workouts, recovery and records", aliases: ["training", "fitness", "recovery"], group: "Plan", destination: { kind: "workspace", tab: "TRAIN" } },
  { label: "WORKOUT", description: "TRAIN · Start or resume in the existing workout workspace", aliases: ["exercise", "resume", "gym", "set", "lift"], group: "Plan", destination: { kind: "workout" } },
  { label: "EXERCISE LIBRARY", description: "COMMAND · Browse and manage exercises", aliases: ["lift", "exercise"], group: "Plan", destination: { kind: "more", view: "EXERCISE_LIBRARY" } },
  { label: "CUSTOM PROGRAMS", description: "COMMAND · Your workout templates", aliases: ["program", "template"], group: "Plan", destination: { kind: "more", view: "CUSTOM_TEMPLATES" } },
  { label: "MISSIONS & OBLIGATIONS", description: "COMMAND · Commitments and intent", aliases: ["mission", "obligation", "commitment", "goal"], group: "Plan", destination: { kind: "more", view: "INTENT" } },
  { label: "WORK SCHEDULE", description: "COMMAND · Your standing schedule", aliases: ["shift", "schedule", "rotation"], group: "Plan", destination: { kind: "more", view: "WORK_SCHEDULE" } },
  { label: "IMPORT HEALTH DATA", description: "COMMAND · Preview Garmin sleep from Health Connect", aliases: ["import", "health connect", "garmin"], group: "Review", destination: { kind: "more", view: "HEALTH_IMPORT" } },
  { label: "BODY", description: "Nutrition, water, sleep and bodyweight", aliases: ["daily record", "health"], group: "Review", destination: { kind: "workspace", tab: "BODY" } },
  { label: "WEEKLY CHECK-IN", description: "COMMAND · Weekly progress, observations and Mirror", aliases: ["week", "mirror", "progress"], group: "Review", destination: { kind: "more", view: "WEEKLY" } },
  { label: "REVIEW", description: "COMMAND · Weekly review, recorded evidence and recommendations", aliases: ["review", "weekly review", "recommendation", "rating", "decision", "evidence"], group: "Review", destination: { kind: "more", view: "REVIEW" } },
  { label: "HISTORY", description: "COMMAND · Complete chronological records", aliases: ["timeline", "past"], group: "Review", destination: { kind: "more", view: "HISTORY" } },
  { label: "DECISION JOURNAL", description: "COMMAND · Decisions, outcomes and lessons", aliases: ["journal", "decision"], group: "Review", destination: { kind: "more", view: "JOURNAL" } },
  { label: "SEARCH RECORDS", description: "COMMAND · Find your personal records", aliases: ["search", "find records"], group: "Review", destination: { kind: "more", view: "SEARCH" } },
  { label: "BACKUP & RECOVERY", description: "COMMAND · Export, share, automatic backup and restore", aliases: ["backup", "restore", "export", "share", "data safety", "automatic backup"], group: "Settings & backup", destination: { kind: "section", section: "BACKUP" } },
  { label: "NUTRITION TARGETS", description: "COMMAND · Protein and calorie targets", aliases: ["targets", "settings", "calories"], group: "Settings & backup", destination: { kind: "section", section: "NUTRITION_TARGETS" } },
  { label: "QUIT TRACKER SETTINGS", description: "COMMAND · The habit you're avoiding and your plan", aliases: ["quit", "habit", "settings"], group: "Settings & backup", destination: { kind: "section", section: "QUIT_TRACKER" } },
  { label: "TIME CAPSULE", description: "COMMAND · Seal a note for future you", aliases: ["capsule", "future", "seal"], group: "Notes", destination: { kind: "section", section: "TIME_CAPSULE" } },
  { label: "CHECK-IN REMINDER", description: "COMMAND · Daily reminder when you open BEYOND", aliases: ["reminder", "notification", "settings"], group: "Settings & backup", destination: { kind: "section", section: "REMINDERS" } },
  { label: "DIAGNOSTICS", description: "COMMAND · Record checks, app version and build", aliases: ["diagnostic", "version", "build", "debug", "mismatch"], group: "Settings & backup", destination: { kind: "section", section: "DIAGNOSTICS" } },
  { label: "A PLACE TO START", description: "COMMAND · Guided suggestions and where things live", aliases: ["guide", "help", "suggestions", "start"], group: "Settings & backup", destination: { kind: "section", section: "GUIDE" } },
  { label: "WORK CONTEXT", description: "Declare work or a day off", aliases: ["work", "day off", "context"], group: "Today", destination: { kind: "daily", tool: "WORK_CONTEXT" } },
  { label: "MARK WORK ENDED", description: "Explicitly record the end of your shift", aliases: ["shift ended", "finished work"], group: "Today", destination: { kind: "daily", tool: "WORK_CONTEXT" } },
  { label: "END DAY", description: "Close this lived day deliberately", aliases: ["finish day"], group: "Today", destination: { kind: "daily", tool: "END_DAY" } },
  { label: "CHECK IN", description: "Record or update how you feel", aliases: ["check-in", "energy", "stress", "mood"], group: "Today", destination: { kind: "daily", tool: "CHECK_IN" } },
  { label: "SHIFT DOWN", description: "Existing recovery operation", aliases: ["recover", "after shift"], group: "Today", destination: { kind: "daily", tool: "SHIFT_DOWN" } },
  { label: "RESET", description: "Existing reset operation", aliases: ["reset"], group: "Today", destination: { kind: "daily", tool: "RESET" } },
  { label: "FUEL", description: "Recorded water and protein", aliases: ["fuel"], group: "Today", destination: { kind: "daily", tool: "FUEL" } },
  { label: "ADVISORY", description: "Existing observations, separate from Engine guidance", aliases: ["observations", "advisory"], group: "Systems", destination: { kind: "daily", tool: "ADVISORY" } },
  { label: "CAPTURE", description: "Your notes inbox and existing conversion actions", aliases: ["notes", "inbox", "capture"], group: "Notes", destination: { kind: "daily", tool: "CAPTURE" } },
  { label: "SHIFT HANDOFF NOTES", description: "Notes for your next shift", aliases: ["handoff", "shift note"], group: "Notes", destination: { kind: "daily", tool: "SHIFT_HANDOFF" } },
  { label: "MONTHLY REVIEW", description: "Review · Monthly evidence appears in every fourth saved review week", aliases: ["monthly", "four weeks"], group: "Review", destination: { kind: "more", view: "REVIEW" } },
  { label: "AFTER ACTION REPORT", description: "Existing report, available any time", aliases: ["report", "briefing", "after action"], group: "Review", destination: { kind: "more", view: "REPORT" } },
  { label: "MIRROR", description: "Compare your own recorded progress", aliases: ["mirror", "30 days", "90 days"], group: "Review", destination: { kind: "more", view: "MIRROR" } },
  { label: "MY MEALS", description: "Manage your reusable saved meals", aliases: ["meal memory", "presets", "saved meals"], group: "Settings & backup", destination: { kind: "record", target: "myMeals" } },
  { hiddenFeature: "minimumDay", label: "MINIMUM DAY", description: "The existing six-basics tool", aliases: ["minimum", "basics"], group: "Today", destination: { kind: "daily", tool: "MINIMUM_DAY" } },
  { hiddenFeature: "smallSteps", label: "SMALL STEPS", description: "One existing tool at a time", aliases: ["small steps", "simple"], group: "Today", destination: { kind: "daily", tool: "SMALL_STEPS" } },
  { label: "HIDDEN FEATURES", description: "Show optional tools. Existing data is kept", aliases: ["hidden", "minimum day", "small steps", "food lookup"], group: "Settings & backup", destination: { kind: "section", section: "HIDDEN_FEATURES" } },
  { label: "PROTEIN ONLY", description: "Log protein with the existing protein-only form", aliases: ["protein", "grams"], group: "Log", destination: { kind: "record", target: "protein" } },
] as const satisfies readonly Capability[];

export type SystemCapability = Capability;

export function findCapabilities(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SYSTEM_CAPABILITIES.filter((entry) => {
    const text = [entry.label, ...entry.aliases].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

