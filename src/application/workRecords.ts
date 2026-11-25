import {
  DEFAULT_REMIND_DAYS, WORK_REMIND_MAX, cleanWorkRecordFields, dayKey, fieldsOf, remindsKind, workDueItems, workRecordProblem,
  yearlyHoursLine, yearlyTrainingHours, type RemindKind, type WorkDueItem, type WorkRecord, type WorkRecordFields,
} from "../domain/workRecords";
import type { ScheduleException } from "../domain/scheduleExceptions";
import type { StandardTestKind } from "../domain/common/types";
import type { StandardResult } from "../domain/workout/standardTests";
import { isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { parseWorkRecord } from "../persistence/workRecordValidation";
import { writeAtomically } from "./atomicWrite";
import { getSchedulePattern } from "./queries";
import { getConfirmedExceptions, getUpcomingExceptions } from "./scheduleExceptions";
import { getStandardResults } from "./standardTestQueries";

/**
 * GRAYSON-WORK-RECORD-001 (C2.7; Gavin, 2026-11-24, Protected persistence): add, change, remove and restore his work
 * record, and the reads Work record, TODAY's WORK_DUE line and Work schedule show. Every write is his tap; nothing
 * here is deleted (REMOVE moves `status` and appends to `history`, so UNDO and restore bring it back). No Engine
 * input, no recommendation, no notification, no event. Marking a work date as work goes through the existing OT
 * confirmation (confirmScheduleException) and his CONFIRM, never from here.
 */
const TABLES = ["workRecords"] as const;
const newId = () => crypto.randomUUID();

function valid(fields: WorkRecordFields): WorkRecordFields {
  const problem = workRecordProblem(fields);
  if (problem) throw new Error(`WORK_RECORD_INVALID: ${problem}`);
  return cleanWorkRecordFields(fields);
}

async function activeById(id: string): Promise<WorkRecord> {
  const row = parseWorkRecord(await db.workRecords.get(id));
  if (!row || row.status !== "ACTIVE") throw new Error("WORK_RECORD_NOT_ACTIVE: that item isn't in your work record.");
  return row;
}

/** Adds one item. A reminder kind with no days set takes his per-kind default. */
export async function addWorkRecord(input: WorkRecordFields, now: Date = new Date()): Promise<WorkRecord> {
  const withDefault: WorkRecordFields = remindsKind(input.kind) && input.remindDays === undefined
    ? { ...input, remindDays: readWorkRecordSettings().remindDays[input.kind as RemindKind] } : input;
  const fields = valid(withDefault);
  const at = now.toISOString();
  const record: WorkRecord = { ...fields, id: newId(), status: "ACTIVE", history: [{ at, action: "ADDED" }], createdAt: at, updatedAt: at };
  await writeAtomically(TABLES, () => db.workRecords.add(record));
  return record;
}

async function change(id: string, next: (current: WorkRecord) => WorkRecordFields, now: Date): Promise<WorkRecord> {
  return writeAtomically(TABLES, async () => {
    const current = await activeById(id);
    const fields = valid(next(current));
    if (fields.kind !== current.kind) throw new Error("WORK_RECORD_KIND: an item keeps its kind. Remove it and add a new one.");
    const at = now.toISOString();
    const updated: WorkRecord = {
      ...fields, id, status: current.status, createdAt: current.createdAt, updatedAt: at,
      history: [...current.history, { at, action: "CHANGED", before: fieldsOf(current) }],
    };
    await db.workRecords.put(updated);
    return updated;
  });
}

/** Any field he edits. The old values are kept in `history`. */
export function changeWorkRecord(id: string, fields: WorkRecordFields, now: Date = new Date()): Promise<WorkRecord> {
  return change(id, (current) => ({ ...fields, ...(current.doneAt && fields.doneAt === undefined && fields.kind === "WORK_DATE" ? { doneAt: current.doneAt } : {}) }), now);
}

/** DONE on a work date: it leaves TODAY. */
export function markWorkDateDone(id: string, now: Date = new Date()): Promise<WorkRecord> {
  return change(id, (current) => {
    if (current.kind !== "WORK_DATE") throw new Error("WORK_RECORD_KIND: only a work date can be done.");
    return { ...fieldsOf(current), doneAt: now.toISOString() };
  }, now);
}

/** RENEWED on a certification: the new expiry he typed. */
export function renewCertification(id: string, expiresOn: string, now: Date = new Date()): Promise<WorkRecord> {
  return change(id, (current) => {
    if (current.kind !== "CERTIFICATION") throw new Error("WORK_RECORD_KIND: only a certification can be renewed.");
    return { ...fieldsOf(current), expiresOn };
  }, now);
}

/** REMOVE: marked removed, never deleted. UNDO or restore brings it back. */
export async function removeWorkRecord(id: string, now: Date = new Date()): Promise<WorkRecord> {
  return writeAtomically(TABLES, async () => {
    const current = await activeById(id);
    const at = now.toISOString();
    const removed: WorkRecord = { ...current, status: "REMOVED", updatedAt: at, history: [...current.history, { at, action: "REMOVED" }] };
    await db.workRecords.put(removed);
    return removed;
  });
}

export async function restoreWorkRecord(id: string, now: Date = new Date()): Promise<WorkRecord> {
  return writeAtomically(TABLES, async () => {
    const current = parseWorkRecord(await db.workRecords.get(id));
    if (!current || current.status !== "REMOVED") throw new Error("WORK_RECORD_NOT_REMOVED: that item isn't removed.");
    const at = now.toISOString();
    const restored: WorkRecord = { ...current, status: "ACTIVE", updatedAt: at, history: [...current.history, { at, action: "RESTORED" }] };
    await db.workRecords.put(restored);
    return restored;
  });
}

// ---- Settings (beyond.workRecord.v1, travels with the backup as "Work record") ----

export const WORK_RECORD_SETTINGS_KEY = "beyond.workRecord.v1";
export interface WorkRecordSettings {
  /** His yearly training-hours goal; blank (null) until he sets it. */
  goalHours: number | null;
  /** The month his training year starts (1 = January). */
  yearStartMonth: number;
  /** Per-kind "remind me" days for new items. */
  remindDays: Record<RemindKind, number>;
  /** The two-year-mark offer has been shown (it appears once). */
  twoYearOfferShown: boolean;
}
export const DEFAULT_WORK_RECORD_SETTINGS: WorkRecordSettings = { goalHours: null, yearStartMonth: 1, remindDays: { ...DEFAULT_REMIND_DAYS }, twoYearOfferShown: false };

const goalOk = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 2000 && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;
const daysOk = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= WORK_REMIND_MAX;

/** Validated on read: anything unreadable falls back to its default. */
export function readWorkRecordSettings(): WorkRecordSettings {
  let raw: unknown;
  try { raw = JSON.parse(localStorage.getItem(WORK_RECORD_SETTINGS_KEY) ?? "null"); } catch { raw = null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_WORK_RECORD_SETTINGS, remindDays: { ...DEFAULT_REMIND_DAYS } };
  const r = raw as Record<string, unknown>;
  const days = (r.remindDays && typeof r.remindDays === "object" ? r.remindDays : {}) as Record<string, unknown>;
  const month = r.yearStartMonth;
  return {
    goalHours: goalOk(r.goalHours) ? r.goalHours : null,
    yearStartMonth: typeof month === "number" && Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1,
    remindDays: {
      WORK_DATE: daysOk(days.WORK_DATE) ? days.WORK_DATE : DEFAULT_REMIND_DAYS.WORK_DATE,
      CERTIFICATION: daysOk(days.CERTIFICATION) ? days.CERTIFICATION : DEFAULT_REMIND_DAYS.CERTIFICATION,
      MILESTONE: daysOk(days.MILESTONE) ? days.MILESTONE : DEFAULT_REMIND_DAYS.MILESTONE,
    },
    twoYearOfferShown: r.twoYearOfferShown === true,
  };
}

/** Saves his settings. Throws with the words to show when a value doesn't fit. */
export function writeWorkRecordSettings(next: WorkRecordSettings): WorkRecordSettings {
  if (next.goalHours !== null && !goalOk(next.goalHours)) throw new Error("WORK_RECORD_INVALID: enter a goal from 0.25 to 2000 hours, or leave it blank.");
  if (!Number.isInteger(next.yearStartMonth) || next.yearStartMonth < 1 || next.yearStartMonth > 12) throw new Error("WORK_RECORD_INVALID: pick a month.");
  for (const v of Object.values(next.remindDays)) if (!daysOk(v)) throw new Error(`WORK_RECORD_INVALID: remind from 0 to ${WORK_REMIND_MAX} days before.`);
  try { localStorage.setItem(WORK_RECORD_SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage blocked: unchanged */ }
  return next;
}

// ---- Reads ----

/** Every readable item, active and removed (malformed rows are skipped). */
export async function getWorkRecords(): Promise<WorkRecord[]> {
  return (await db.workRecords.toArray()).map(parseWorkRecord).filter((r): r is WorkRecord => r !== null);
}

/** The items due on TODAY right now, nearest first. */
export async function getWorkDue(now: Date = new Date()): Promise<WorkDueItem[]> {
  return workDueItems(await getWorkRecords(), dayKey(now));
}

/** "26 of 40 hours this year, 14 to go by Dec 31" (or "26 hours this year"), from his goal and year start. */
export function trainingHoursSummary(records: readonly WorkRecord[], now: Date = new Date(), settings: WorkRecordSettings = readWorkRecordSettings()): { hours: number; line: string } {
  const today = dayKey(now);
  const hours = yearlyTrainingHours(records, today, settings.yearStartMonth);
  return { hours, line: yearlyHoursLine(hours, settings.goalHours, today, settings.yearStartMonth) };
}

export interface WorkDateOnSchedule {
  record: WorkRecord;
  /** What the rotation (with any confirmed change) says that day is; null with no saved schedule. */
  day: "WORK" | "OFF" | null;
  /** A confirmed change already on that day. */
  confirmed: ScheduleException | null;
  /** MARK AS WORK is offered: a day off with no confirmed change yet. */
  offerMarkAsWork: boolean;
}

/** Upcoming work dates (today on, not done) within `days`, each with what that day is on his schedule. Read only. */
export async function getWorkDatesOnSchedule(now: Date = new Date(), days = 60): Promise<WorkDateOnSchedule[]> {
  const today = dayKey(now);
  const last = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12));
  const items = (await getWorkRecords())
    .filter((r) => r.status === "ACTIVE" && r.kind === "WORK_DATE" && !r.doneAt && r.date && r.date >= today && r.date <= last)
    .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time ?? "").localeCompare(b.time ?? ""));
  if (!items.length) return [];
  const [pattern, confirmed] = await Promise.all([getSchedulePattern(), getConfirmedExceptions(items.map((r) => r.date!))]);
  const saved = isOperatorSavedSchedule(pattern);
  return items.map((record) => {
    const [y, m, d] = record.date!.split("-").map(Number);
    const exception = confirmed.get(record.date!) ?? null;
    const day = exception ? exception.kind : saved ? scheduledWorkContextForLivedDay(new Date(y!, m! - 1, d!, 16, 30), pattern) : null;
    return { record, day, confirmed: exception, offerMarkAsWork: day === "OFF" && !exception };
  });
}

/** The next three confirmed swaps and OT, for the "Swaps and OT" link. */
export async function getNextSwapsAndOt(now: Date = new Date()): Promise<ScheduleException[]> {
  return (await getUpcomingExceptions(now)).slice(0, 3);
}

/** STANDARDS-001's last result per test, read from TRAIN (never stored again here). */
export async function getLatestStandards(): Promise<StandardResult[]> {
  const seen = new Set<StandardTestKind>();
  return (await getStandardResults()).filter((r) => (seen.has(r.test) ? false : (seen.add(r.test), true)));
}
