import type { WriteReceipt } from "./writeReceipt";
import { z } from "zod";
import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import { MEMORY_KINDS, type MemoryAction, type MemoryFact, type MemoryKind, type MemoryRevision } from "../domain/memory";
import { writeAtomically } from "./atomicWrite";
import { MEMORY_TOPICS } from "../domain/alfred/types";
import { logIntentEvent } from "./intentCommands";
import { logEvent } from "./commands";
import { getActiveDay } from "./queries";
import { computeDueRollover } from "../engine/dayRollover";

const originSchema = z.object({ kind: z.literal("ALFRED_MEMORY"), id: z.string().min(1), text: z.string().min(1), topic: z.enum(MEMORY_TOPICS), savedAt: z.string().datetime() }).strict();
const snapshot = z.object({
  factId: z.string().min(1).max(100), kind: z.enum(MEMORY_KINDS), statement: z.string().trim().min(1).max(280),
  topic: z.enum(MEMORY_TOPICS).optional(), origin: originSchema.optional(),
  status: z.enum(["ACTIVE", "IRRELEVANT"]), supersedes: z.string().min(1).nullable(),
  action: z.enum(["CREATED", "CORRECTED", "CONFIRMED", "IRRELEVANT", "RESTORED"]),
}).strict().refine((p) => p.kind === "PERSONAL_FACT" ? Boolean(p.topic) : p.topic === undefined && p.origin === undefined);
const broken = () => new Error("Memory history is incomplete or conflicting. Your records have not been changed.");

