import type { Capacity, WorkContextSource } from "../../../domain/common/types";
import type { SystemStatusLevel } from "../../../application/systemStatus";

/**
 * SUIT-001: SYSTEMS wording. Readings stay literal; the sentences around them
 * follow COMMAND-CENTER-001's voice. No score, no combined number.
 */
export function formatSleepReading(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Protein against its target, or the plain total when there's no target. */
export function formatFuelReading(proteinG: number, targetG: number | undefined): string {
  return targetG !== undefined ? `${proteinG}/${targetG} g` : `${proteinG} g`;
}

/** POLISH-002: the TODAY line's compact readings, as in the prototype ("Sleep 6:50 · Fuel 92/170g"). */
export function formatSleepClock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}
function formatFuelCompact(proteinG: number, targetG: number | undefined): string {
  return targetG !== undefined ? `${proteinG}/${targetG}g` : `${proteinG}g`;
}

export function describeStatusLevel(level: SystemStatusLevel): string {
  return level === "NO_READ" ? "NOT CHECKED IN" : level;
}

export interface SystemsLineInput {
  sleepMinutes: number | null;
  proteinG: number;
  proteinTargetG: number | undefined;
  checkIn: Capacity | null;
  statusLevel: SystemStatusLevel | null;
  /** Plain warning words, e.g. "Backup 9d", "Offline". Each is also in the readout. */
  warnings: readonly string[];
}

/** The System Status part of the line: AMBER/RED lead in words; NO READ keeps its existing sentence. */
export function describeSystemsStatus(level: SystemStatusLevel | null): string | null {
  if (level === "AMBER" || level === "RED") return level;
  if (level === "NO_READ") return "NOT CHECKED IN · log sleep or check in";
  return null;
}

/**
 * The one TODAY line. AMBER and RED status lead with their word, so the
 * strip's tint is never the only carrier of that status. NO READ (neither
 * sleep nor a check-in) says so once instead of two "missing" readings.
 */
export function describeSystemsLine(input: SystemsLineInput): string[] {
  const status = describeSystemsStatus(input.statusLevel);
  const bits: string[] = status ? [status] : [];
  if (input.statusLevel !== "NO_READ") bits.push(input.sleepMinutes !== null ? `Sleep ${formatSleepClock(input.sleepMinutes)}` : "Sleep not logged");
  bits.push(`Fuel ${formatFuelCompact(input.proteinG, input.proteinTargetG)}`);
  if (input.statusLevel !== "NO_READ") bits.push(input.checkIn ? `Check-in ${input.checkIn}` : "No check-in");
  return [...bits, ...input.warnings];
}

export function describeWorkContextValue(workContext: "WORK" | "OFF" | "UNKNOWN"): string {
  return workContext === "WORK" ? "Work day" : workContext === "OFF" ? "Day off" : "Not set";
}

export function describeWorkContextSource(source: WorkContextSource | undefined): string {
  switch (source) {
    case "MANUAL":
      return "Set by you";
    case "SCHEDULE_SUGGESTION_ACCEPTED":
      return "Schedule suggestion, accepted";
    case "SCHEDULE_STANDING":
      return "Per schedule";
    default:
      return "";
  }
}

/** Whole calendar days are the backup clock's own unit (getDaysSinceLastBackup). */
export function describeBackupAge(days: number | null): string {
  if (days === null) return "None on record";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function describeDaysAgo(at: string, now: Date): string {
  const then = new Date(at);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function clockTime(at: string): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
