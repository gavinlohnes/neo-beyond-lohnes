/**
 * GRAYSON-WORK-RECORD-001 (C2.7, B16; Gavin, 2026-11-24): his work record. Training hours, certifications that expire,
 * court and training dates, and milestones like his two-year mark, kept beside his swaps and OT. Records he keeps, not
 * events of a lived day, so they live in their own table following the schedule-exception pattern: a stable `id`,
 * `status: ACTIVE | REMOVED` and an append-only `history`. Nothing is ever deleted. Local only, in native backups.
 *
 * Pure: types, limits and the words and windows TODAY and Work record show. No I/O, no clock of its own.
 */
export type WorkRecordKind = "TRAINING" | "CERTIFICATION" | "WORK_DATE" | "MILESTONE";
export type WorkDateType = "COURT" | "TRAINING_CLASS" | "OTHER";
export type WorkRecordStatus = "ACTIVE" | "REMOVED";
export type WorkRecordAction = "ADDED" | "CHANGED" | "REMOVED" | "RESTORED";

/** The fields he types. Which ones a kind uses is in the comments; the rest stay unset. */
export interface WorkRecordFields {
  kind: WorkRecordKind;
  /** A short title, like Court. For a certification, its name ("CPR card"). */
  title: string;
  /** TRAINING, WORK_DATE, MILESTONE: the day (yyyy-mm-dd). CERTIFICATION: expiry, else earned date, else unset. */
  date?: string;
  /** TRAINING: hours, in quarter-hour steps. */
  hours?: number;
  /** TRAINING: optional note. */
  note?: string;
  /** CERTIFICATION: optional earned and expiry dates (yyyy-mm-dd). */
  earnedOn?: string;
  expiresOn?: string;
  /** WORK_DATE: optional start time (HH:MM, 24h) and its type. */
  time?: string;
  workType?: WorkDateType;
  /** CERTIFICATION, WORK_DATE, MILESTONE: "Remind me" on or off, and how many days before. */
  remind?: boolean;
  remindDays?: number;
  /** WORK_DATE: set by DONE; a done work date leaves TODAY. */
  doneAt?: string;
}

export interface WorkRecordRevision {
  at: string;
  action: WorkRecordAction;
  /** For CHANGED: the fields as they were before. */
  before?: WorkRecordFields;
}

export interface WorkRecord extends WorkRecordFields {
  id: string;
  status: WorkRecordStatus;
  history: WorkRecordRevision[];
  createdAt: string;
  updatedAt: string;
}

export const WORK_RECORD_KINDS: readonly WorkRecordKind[] = ["WORK_DATE", "TRAINING", "CERTIFICATION", "MILESTONE"];
export const WORK_RECORD_KIND_LABEL: Readonly<Record<WorkRecordKind, string>> = {
  TRAINING: "Training hours", CERTIFICATION: "Certification", WORK_DATE: "Work date", MILESTONE: "Milestone",
};
export const WORK_DATE_TYPES: readonly WorkDateType[] = ["COURT", "TRAINING_CLASS", "OTHER"];
export const WORK_DATE_TYPE_LABEL: Readonly<Record<WorkDateType, string>> = { COURT: "Court", TRAINING_CLASS: "Training class", OTHER: "Other" };

export const WORK_TITLE_MAX = 80;
export const WORK_NOTE_MAX = 200;
export const WORK_HOURS_MAX = 24;
export const WORK_REMIND_MAX = 365;

/** The kinds that remind, with his per-kind default days (approved defaults: 7, 60 and 30). */
export type RemindKind = "WORK_DATE" | "CERTIFICATION" | "MILESTONE";
export const DEFAULT_REMIND_DAYS: Readonly<Record<RemindKind, number>> = { WORK_DATE: 7, CERTIFICATION: 60, MILESTONE: 30 };
export const remindsKind = (kind: WorkRecordKind): kind is RemindKind => kind !== "TRAINING";

/** The two-year mark he asked for (Jan 9, 2027). Offered once; saved only on ADD. */
export const TWO_YEAR_MARK = { title: "Two-year mark", date: "2027-01-09" } as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isWorkDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(parseDay(v).getTime());
export const isWorkTime = (v: unknown): v is string => typeof v === "string" && TIME_RE.test(v);

