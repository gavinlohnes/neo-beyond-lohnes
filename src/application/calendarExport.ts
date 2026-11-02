import type { SchedulePattern } from "../domain/common/types";
import type { Obligation } from "../domain/intent/types";
import { deriveScheduledContext, formatLocalDate, isOperatorSavedSchedule } from "../engine/scheduledContext";

/** RFC 5545 TEXT. No description, memory, health or financial detail is accepted. */
export function escapeCalendarText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/** Fold by UTF-8 octets, preserving code points; the continuation space counts toward 75. */
export function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  let result = "", bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { result += "\r\n "; bytes = 1; }
    result += char; bytes += size;
  }
  return result;
}

export interface CalendarExport {
  contents: string;
  count: number;
  from: string;
  through: string;
  message: string | null;
}
const localDay = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
const dateValue = (date: Date) => formatLocalDate(date).replace(/-/g, "");
const timeValue = (date: Date, hour: number) => `${dateValue(date)}T${String(hour).padStart(2, "0")}0000`;

/** Pure read-only projection. Shifts use floating local time (the importing calendar's zone).
 * Calendar dates deliberately do not use the 16:30 lived-day boundary: an 18:00 shift starts
 * on its actual civil date, even when export is requested before rollover. End is exclusive.
 * People/Home reminders are existing Obligations; no memory store or recurrence is synthesized.
 */
export function buildCalendarExport(input: {
  now: Date;
  pattern: SchedulePattern;
  obligations: readonly Obligation[];
  includePlans: boolean;
  weeks: 4 | 8;
}): CalendarExport {
  if (input.weeks !== 4 && input.weeks !== 8) throw new Error("Choose 4 or 8 weeks.");
  const { now, pattern } = input;
  const from = formatLocalDate(now), end = formatLocalDate(localDay(now, input.weeks * 7));
  const through = formatLocalDate(localDay(now, input.weeks * 7 - 1));
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BEYOND//Calendar Export//EN", "CALSCALE:GREGORIAN"];
  let count = 0;
  const event = (uid: string, summary: string, start: string, finish: string) => {
    lines.push("BEGIN:VEVENT", `UID:${uid}@beyond.local`, `DTSTAMP:${stamp}`, start, finish, `SUMMARY:${escapeCalendarText(summary)}`, "END:VEVENT"); count++;
  };
  const saved = isOperatorSavedSchedule(pattern);
  if (saved) for (let i = 0; i < input.weeks * 7; i++) {
    const day = localDay(now, i);
    if (!deriveScheduledContext(day, pattern).todayIsScheduledWorkDay) continue;
    const finish = localDay(day, pattern.shiftEndHour <= pattern.shiftStartHour ? 1 : 0);
    event(`shift-${dateValue(day)}`, "Scheduled shift", `DTSTART:${timeValue(day, pattern.shiftStartHour)}`, `DTEND:${timeValue(finish, pattern.shiftEndHour)}`);
  }
  if (input.includePlans) {
    for (const task of [...input.obligations].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const [kind, date] of [["Planned", task.plannedAt], ["Due", task.dueAt]] as const) {
        if (!date || date < from || date >= end) continue;
        const day = new Date(`${date}T12:00:00`);
        event(`task-${encodeURIComponent(task.id)}-${kind.toLowerCase()}`, `${task.title} · ${kind}`, `DTSTART;VALUE=DATE:${dateValue(day)}`, `DTEND;VALUE=DATE:${dateValue(localDay(day, 1))}`);
      }
    }
  }
  lines.push("END:VCALENDAR");
  return { contents: lines.map(foldCalendarLine).join("\r\n") + "\r\n", count, from, through,
    message: !saved ? "No saved schedule. Save your work schedule to include scheduled shifts." : count === 0 ? "No events in this date range." : null };
}
