import type { BodyFocus } from "./shortcuts";
import type { MoreView } from "./screens/more/MoreScreen";

/**
 * COMMAND-CENTER-001: the capability catalog behind COMMAND's search (it was
 * TODAY's SYSTEM dialog). Navigation metadata only. No commands, personal
 * records or usage history.
 */
export type CommandSection = "NUTRITION_TARGETS" | "QUIT_TRACKER" | "TIME_CAPSULE" | "REMINDERS" | "BACKUP" | "DIAGNOSTICS" | "GUIDE";

export type SystemDestination =
  | { kind: "workspace"; tab: "TRAIN" | "BODY" }
  | { kind: "body"; focus: BodyFocus }
  | { kind: "workout" }
  | { kind: "capture" }
  | { kind: "more"; view: MoreView }
  | { kind: "section"; section: CommandSection };

export const CAPABILITY_GROUPS = ["Log", "Today", "Training and planning", "Records", "Settings"] as const;

type Capability = {
  label: string;
  description: string;
  aliases: readonly string[];
  group: (typeof CAPABILITY_GROUPS)[number];
  destination: SystemDestination | { kind: "tools" };
};

export const SYSTEM_CAPABILITIES = [
  { label: "WATER", description: "BODY · Add water to today", aliases: ["drink", "hydration"], group: "Log", destination: { kind: "body", focus: "water" } },
  { label: "MEAL", description: "BODY · Saved meals or manual entry", aliases: ["food", "nutrition", "protein", "eat"], group: "Log", destination: { kind: "body", focus: "meal" } },
  { label: "SLEEP", description: "BODY · Main sleep and naps", aliases: ["nap", "rest", "bed"], group: "Log", destination: { kind: "body", focus: "sleep" } },
  { label: "BODYWEIGHT", description: "BODY · Weight logging and trends", aliases: ["weigh in", "weigh-in", "weight", "scale"], group: "Log", destination: { kind: "body", focus: "weight" } },
  { label: "NOTE", description: "TODAY · Quick Capture", aliases: ["capture", "thought", "idea", "handoff"], group: "Log", destination: { kind: "capture" } },
  { label: "URGE", description: "BODY · Quit tracker entry", aliases: ["quit", "habit", "craving"], group: "Log", destination: { kind: "body", focus: "urge" } },
  { label: "TODAY TOOLS", description: "Check-in, work context and daily controls", aliases: ["check in", "check-in", "minimum day", "end day", "shift down", "reset"], group: "Today", destination: { kind: "tools" } },
  { label: "PLAN TODAY", description: "COMMAND · Your chosen tasks and recorded deadlines", aliases: ["plan", "tasks", "today plan"], group: "Today", destination: { kind: "more", view: "PLAN" } },
  { label: "TRAIN", description: "Workouts, recovery and records", aliases: ["training", "fitness", "recovery"], group: "Training and planning", destination: { kind: "workspace", tab: "TRAIN" } },
  { label: "WORKOUT", description: "TRAIN · Start or resume in the existing workout workspace", aliases: ["exercise", "resume", "gym", "set", "lift"], group: "Training and planning", destination: { kind: "workout" } },
  { label: "EXERCISE LIBRARY", description: "COMMAND · Browse and manage exercises", aliases: ["lift", "exercise"], group: "Training and planning", destination: { kind: "more", view: "EXERCISE_LIBRARY" } },
  { label: "CUSTOM PROGRAMS", description: "COMMAND · Your workout templates", aliases: ["program", "template"], group: "Training and planning", destination: { kind: "more", view: "CUSTOM_TEMPLATES" } },
  { label: "MISSIONS & OBLIGATIONS", description: "COMMAND · Commitments and intent", aliases: ["mission", "obligation", "commitment", "goal"], group: "Training and planning", destination: { kind: "more", view: "INTENT" } },
  { label: "WORK SCHEDULE", description: "COMMAND · Your standing schedule", aliases: ["shift", "schedule", "rotation"], group: "Training and planning", destination: { kind: "more", view: "WORK_SCHEDULE" } },
  { label: "BODY", description: "Nutrition, water, sleep and bodyweight", aliases: ["daily record", "health"], group: "Records", destination: { kind: "workspace", tab: "BODY" } },
  { label: "WEEKLY CHECK-IN", description: "COMMAND · Weekly progress, observations and Mirror", aliases: ["week", "mirror", "progress"], group: "Records", destination: { kind: "more", view: "WEEKLY" } },
  { label: "REVIEW", description: "COMMAND · Weekly review, recorded evidence and recommendations", aliases: ["review", "weekly review", "recommendation", "rating", "decision", "evidence"], group: "Records", destination: { kind: "more", view: "REVIEW" } },
  { label: "HISTORY", description: "COMMAND · Complete chronological records", aliases: ["timeline", "past"], group: "Records", destination: { kind: "more", view: "HISTORY" } },
  { label: "DECISION JOURNAL", description: "COMMAND · Decisions, outcomes and lessons", aliases: ["journal", "decision"], group: "Records", destination: { kind: "more", view: "JOURNAL" } },
  { label: "SEARCH RECORDS", description: "COMMAND · Find your personal records", aliases: ["search", "find records"], group: "Records", destination: { kind: "more", view: "SEARCH" } },
  { label: "BACKUP & RECOVERY", description: "COMMAND · Export, share, automatic backup and restore", aliases: ["backup", "restore", "export", "share", "data safety", "automatic backup"], group: "Settings", destination: { kind: "section", section: "BACKUP" } },
  { label: "NUTRITION TARGETS", description: "COMMAND · Protein and calorie targets", aliases: ["targets", "settings", "calories"], group: "Settings", destination: { kind: "section", section: "NUTRITION_TARGETS" } },
  { label: "QUIT TRACKER SETTINGS", description: "COMMAND · The habit you're avoiding and your plan", aliases: ["quit", "habit", "settings"], group: "Settings", destination: { kind: "section", section: "QUIT_TRACKER" } },
  { label: "TIME CAPSULE", description: "COMMAND · Seal a note for future you", aliases: ["capsule", "future", "seal"], group: "Settings", destination: { kind: "section", section: "TIME_CAPSULE" } },
  { label: "CHECK-IN REMINDER", description: "COMMAND · Daily reminder when you open BEYOND", aliases: ["reminder", "notification", "settings"], group: "Settings", destination: { kind: "section", section: "REMINDERS" } },
  { label: "DIAGNOSTICS", description: "COMMAND · Record checks, app version and build", aliases: ["diagnostic", "version", "build", "debug", "mismatch"], group: "Settings", destination: { kind: "section", section: "DIAGNOSTICS" } },
  { label: "A PLACE TO START", description: "COMMAND · Guided suggestions and where things live", aliases: ["guide", "help", "suggestions", "start"], group: "Settings", destination: { kind: "section", section: "GUIDE" } },
] as const satisfies readonly Capability[];

export type SystemCapability = (typeof SYSTEM_CAPABILITIES)[number];

export function findCapabilities(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SYSTEM_CAPABILITIES.filter((entry) => {
    const text = [entry.label, ...entry.aliases].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
