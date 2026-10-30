import type { BlockFacts, BlockNight, ReportItem, ReportTiming } from "../../../application/reportQueries";

/**
 * REPORT-001: the Briefing / After Action Report in words. Facts only, no
 * judgment words; the one call is phrased as a suggestion ("Consider …").
 */
function day(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function span(from: string, to: string): string {
  return from === to ? day(from) : `${day(from)} – ${day(to)}`;
}

function sleep(minutes: number | null): string | null {
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `avg sleep ${m === 0 ? `${h}h` : `${h}h ${m}m`}`;
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function blockLine(b: BlockFacts): string {
  // END-OF-RUN-001: a run without training says so once, not "0 sessions, 0 sets".
  const parts = [
    b.sessions === 0 ? "no workouts" : `${b.sessions} ${b.sessions === 1 ? "session" : "sessions"}`,
    b.sessions === 0 ? null : `${b.sets} ${b.sets === 1 ? "set" : "sets"}`,
    sleep(b.avgSleepMinutes),
  ].filter(Boolean);
  return parts.join(", ");
}

/** END-OF-RUN-001: "Sleep by night: Mon 7h 10m · Tue not logged". */
function nightsLine(nights: readonly BlockNight[]): string {
  const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  return `Sleep by night: ${nights.map((n) => `${weekday(n.date)} ${n.minutes === null ? "not logged" : hours(n.minutes)}`).join(" · ")}`;
}

export function describeReportTitle(timing: ReportTiming): string {
  return timing === "BRIEFING" ? "BRIEFING" : timing === "AFTER_ACTION" ? "AFTER ACTION" : "BRIEFING / AFTER ACTION";
}

export function describeReportLine(timing: Exclude<ReportTiming, null>): string {
  return timing === "BRIEFING" ? "BRIEFING READY" : "AFTER ACTION READY";
}

/** Each item as a heading and one or two lines. */
export function describeReportItem(item: ReportItem): { heading: string; lines: string[] } {
  switch (item.kind) {
    case "BLOCK":
      return {
        heading: "This block vs last",
        lines: [
          `This block (${span(item.current.from, item.current.to)}, ${item.current.shifts} ${item.current.shifts === 1 ? "shift" : "shifts"}): ${blockLine(item.current)}`,
          ...(item.nights ? [nightsLine(item.nights)] : []),
          item.previous
            ? `Last block (${span(item.previous.from, item.previous.to)}): ${blockLine(item.previous)}`
            : "No earlier block on record to compare with.",
        ],
      };
    case "FUEL":
      return {
        heading: "Fuel",
        lines: [
          item.proteinAvgG !== null ? `Protein: ${item.proteinAvgG} g a day${item.proteinTargetG !== null ? ` (target ${item.proteinTargetG} g)` : ""}` : null,
          item.waterAvgOz !== null ? `Water: ${item.waterAvgOz} oz a day` : null,
          `Logged on ${item.logged} of ${item.days} ${item.days === 1 ? "day" : "days"}`,
        ].filter((l): l is string => l !== null),
      };
    case "MOVED":
      return {
        heading: "What moved",
        lines: [
          item.prs.length
            ? `${item.prs.length} ${item.prs.length === 1 ? "PR" : "PRs"}: ${item.prs.map((p) => `${p.name} ${p.weight} lb × ${p.reps}`).join(", ")}`
            : null,
          ...item.milestones,
        ].filter((l): l is string => l !== null),
      };
    case "STALLED":
      return {
        heading: "What stalled",
        lines: item.lifts.map((l) => `${l.name}: heaviest set unchanged since ${day(l.lastMovedOn)}`),
      };
    case "COMING":
      return {
        heading: "What's coming",
        lines: [
          item.nextBlock ? `Next block: ${span(item.nextBlock.from, item.nextBlock.to)} (${item.nextBlock.shifts} ${item.nextBlock.shifts === 1 ? "shift" : "shifts"})` : null,
          item.capsuleOpensOn ? `A time capsule opens ${day(item.capsuleOpensOn)}` : null,
          item.openTasks ? `${item.openTasks} open ${item.openTasks === 1 ? "task" : "tasks"} on TODAY` : null,
        ].filter((l): l is string => l !== null),
      };
    case "CALL":
      return {
        heading: "One call",
        lines: [
          item.call.kind === "LIGHTER_WEEK"
            ? `Consider a lighter week on ${item.call.lift}.`
            : "Consider protecting sleep before the next block.",
        ],
      };
  }
}

/**
 * TONIGHT-001: the briefing opens with where tonight stands, in place of the
 * block comparison (which the After Action report keeps). Read only, no grade.
 */
export function describeTonightPosition(position: {
  proteinG: number;
  proteinTargetG: number | undefined;
  waterOz: number;
  lastMealAt: string | null;
  nextWorkoutLabel: string;
}): { heading: string; lines: string[] } {
  const lastMeal = position.lastMealAt
    ? `Last meal ${new Date(position.lastMealAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`
    : "No meal logged yet";
  return {
    heading: "Tonight so far",
    lines: [
      `Protein ${position.proteinG}${position.proteinTargetG !== undefined ? ` of ${position.proteinTargetG}` : ""} g · Water ${position.waterOz} oz`,
      lastMeal,
      `After shift: workout ${position.nextWorkoutLabel} is next. Your call then.`,
    ],
  };
}
