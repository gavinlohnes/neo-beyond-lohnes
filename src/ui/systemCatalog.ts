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

// FIELD-AUTHORITY-001: COMMAND browses by job. The last two rows also hold their tool panels.
export const CAPABILITY_GROUPS = ["Log", "On shift", "Review", "Plan", "Notes", "Systems", "Backup & recovery", "Settings"] as const;

export type Capability = {
  hiddenFeature?: HiddenFeature;
  label: string;
  description: string;
  aliases: readonly string[];
  group: (typeof CAPABILITY_GROUPS)[number];
  destination: SystemDestination | { kind: "tools" };
  /**
   * MORE-TRIM-001: false when the destination already has a home one tap away (LOG on TODAY, a
   * nav tab, TODAY TOOLS or the panel the row sits in). It stays findable by search; the browse
   * list shows each destination once.
   */
  browse?: false;
};

export const SYSTEM_CAPABILITIES = [
  { label: "WATER", description: "DATA · Add water to today", aliases: ["drink", "hydration"], group: "Log", destination: { kind: "body", focus: "water" }, browse: false },
  { label: "MEAL", description: "DATA · Saved meals or manual entry", aliases: ["food", "nutrition", "protein", "eat"], group: "Log", destination: { kind: "body", focus: "meal" }, browse: false },
  { hiddenFeature: "foodLookup", label: "FOOD LOOKUP", description: "DATA · Search the online USDA food database", aliases: ["usda", "food search", "lookup", "macros"], group: "Log", destination: { kind: "body", focus: "foodLookup" }, browse: false },
  { label: "SLEEP", description: "DATA · Main sleep and naps", aliases: ["nap", "rest", "bed"], group: "Log", destination: { kind: "body", focus: "sleep" }, browse: false },
  { label: "BODYWEIGHT", description: "DATA · Weight logging and trends", aliases: ["weigh in", "weigh-in", "weight", "scale"], group: "Log", destination: { kind: "body", focus: "weight" }, browse: false },
  { label: "NOTE", description: "TODAY · Quick Capture", aliases: ["capture", "thought", "idea", "handoff"], group: "Log", destination: { kind: "capture" }, browse: false },
  { label: "URGE", description: "DATA · Quit tracker entry", aliases: ["quit", "habit", "craving"], group: "Log", destination: { kind: "body", focus: "urge" }, browse: false },
  { label: "SYSTEMS", description: "Sleep, fuel, training, state and device readings", aliases: ["status", "system status", "readout", "readings", "suit", "connection", "offline"], group: "Systems", destination: { kind: "more", view: "SYSTEMS" } },
  { label: "STEALTH", description: "Hide your numbers. Long-press the emblem anytime", aliases: ["hide", "privacy", "discreet", "screen"], group: "On shift", destination: { kind: "stealth" } },
  { label: "TODAY TOOLS", description: "Every daily control in one place", aliases: ["check in", "check-in", "minimum day", "end day", "shift down", "reset"], group: "On shift", destination: { kind: "tools" } },
  { label: "PLAN TODAY", description: "Your chosen tasks and recorded deadlines", aliases: ["plan", "tasks", "today plan"], group: "Plan", destination: { kind: "more", view: "PLAN" } },
  { label: "TRAIN", description: "Workouts, recovery and records", aliases: ["training", "fitness", "recovery"], group: "Plan", destination: { kind: "workspace", tab: "TRAIN" }, browse: false },
  { label: "WORKOUT", description: "TRAIN · Start or resume a workout", aliases: ["exercise", "resume", "gym", "set", "lift"], group: "Plan", destination: { kind: "workout" } },
  { label: "EXERCISE LIBRARY", description: "Browse and manage exercises", aliases: ["lift", "exercise"], group: "Plan", destination: { kind: "more", view: "EXERCISE_LIBRARY" } },
  { label: "CUSTOM PROGRAMS", description: "Your workout templates", aliases: ["program", "template"], group: "Plan", destination: { kind: "more", view: "CUSTOM_TEMPLATES" } },
  { label: "MISSIONS & OBLIGATIONS", description: "Commitments, projects and intent", aliases: ["mission", "obligation", "commitment", "goal"], group: "Plan", destination: { kind: "more", view: "INTENT" } },
  { label: "LIFE", description: "Direction, plans, routines, people, home and memory in one place", aliases: ["life", "personal", "me", "organise", "organize"], group: "Plan", destination: { kind: "more", view: "LIFE" } },
  { label: "ROUTINES", description: "Your before, during and after shift routines", aliases: ["routine", "checklist", "habit", "rhythm"], group: "Plan", destination: { kind: "more", view: "ROUTINES" }, browse: false },
  // UX-POLISH-001: the personal-OS areas are found by name in search (search-only: MORE-TRIM-001 keeps
  // the browsed list at 25 or fewer). People and Home also stay in Personal Understanding.
  { label: "PROJECTS", description: "Finite efforts and their steps", aliases: ["project", "get done", "steps", "errand"], group: "Plan", destination: { kind: "more", view: "INTENT" }, browse: false },
  { label: "PEOPLE", description: "Birthdays, dates and what to remember about people", aliases: ["people", "birthday", "anniversary", "family", "friend", "gift"], group: "Plan", destination: { kind: "more", view: "PEOPLE" }, browse: false },
  { label: "HOME", description: "House facts and jobs that come round", aliases: ["home", "house", "filter", "maintenance", "chore"], group: "Plan", destination: { kind: "more", view: "HOME" }, browse: false },
  { label: "WORK SCHEDULE", description: "Your standing schedule", aliases: ["shift", "schedule", "rotation"], group: "Plan", destination: { kind: "more", view: "WORK_SCHEDULE" } },
  { label: "WHAT BEYOND SHOULD REMEMBER", description: "Your prep and recovery preferences", aliases: ["memory", "preferences", "remember", "constraint"], group: "Settings", destination: { kind: "more", view: "MEMORY" } },
  { label: "IMPORT HEALTH DATA", description: "Preview Garmin data from the helper before saving", aliases: ["import", "health connect", "garmin"], group: "Review", destination: { kind: "more", view: "HEALTH_IMPORT" } },
  { label: "DATA", description: "Nutrition, water, sleep and bodyweight", aliases: ["body", "daily record", "health"], group: "Review", destination: { kind: "workspace", tab: "BODY" }, browse: false },
  { label: "WEEKLY CHECK-IN", description: "Weekly progress, observations and Mirror", aliases: ["week", "mirror", "progress", "week ahead", "plan my week", "planned"], group: "Review", destination: { kind: "more", view: "WEEKLY" } },
  { label: "REVIEW", description: "Weekly review, recorded evidence and recommendations", aliases: ["review", "weekly review", "recommendation", "rating", "decision", "evidence"], group: "Review", destination: { kind: "more", view: "REVIEW" } },
  { label: "HISTORY", description: "Every record, in order", aliases: ["timeline", "past"], group: "Review", destination: { kind: "more", view: "HISTORY" } },
  { label: "DECISION JOURNAL", description: "Decisions, outcomes and lessons", aliases: ["journal", "decision"], group: "Review", destination: { kind: "more", view: "JOURNAL" } },
  { label: "SEARCH RECORDS", description: "Find your personal records", aliases: ["search", "find records"], group: "Review", destination: { kind: "more", view: "SEARCH" } },
  { label: "BACKUP & RECOVERY", description: "Export, share, automatic backup and restore", aliases: ["backup", "restore", "export", "share", "data safety", "automatic backup"], group: "Backup & recovery", destination: { kind: "section", section: "BACKUP" }, browse: false },
  { label: "TARGETS", description: "Nutrition and personal Review targets", aliases: ["nutrition targets", "review targets", "training target", "weight rate", "settings", "calories"], group: "Settings", destination: { kind: "section", section: "NUTRITION_TARGETS" }, browse: false },
  { label: "QUIT TRACKER SETTINGS", description: "The habit you're avoiding and your plan", aliases: ["quit", "habit", "settings"], group: "Settings", destination: { kind: "section", section: "QUIT_TRACKER" }, browse: false },
  { label: "TIME CAPSULE", description: "Seal a note for future you", aliases: ["capsule", "future", "seal"], group: "Notes", destination: { kind: "section", section: "TIME_CAPSULE" } },
  { label: "CHECK-IN REMINDER", description: "Daily reminder when you open BEYOND", aliases: ["reminder", "notification", "settings"], group: "Settings", destination: { kind: "section", section: "REMINDERS" }, browse: false },
  { label: "DIAGNOSTICS", description: "Record checks, app version and build", aliases: ["diagnostic", "version", "build", "debug", "mismatch"], group: "Settings", destination: { kind: "section", section: "DIAGNOSTICS" }, browse: false },
  { label: "A PLACE TO START", description: "Guided suggestions and where things live", aliases: ["guide", "help", "suggestions", "start"], group: "Settings", destination: { kind: "section", section: "GUIDE" }, browse: false },
  { label: "WORK CONTEXT", description: "Declare work or a day off", aliases: ["work", "day off", "context"], group: "On shift", destination: { kind: "daily", tool: "WORK_CONTEXT" }, browse: false },
  { label: "MARK WORK ENDED", description: "Record the end of your shift", aliases: ["shift ended", "finished work"], group: "On shift", destination: { kind: "daily", tool: "WORK_CONTEXT" }, browse: false },
  { label: "END DAY", description: "Close this lived day deliberately", aliases: ["finish day"], group: "On shift", destination: { kind: "daily", tool: "END_DAY" }, browse: false },
  { label: "CHECK IN", description: "Record or update how you feel", aliases: ["check-in", "energy", "stress", "mood"], group: "On shift", destination: { kind: "daily", tool: "CHECK_IN" }, browse: false },
  { label: "SHIFT DOWN", description: "Come down from high alert, for the minutes you choose", aliases: ["recover", "after shift"], group: "On shift", destination: { kind: "daily", tool: "SHIFT_DOWN" }, browse: false },
  { label: "RESET", description: "Settle your body first, at the intensity you choose", aliases: ["reset"], group: "On shift", destination: { kind: "daily", tool: "RESET" }, browse: false },
  { label: "FUEL", description: "Recorded water and protein", aliases: ["fuel"], group: "On shift", destination: { kind: "daily", tool: "FUEL" }, browse: false },
  { label: "ADVISORY", description: "Observations, separate from the recommendation", aliases: ["observations", "advisory"], group: "Systems", destination: { kind: "daily", tool: "ADVISORY" } },
  { label: "CAPTURE", description: "Your notes inbox; turn a note into an obligation", aliases: ["notes", "inbox", "capture"], group: "Notes", destination: { kind: "daily", tool: "CAPTURE" } },
  { label: "SHIFT HANDOFF NOTES", description: "Notes for your next shift", aliases: ["handoff", "shift note"], group: "Notes", destination: { kind: "daily", tool: "SHIFT_HANDOFF" } },
  { label: "MONTHLY REVIEW", description: "In Review: every fourth saved week adds the month", aliases: ["monthly", "four weeks"], group: "Review", destination: { kind: "more", view: "REVIEW" }, browse: false },
  { label: "AFTER ACTION REPORT", description: "Your after action report, any time", aliases: ["report", "briefing", "after action"], group: "Review", destination: { kind: "more", view: "REPORT" } },
  { label: "MIRROR", description: "Compare your own recorded progress", aliases: ["mirror", "30 days", "90 days"], group: "Review", destination: { kind: "more", view: "MIRROR" } },
  { label: "MY MEALS", description: "Manage your reusable saved meals", aliases: ["meal memory", "presets", "saved meals"], group: "Settings", destination: { kind: "record", target: "myMeals" } },
  { hiddenFeature: "minimumDay", label: "MINIMUM DAY", description: "The six basics for a hard day", aliases: ["minimum", "basics"], group: "On shift", destination: { kind: "daily", tool: "MINIMUM_DAY" }, browse: false },
  { hiddenFeature: "smallSteps", label: "SMALL STEPS", description: "One tool at a time", aliases: ["small steps", "simple"], group: "On shift", destination: { kind: "daily", tool: "SMALL_STEPS" }, browse: false },
  { label: "HIDDEN FEATURES", description: "Show optional tools; your data is kept either way", aliases: ["hidden", "minimum day", "small steps", "food lookup"], group: "Settings", destination: { kind: "section", section: "HIDDEN_FEATURES" }, browse: false },
  { label: "PROTEIN ONLY", description: "Log protein without a meal", aliases: ["protein", "grams"], group: "Log", destination: { kind: "record", target: "protein" }, browse: false },
  { label: "CALENDAR EXPORT", description: "Export scheduled shifts and optional plans from Week Ahead", aliases: ["calendar", "ics", "export to calendar"], group: "Review", destination: { kind: "more", view: "WEEKLY" }, browse: false },
] as const satisfies readonly Capability[];

export type SystemCapability = Capability;

export function findCapabilities(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SYSTEM_CAPABILITIES.filter((entry) => {
    const text = [entry.label, ...entry.aliases].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