/** A yyyy-mm-dd as local noon, so day arithmetic never trips on a clock change. */
export function parseDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12);
}
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Whole calendar days from `from` to `to` (both yyyy-mm-dd); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** Null when the fields are fine for their kind, otherwise the words to show. */
export function workRecordProblem(f: WorkRecordFields): string | null {
  if (!f.title.trim()) return f.kind === "CERTIFICATION" ? "Give it a name, like CPR card." : "Give it a short title, like Court.";
  if (f.title.trim().length > WORK_TITLE_MAX) return `Keep the title under ${WORK_TITLE_MAX} characters.`;
  if (f.note && f.note.length > WORK_NOTE_MAX) return `Keep the note under ${WORK_NOTE_MAX} characters.`;
  if (f.kind !== "CERTIFICATION" && !isWorkDate(f.date)) return "Pick a date.";
  if (f.kind === "TRAINING") {
    const h = f.hours ?? NaN;
    if (!Number.isFinite(h) || h <= 0 || h > WORK_HOURS_MAX || Math.abs(h * 4 - Math.round(h * 4)) > 1e-9) return "Enter hours from 0.25 to 24, in quarter hours.";
  }
  if (f.kind === "CERTIFICATION") {
    if (f.earnedOn !== undefined && !isWorkDate(f.earnedOn)) return "Pick the date you earned it, or leave it blank.";
    if (f.expiresOn !== undefined && !isWorkDate(f.expiresOn)) return "Pick the expiry date, or leave it blank.";
    if (f.earnedOn && f.expiresOn && f.expiresOn < f.earnedOn) return "The expiry date is before the date you earned it.";
  }
  if (f.kind === "WORK_DATE") {
    if (f.time !== undefined && !isWorkTime(f.time)) return "Pick a start time, or leave it blank.";
    if (!f.workType || !WORK_DATE_TYPES.includes(f.workType)) return "Pick court, training class or other.";
  }
  if (remindsKind(f.kind)) {
    const r = f.remindDays ?? NaN;
    if (!Number.isInteger(r) || r < 0 || r > WORK_REMIND_MAX) return `Remind from 0 to ${WORK_REMIND_MAX} days before.`;
  }
  return null;
}

/** Only the fields its kind uses, trimmed; `date` follows the kind (a certification's is its expiry, else earned). */
export function cleanWorkRecordFields(f: WorkRecordFields): WorkRecordFields {
  const title = f.title.trim();
  const note = f.note?.trim();
  if (f.kind === "TRAINING") return { kind: f.kind, title, date: f.date!, hours: f.hours!, ...(note ? { note } : {}) };
  const remind = { remind: f.remind !== false, remindDays: f.remindDays! };
  if (f.kind === "CERTIFICATION") {
    const date = f.expiresOn ?? f.earnedOn;
    return { kind: f.kind, title, ...(date ? { date } : {}), ...(f.earnedOn ? { earnedOn: f.earnedOn } : {}), ...(f.expiresOn ? { expiresOn: f.expiresOn } : {}), ...remind };
  }
  if (f.kind === "WORK_DATE") return { kind: f.kind, title, date: f.date!, ...(f.time ? { time: f.time } : {}), workType: f.workType!, ...remind, ...(f.doneAt ? { doneAt: f.doneAt } : {}) };
  return { kind: f.kind, title, date: f.date!, ...remind };
}

/** The editable fields of a stored record (no id, status or history). */
export function fieldsOf(r: WorkRecord): WorkRecordFields {
  const { id: _i, status: _s, history: _h, createdAt: _c, updatedAt: _u, ...fields } = r;
  return fields;
}