/** Causal chains, not clock ordering. Imported corruption is unavailable, never empty memory. */
export function projectMemory(events: readonly DomainEvent[]): MemoryFact[] {
  const groups = new Map<string, { event: DomainEvent; payload: z.infer<typeof snapshot> }[]>();
  for (const event of events) {
    if (event.type !== "MEMORY_RECORDED") continue;
    const parsed = snapshot.safeParse(event.payload);
    if (!parsed.success || event.source !== "USER" || (parsed.data.kind === "PERSONAL_FACT" ? event.beyondDayId !== undefined : !event.beyondDayId) || !Number.isFinite(Date.parse(event.recordedAt))) throw broken();
    const list = groups.get(parsed.data.factId) ?? [];
    list.push({ event, payload: parsed.data }); groups.set(parsed.data.factId, list);
  }
  const facts: MemoryFact[] = []; const origins = new Set<string>();
  for (const [factId, rows] of groups) {
    const next = new Map<string | null, typeof rows[number]>();
    for (const row of rows) { if (next.has(row.payload.supersedes)) throw broken(); next.set(row.payload.supersedes, row); }
    const history: MemoryRevision[] = []; const visited = new Set<string>();
    let previous: MemoryRevision | undefined;
    while (next.has(previous?.id ?? null)) {
      const { event, payload } = next.get(previous?.id ?? null)!;
      if (visited.has(event.id)) throw broken(); visited.add(event.id);
      const same = previous && payload.kind === previous.kind && payload.statement === previous.statement && payload.topic === previous.topic;
      if (!previous) { if (payload.action !== "CREATED" || payload.status !== "ACTIVE") throw broken(); }
      else {
        if ((payload.kind === "PERSONAL_FACT") !== (previous.kind === "PERSONAL_FACT") || JSON.stringify(payload.origin) !== JSON.stringify(previous.origin)) throw broken();
        if (payload.action === "CREATED") throw broken();
        if (payload.action === "CORRECTED" && payload.status !== previous.status) throw broken();
        if (payload.action === "CONFIRMED" && (!same || previous.status !== "ACTIVE" || payload.status !== "ACTIVE")) throw broken();
        if (payload.action === "IRRELEVANT" && (!same || previous.status !== "ACTIVE" || payload.status !== "IRRELEVANT")) throw broken();
        if (payload.action === "RESTORED" && (!same || previous.status !== "IRRELEVANT" || payload.status !== "ACTIVE")) throw broken();
      }
      const revision: MemoryRevision = { ...payload, id: event.id, recordedAt: event.recordedAt, ...(event.beyondDayId ? { beyondDayId: event.beyondDayId } : {}),
        lastConfirmedAt: payload.action === "IRRELEVANT" ? previous!.lastConfirmedAt : event.recordedAt };
      history.push(revision); previous = revision;
    }
    if (!previous || visited.size !== rows.length) throw broken();
    if (previous.origin) { if (origins.has(previous.origin.id)) throw broken(); origins.add(previous.origin.id); }
    facts.push({ ...previous, factId, source: "OPERATOR", createdAt: history[0]!.recordedAt, history });
  }
  return facts.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.factId.localeCompare(b.factId));
}
export async function getMemoryFacts() {
  const facts = projectMemory(await db.events.where("type").equals("MEMORY_RECORDED").toArray());
  for (const fact of facts) if (fact.origin) {
    const row = await db.alfredMemories.get(fact.origin.id);
    if (!row || row.text !== fact.origin.text || row.topic !== fact.origin.topic || row.savedAt !== fact.origin.savedAt) throw broken();
  }
  return facts;
}
export async function getMemoryWorkspace() {
  return db.transaction("r", [db.events, db.beyondDays, db.alfredMemories], async () => {
    const [facts, day] = await Promise.all([getMemoryFacts(), getActiveDay()]);
    return { facts, dayId: day?.id ?? null };
  });
}
type Write = { dayId?: string | null | undefined; factId: string; expectedPreviousId: string | null; action: MemoryAction; kind?: MemoryKind; statement?: string; topic?: MemoryFact["topic"]; origin?: MemoryFact["origin"] };
/** A revision never consumes food/water or changes tasks/plans/recommendations. */
export async function recordMemory(input: Write, receipt?: WriteReceipt): Promise<MemoryFact> {
  return writeAtomically(["beyondDays", "alfredMemories"], async () => {
    const current = (await getMemoryFacts()).find((fact) => fact.factId === input.factId);
    const global = (input.kind ?? current?.kind) === "PERSONAL_FACT";
    const day = global ? null : await getActiveDay();
    if (!global && (!day || day.id !== input.dayId || computeDueRollover(new Date(day.startedAt), new Date()))) throw new Error("Your day changed. Reopen memory for the current day. Your draft is kept.");
    if (!current && input.action !== "CREATED") throw new Error("That memory is unavailable. Nothing was saved.");
    const payload = snapshot.safeParse({ factId: input.factId, action: input.action,
      ...(input.topic ?? current?.topic ? { topic: input.topic ?? current?.topic } : {}),
      ...(input.origin ?? current?.origin ? { origin: input.origin ?? current?.origin } : {}),
      kind: input.kind ?? current?.kind, statement: input.statement ?? current?.statement,
      status: input.action === "IRRELEVANT" ? "IRRELEVANT" : input.action === "RESTORED" || input.action === "CREATED" ? "ACTIVE" : current?.status,
      supersedes: input.expectedPreviousId });
    if (!payload.success) throw new Error("Choose a kind and write 1–280 characters. Nothing was saved.");
    const p = payload.data;
    if (input.action === "CREATED") {
      if (input.expectedPreviousId !== null) throw broken();
      if (current) {
        if (global !== (current.kind === "PERSONAL_FACT") || JSON.stringify(p.origin) !== JSON.stringify(current.origin)) throw broken();
        const root = current.history[0]!;
        if (root.kind === p.kind && root.statement === p.statement && root.topic === p.topic && JSON.stringify(root.origin) === JSON.stringify(p.origin)) return current;
        throw new Error("This memory was already saved with different words. Reopen it before changing it.");
      }
    } else if (current!.id !== input.expectedPreviousId) {
      if (current!.supersedes === input.expectedPreviousId && current!.action === input.action && current!.kind === p.kind && current!.statement === p.statement && current!.status === p.status && current!.topic === p.topic && JSON.stringify(current!.origin) === JSON.stringify(p.origin)) return current!;
      throw new Error("Memory changed elsewhere. Your draft is kept; reload the saved version before changing it.");
    }
    if (current) {
      if (global !== (current.kind === "PERSONAL_FACT") || JSON.stringify(p.origin) !== JSON.stringify(current.origin)) throw broken();
      if (input.action === "CORRECTED" && current.kind === p.kind && current.statement === p.statement && current.topic === p.topic) return current;
      if (input.action === "IRRELEVANT" && current.status === "IRRELEVANT") return current;
      if (input.action === "RESTORED" && current.status === "ACTIVE") return current;
      if (input.action === "CONFIRMED" && current.status !== "ACTIVE") throw new Error("Restore this memory before confirming it.");
      if (input.action !== "CORRECTED" && (p.kind !== current.kind || p.statement !== current.statement || p.topic !== current.topic)) throw new Error("Use the correction form to change a memory.");
    }
    const id = global
      ? await logIntentEvent("MEMORY_RECORDED", p, "USER", input.factId, {}, input.expectedPreviousId ?? undefined)
      : await logEvent(day!.id, "MEMORY_RECORDED", p, "USER", input.factId, input.expectedPreviousId ?? undefined);
    // Validate the entire prospective chain inside the same transaction; any fault rolls back.
    const saved = (await getMemoryFacts()).find((fact) => fact.id === id);
    if (!saved) throw broken();
    if (receipt) receipt.changed = true;
    return saved;
  });
}
