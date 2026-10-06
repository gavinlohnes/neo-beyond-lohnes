import type { BlockFacts, ReportItem, ReportTiming } from "../../../application/reportQueries";

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

function blockLine(b: BlockFacts): string {
  const parts = [
    `${b.sessions} ${b.sessions === 1 ? "session" : "sessions"}`,
    `${b.sets} ${b.sets === 1 ? "set" : "sets"}`,
    sleep(b.avgSleepMinutes),
  ].filter(Boolean);
  return parts.join(", ");
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
          item.previous
            ? `Last block (${span(item.previous.from, item.previous.to)}): ${blockLine(item.previous)}`
            : "No earlier block on record to compare with.",
        ],
      };
    case "MOVED":
      return {
        heading: "What moved",
        lines: [`${item.prs.length} ${item.prs.length === 1 ? "PR" : "PRs"}: ${item.prs.map((p) => `${p.name} ${p.weight} lb × ${p.reps}`).join(", ")}`],
      };
    case "STALLED":
      return {
        heading: "What stalled",
        lines: item.lifts.map((l) => `${l.name}: no PR since ${day(l.lastMovedOn)}`),
      };
    case "COMING":
      return {
        heading: "What's coming",
        lines: [
          item.nextBlock ? `Next block: ${span(item.nextBlock.from, item.nextBlock.to)} (${item.nextBlock.shifts} ${item.nextBlock.shifts === 1 ? "shift" : "shifts"})` : null,
          item.capsuleOpensOn ? `A time capsule opens ${day(item.capsuleOpensOn)}` : null,
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
