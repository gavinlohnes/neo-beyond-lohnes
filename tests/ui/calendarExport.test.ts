import { expect, it } from "vitest";
import { buildCalendarExport, escapeCalendarText, foldCalendarLine } from "../../src/application/calendarExport";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { Obligation } from "../../src/domain/intent/types";
const pattern = { ...DEFAULT_SCHEDULE_PATTERN, anchorMonday: "2026-11-02", updatedAt: "2026-11-01T00:00:00Z" };
const task: Obligation = { id: "birthday-1", title: "Birthday, family; 🦇", description: "PRIVATE", status: "OPEN", source: "USER", createdAt: "2026-11-01", updatedAt: "2026-11-01", plannedAt: "2026-11-03", dueAt: "2026-11-04" };
const input = { now: new Date(2026, 10, 2, 16, 29), pattern, obligations: [task], includePlans: false, weeks: 4 as const };
it("escapes TEXT and folds UTF-8 to 75 octets without breaking characters", () => {
  expect(escapeCalendarText("a\\b;c,d\r\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  const text = "SUMMARY:" + "🦇é".repeat(40), folded = foldCalendarLine(text);
  expect(folded.replace(/\r\n /g, "")).toBe(text);
  expect(folded.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
});
it("uses civil dates and overnight ends on either side of 16:30", () => {
  for (const minute of [29, 31]) {
    const result = buildCalendarExport({ ...input, now: new Date(2026, 10, 2, 16, minute) });
    expect(result.contents).toContain("DTSTART:20261102T180000\r\nDTEND:20261103T060000");
    expect(result.contents).toContain("SUMMARY:Scheduled shift");
    expect(result.contents.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(result.count).toBe(14);
  }
});
it("keeps stable UIDs across exports and excludes tasks from shifts only", () => {
  const first = buildCalendarExport(input), second = buildCalendarExport({ ...input, now: new Date(2026, 10, 2, 20) });
  expect(first.contents.match(/^UID:.+$/gm)).toEqual(second.contents.match(/^UID:.+$/gm));
  expect(first.contents).not.toContain("Birthday");
  expect(first.contents).not.toContain("PRIVATE");
});
it("includes only titles and separate all-day planned/due events", () => {
  const result = buildCalendarExport({ ...input, includePlans: true });
  expect(result.count).toBe(16);
  expect(result.contents).toContain("DTSTART;VALUE=DATE:20261103\r\nDTEND;VALUE=DATE:20261104");
  expect(result.contents).toContain("Birthday\\, family\\; 🦇 · Planned");
  expect(result.contents).toContain("Birthday\\, family\\; 🦇 · Due");
  expect(result.contents).not.toContain("PRIVATE");
});
it("uses an exclusive 4/8 week range", () => {
  const edge = { ...task, plannedAt: "2026-11-30", dueAt: "2026-12-28" };
  expect(buildCalendarExport({ ...input, obligations: [edge], includePlans: true }).count).toBe(14);
  expect(buildCalendarExport({ ...input, obligations: [edge], includePlans: true, weeks: 8 })).toMatchObject({ count: 29, through: "2026-12-27" });
  expect(() => buildCalendarExport({ ...input, weeks: 2 as 4 })).toThrow();
});
it("explains unsaved and empty schedules without inventing shifts", () => {
  expect(buildCalendarExport({ ...input, pattern: DEFAULT_SCHEDULE_PATTERN })).toMatchObject({ count: 0, message: expect.stringContaining("No saved schedule") });
  expect(buildCalendarExport({ ...input, pattern: { ...pattern, weeks: [{ workdays: [] }] } })).toMatchObject({ count: 0, message: "No events in this date range." });
});
