import { contextSource, readOperatorContext } from "../operatorContext";
import { getMemories } from "./alfredMemory";
import { db } from "../../persistence/db";
import { parseProject } from "../../persistence/intentValidation";
import { getDaySummaries } from "../dayLedgerQueries";
import { dayLine } from "./alfredContext";
import { formatLocalDate } from "../../engine/scheduledContext";

/**
 * ALFRED-004 (#4 "When did I last…?", #5 "Did this work for me?"): Alfred's two read tools over the
 * whole history. Read only; every line is a stored record, newest first, so he can cite it.
 */
const stamp = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const clip = (v: unknown) => { const s = JSON.stringify(v); return s.length > 220 ? `${s.slice(0, 220)}…` : s; };

export async function searchRecords(query: string, limit = 30, includePersonal = false): Promise<string> {
  if (query.length > 500) return "Search phrase is too long. Use a few specific words.";
  limit = Math.max(1, Math.min(30, Math.floor(limit) || 30));
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return "Give a word to search for.";
  const hits: { at: string; line: string }[] = [];
  const consider = (at: string | undefined, label: string, record: unknown) => {
    if (!at) return;
    const text = `${label} ${JSON.stringify(record)}`.toLowerCase();
    if (terms.every((t) => text.includes(t))) hits.push({ at, line: `${stamp(at)} · ${label} · ${clip(record)}` });
  };
  const [events, notes, tasks, sessions, sets, memories, projects] = await Promise.all([
    db.events.toArray(), db.captureItems.toArray(), db.obligations.toArray(),
    db.workoutSessions.toArray(), db.performedSets.toArray(), getMemories(), db.projects.toArray(),
  ]);
  // A historical correction is not current memory; never leak opted-out personal facts via events.
  for (const e of events) {
    if (e.type === "MEMORY_RECORDED" || e.type.startsWith("MISSION_")) continue;
    // ROUTINES-001: routine ticks are for the day they're on, not a record to tally.
    if (e.type === "ROUTINE_STEP_SET") continue;
    consider(e.occurredAt, `Historical ${e.type} (not current state)`, e.payload);
  }
  // Current sources share the same classification/privacy boundary as the initial request.
  const context = await readOperatorContext({ purpose: "conversation", includePersonal });
  for (const s of context.records.filter((r) => ["MEMORY", "MISSION", "ROUTINE"].includes(r.kind))) {
    consider(s.at, s.kind, { source: s.key, text: s.text, classification: s.classification });
  }
  for (const n of notes) consider(n.capturedAt, `NOTE ${n.status}`, n.text);
  for (const t of tasks) consider(t.resolvedAt ?? t.dueAt ?? t.createdAt, `TASK ${t.status}`, { title: t.title, description: t.description, due: t.dueAt, resolved: t.resolvedAt, project: t.projectId });
  for (const w of sessions) consider(w.startedAt, `WORKOUT ${w.status}`, { template: w.templateId, type: w.sessionType, ended: w.endedAt });
  for (const s of sets) consider(typeof s.recordedAt === "string" ? s.recordedAt : undefined, "SET", s);
  for (const m of memories) consider(m.savedAt, `MEMORY ${m.topic}`, m.text);
  for (const p of projects.map(parseProject).filter((x): x is NonNullable<typeof x> => x !== null)) consider(p.updatedAt, `PROJECT ${p.status}`, { id: p.id, title: p.title, finish: p.finish });
  hits.sort((a, b) => b.at.localeCompare(a.at));
  return hits.length ? `${hits.length} match${hits.length === 1 ? "" : "es"} for "${query}" (newest first${hits.length > limit ? `, first ${limit}` : ""}):\n${hits.slice(0, limit).map((h) => h.line).join("\n")}` : `No records match "${query}".`;
}

export async function getDays(from: string, to: string): Promise<string> {
  const summaries = await getDaySummaries();
  // A lived day is dated by the local calendar day it starts on.
  const local = (iso: string) => formatLocalDate(new Date(iso));
  const days = summaries.filter((s) => local(s.livedDayStart) >= from && local(s.livedDayStart) <= to)
    .sort((a, b) => a.livedDayStart.localeCompare(b.livedDayStart));
  if (!days.length) return `No BEYOND days between ${from} and ${to}.`;
  const lines: string[] = []; let size = 0;
  for (const day of days) {
    const source = contextSource("DAY", day.beyondDayId, JSON.stringify(day), "Recorded day", dayLine(day));
    const line = `[[${source.key}]] Derived from records: ${source.text}`;
    if (lines.length >= 60 || size + line.length > 16_000) break;
    lines.push(line); size += line.length;
  }
  return `${days.length} lived days ${from} → ${to} (oldest first; '-' = not logged):\n${lines.join("\n")}\nCoverage: ${lines.length} of ${days.length} supplied; ${days.length - lines.length} omitted by limits.`;
}

/** Only actual source tokens from an authorized read result may extend a turn's inspection catalog. */
export async function readToolSources(result: string, includePersonal: boolean) {
  const keys = new Set([...result.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!));
  if (keys.size === 0) return [];
  const context = await readOperatorContext({ purpose: "conversation", includePersonal });
  return context.records.filter((s) => keys.has(s.key)).slice(0, 60);
}
