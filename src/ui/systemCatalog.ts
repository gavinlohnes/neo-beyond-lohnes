import type { BodyFocus } from "./shortcuts";
import type { MoreView } from "./screens/more/MoreScreen";

/** Navigation metadata only. No commands, personal records or usage history. */
export type SystemDestination =
  | { kind: "workspace"; tab: "TRAIN" | "BODY" | "MORE" }
  | { kind: "body"; focus: BodyFocus }
  | { kind: "workout" }
  | { kind: "more"; view: MoreView };

type Capability = {
  label: string;
  description: string;
  aliases: readonly string[];
  group: "Workspaces" | "Daily actions" | "Training and planning" | "Records";
  destination: SystemDestination | { kind: "tools" };
};

export const SYSTEM_CAPABILITIES = [
  { label: "TODAY TOOLS", description: "Check-in, work context and daily controls", aliases: ["check in", "check-in", "capture"], group: "Workspaces", destination: { kind: "tools" } },
  { label: "TRAIN", description: "Workouts, recovery and records", aliases: ["training", "fitness", "recovery"], group: "Workspaces", destination: { kind: "workspace", tab: "TRAIN" } },
  { label: "BODY", description: "Nutrition, water, sleep and bodyweight", aliases: [], group: "Workspaces", destination: { kind: "workspace", tab: "BODY" } },
  { label: "MORE", description: "History, planning, insights and backups", aliases: ["settings", "backup", "restore"], group: "Workspaces", destination: { kind: "workspace", tab: "MORE" } },
  { label: "WATER", description: "BODY · Hydration logging", aliases: ["drink", "hydration"], group: "Daily actions", destination: { kind: "body", focus: "water" } },
  { label: "MEAL", description: "BODY · Meal logging and correction", aliases: ["food", "nutrition"], group: "Daily actions", destination: { kind: "body", focus: "meal" } },
  { label: "SLEEP", description: "BODY · Main sleep and naps", aliases: ["nap", "rest"], group: "Daily actions", destination: { kind: "body", focus: "sleep" } },
  { label: "BODYWEIGHT", description: "BODY · Weight logging and trends", aliases: ["weigh in", "weigh-in", "weight"], group: "Daily actions", destination: { kind: "body", focus: "weight" } },
  { label: "WORKOUT", description: "TRAIN · Start or resume in the existing workout workspace", aliases: ["exercise", "resume", "gym"], group: "Training and planning", destination: { kind: "workout" } },
  { label: "MISSIONS & OBLIGATIONS", description: "MORE · Commitments and intent", aliases: ["mission", "obligation", "commitment"], group: "Training and planning", destination: { kind: "more", view: "INTENT" } },
  { label: "WORK SCHEDULE", description: "MORE · Your standing schedule", aliases: ["shift", "schedule"], group: "Training and planning", destination: { kind: "more", view: "WORK_SCHEDULE" } },
  { label: "EXERCISE LIBRARY", description: "MORE · Browse and manage exercises", aliases: ["lift", "exercise"], group: "Training and planning", destination: { kind: "more", view: "EXERCISE_LIBRARY" } },
  { label: "CUSTOM PROGRAMS", description: "MORE · Your workout templates", aliases: ["program", "template"], group: "Training and planning", destination: { kind: "more", view: "CUSTOM_TEMPLATES" } },
  { label: "HISTORY", description: "MORE · Complete chronological records", aliases: ["timeline", "past"], group: "Records", destination: { kind: "more", view: "HISTORY" } },
  { label: "WEEKLY CHECK-IN", description: "MORE · Weekly progress, observations and Mirror", aliases: ["week", "mirror", "progress"], group: "Records", destination: { kind: "more", view: "WEEKLY" } },
  { label: "REVIEW", description: "MORE · Recommendations, decisions and ratings", aliases: ["review", "recommendation", "rating", "decision"], group: "Records", destination: { kind: "more", view: "REVIEW" } },
  { label: "DECISION JOURNAL", description: "MORE · Decisions, outcomes and lessons", aliases: ["journal", "decision"], group: "Records", destination: { kind: "more", view: "JOURNAL" } },
  { label: "SEARCH RECORDS", description: "MORE · Find your personal records", aliases: ["search", "find records"], group: "Records", destination: { kind: "more", view: "SEARCH" } },
] as const satisfies readonly Capability[];

export function findCapabilities(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SYSTEM_CAPABILITIES.filter((entry) => {
    const text = [entry.label, ...entry.aliases].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