// ---- Words ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** "Dec 15"; with the year when it isn't `today`'s year. */
export function shortDate(date: string, today?: string): string {
  const d = parseDay(date);
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return today && parseDay(today).getFullYear() !== d.getFullYear() ? `${base}, ${d.getFullYear()}` : base;
}
/** "9:00 AM". */
export function clockTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${((h! + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}
/** "today", "tomorrow", "Thursday" (2 to 6 days on), "Thursday, Dec 3" (a week or more), or "Nov 20" in the past. */
export function dayWords(date: string, today: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  const weekday = WEEKDAYS[parseDay(date).getDay()]!;
  if (n > 1 && n < 7) return weekday;
  if (n >= 7) return `${weekday}, ${shortDate(date, today)}`;
  return shortDate(date, today);
}
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

// ---- Due on TODAY ----

export interface WorkDueItem {
  record: WorkRecord;
  /** The date that matters: the work date, the expiry, the milestone. */
  date: string;
  /** "Court Thursday 9:00 AM", "CPR card expires Dec 15, in 21 days", "Two-year mark in 30 days". */
  text: string;
  /** What clears it from TODAY, when it is his tap: DONE on a past work date, RENEWED on a certification. */
  clear: "DONE" | "RENEWED" | null;
}

/**
 * The active items inside their reminder window today, nearest date first. A work date shows from `remindDays` before
 * until he taps DONE (a past one waits for DONE); a certification from `remindDays` before its expiry until he renews
 * it; a milestone from `remindDays` before until its day. "Remind me" off keeps an item off TODAY. Training never shows.
 */
export function workDueItems(records: readonly WorkRecord[], today: string): WorkDueItem[] {
  const due: WorkDueItem[] = [];
  for (const r of records) {
    if (r.status !== "ACTIVE" || !remindsKind(r.kind) || r.remind === false) continue;
    const window = r.remindDays ?? DEFAULT_REMIND_DAYS[r.kind];
    if (r.kind === "WORK_DATE") {
      if (!r.date || r.doneAt) continue;
      const n = daysBetween(today, r.date);
      if (n > window) continue;
      const when = n < 0 ? `was ${shortDate(r.date, today)}` : dayWords(r.date, today);
      due.push({ record: r, date: r.date, text: `${r.title} ${when}${r.time ? ` ${clockTime(r.time)}` : ""}`, clear: n < 0 ? "DONE" : null });
    } else if (r.kind === "CERTIFICATION") {
      if (!r.expiresOn) continue;
      const n = daysBetween(today, r.expiresOn);
      if (n > window) continue;
      const text = n < 0 ? `${r.title} expired ${shortDate(r.expiresOn, today)}` : `${r.title} expires ${shortDate(r.expiresOn, today)}, ${inDays(n)}`;
      due.push({ record: r, date: r.expiresOn, text, clear: "RENEWED" });
    } else {
      if (!r.date) continue;
      const n = daysBetween(today, r.date);
      if (n < 0 || n > window) continue;
      due.push({ record: r, date: r.date, text: `${r.title} ${inDays(n)}`, clear: null });
    }
  }
  return due.sort((a, b) => a.date.localeCompare(b.date) || a.record.createdAt.localeCompare(b.record.createdAt));
}

/** TODAY's one line: the nearest item, and "+N more" inside the line when more are due. Null when nothing is. */
export function workDueLine(items: readonly WorkDueItem[]): string | null {
  if (!items.length) return null;
  return items.length > 1 ? `${items[0]!.text} · +${items.length - 1} more` : items[0]!.text;
}

// ---- Training hours ----

/** His training year containing `today`: from the 1st of `startMonth` (1–12) to the day before it a year on. */
export function trainingYear(today: string, startMonth: number): { start: string; end: string } {
  const d = parseDay(today);
  const month = Math.min(12, Math.max(1, Math.round(startMonth))) - 1;
  const year = d.getMonth() >= month ? d.getFullYear() : d.getFullYear() - 1;
  const start = new Date(year, month, 1, 12);
  const end = new Date(year + 1, month, 0, 12);
  return { start: dayKey(start), end: dayKey(end) };
}

/** Hours of active training inside his training year. */
export function yearlyTrainingHours(records: readonly WorkRecord[], today: string, startMonth: number): number {
  const { start, end } = trainingYear(today, startMonth);
  const total = records
    .filter((r) => r.status === "ACTIVE" && r.kind === "TRAINING" && r.date && r.date >= start && r.date <= end)
    .reduce((sum, r) => sum + (r.hours ?? 0), 0);
  return Math.round(total * 4) / 4;
}

const hoursWords = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")}`;
/** "26 of 40 hours this year, 14 to go by Dec 31", or "26 hours this year" with no goal. No pass, no fail. */
export function yearlyHoursLine(hours: number, goal: number | null, today: string, startMonth: number): string {
  if (goal === null) return `${hoursWords(hours)} ${hours === 1 ? "hour" : "hours"} this year`;
  const left = Math.max(0, Math.round((goal - hours) * 4) / 4);
  return `${hoursWords(hours)} of ${hoursWords(goal)} hours this year, ${hoursWords(left)} to go by ${shortDate(trainingYear(today, startMonth).end)}`;
}
