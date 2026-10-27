import type { WriteReceipt } from "./writeReceipt";
import { z } from "zod";
import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import { MEMORY_KINDS, type MemoryAction, type MemoryFact, type MemoryKind, type MemoryRevision } from "../domain/memory";
import { writeAtomically } from "./atomicWrite";
import { logEvent } from "./commands";
import { getActiveDay } from "./queries";
import { computeDueRollover } from "../engine/dayRollover";

const snapshot = z.object({
  factId: z.string().min(1).max(100), kind: z.enum(MEMORY_KINDS), statement: z.string().trim().min(1).max(280),
  status: z.enum(["ACTIVE", "IRRELEVANT"]), supersedes: z.string().min(1).nullable(),
  action: z.enum(["CREATED", "CORRECTED", "CONFIRMED", "IRRELEVANT", "RESTORED"]),
}).strict();
const broken = () => new Error("Memory history is incomplete or conflicting. Your records have not been changed.");

/** Causal chains, not clock ordering. Imported corruption is unavailable, never empty memory. */
export function projectMemory(events: readonly DomainEvent[]): MemoryFact[] {
  const groups = new Map<string, { event: DomainEvent; payload: z.infer<typeof snapshot> }[]>();
  for (const event of events) {
    if (event.type !== "MEMORY_RECORDED") continue;
    const parsed = snapshot.safeParse(event.payload);
    if (!parsed.success || event.source !== "USER" || !event.beyondDayId || !Number.isFinite(Date.parse(event.recordedAt))) throw broken();
    const list = groups.get(parsed.data.factId) ?? [];
    list.push({ event, payload: parsed.data }); groups.set(parsed.data.factId, list);
  }
  const facts: MemoryFact[] = [];
  for (const [factId, rows] of groups) {
    const next = new Map<string | null, typeof rows[number]>();
    for (const row of rows) { if (next.has(row.payload.supersedes)) throw broken(); next.set(row.payload.supersedes, row); }
    const history: MemoryRevision[] = []; const visited = new Set<string>();
    let previous: MemoryRevision | undefined;
    while (next.has(previous?.id ?? null)) {
      const { event, payload } = next.get(previous?.id ?? null)!;
      if (visited.has(event.id)) throw broken(); visited.add(event.id);
      const same = previous && payload.kind === previous.kind && payload.statement === previous.statement;
      if (!previous) { if (payload.action !== "CREATED" || payload.status !== "ACTIVE") throw broken(); }
      else {
        if (payload.action === "CREATED") throw broken();
        if (payload.action === "CORRECTED" && payload.status !== previous.status) throw broken();
        if (payload.action === "CONFIRMED" && (!same || previous.status !== "ACTIVE" || payload.status !== "ACTIVE")) throw broken();
        if (payload.action === "IRRELEVANT" && (!same || previous.status !== "ACTIVE" || payload.status !== "IRRELEVANT")) throw broken();
        if (payload.action === "RESTORED" && (!same || previous.status !== "IRRELEVANT" || payload.status !== "ACTIVE")) throw broken();
      }
      const revision: MemoryRevision = { ...payload, id: event.id, recordedAt: event.recordedAt, beyondDayId: event.beyondDayId!,
        lastConfirmedAt: payload.action === "IRRELEVANT" ? previous!.lastConfirmedAt : event.recordedAt };
      history.push(revision); previous = revision;
    }
    if (!previous || visited.size !== rows.length) throw broken();
    facts.push({ ...previous, factId, source: "OPERATOR", createdAt: history[0]!.recordedAt, history });
  }
  return facts.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.factId.localeCompare(b.factId));
}
export async function getMemoryFacts() {
  return projectMemory(await db.events.where("type").equals("MEMORY_RECORDED").toArray());
}
export async function getMemoryWorkspace() {
  return db.transaction("r", [db.events, db.beyondDays], async () => {
    const [facts, day] = await Promise.all([getMemoryFacts(), getActiveDay()]);
    return { facts, dayId: day?.id ?? null };
  });
}
type Write = { dayId: string; factId: string; expectedPreviousId: string | null; action: MemoryAction; kind?: MemoryKind; statement?: string };
/** A revision never consumes food/water or changes tasks/plans/recommendations. */
export async function recordMemory(input: Write, receipt?: WriteReceipt): Promise<MemoryFact> {
  return writeAtomically(["beyondDays"], async () => {
    const day = await getActiveDay();
    if (!day || day.id !== input.dayId || computeDueRollover(new Date(day.startedAt), new Date())) throw new Error("Your day changed. Reopen memory for the current day. Your draft is kept.");
    const current = (await getMemoryFacts()).find((fact) => fact.factId === input.factId);
    if (!current && input.action !== "CREATED") throw new Error("That memory is unavailable. Nothing was saved.");
    const payload = snapshot.safeParse({ factId: input.factId, action: input.action,
      kind: input.kind ?? current?.kind, statement: input.statement ?? current?.statement,
      status: input.action === "IRRELEVANT" ? "IRRELEVANT" : input.action === "RESTORED" || input.action === "CREATED" ? "ACTIVE" : current?.status,
      supersedes: input.expectedPreviousId });
    if (!payload.success) throw new Error("Choose a kind and write 1–280 characters. Nothing was saved.");
    const p = payload.data;
    if (input.action === "CREATED") {
      if (input.expectedPreviousId !== null) throw broken();
      if (current) {
        const root = current.history[0]!;
        if (root.kind === p.kind && root.statement === p.statement) return current;
        throw new Error("This memory was already saved with different words. Reopen it before changing it.");
      }
    } else if (current!.id !== input.expectedPreviousId) {
      if (current!.supersedes === input.expectedPreviousId && current!.action === input.action && current!.kind === p.kind && current!.statement === p.statement && current!.status === p.status) return current!;
      throw new Error("Memory changed elsewhere. Your draft is kept; reload the saved version before changing it.");
    }
    if (current) {
      if (input.action === "CORRECTED" && current.kind === p.kind && current.statement === p.statement) return current;
      if (input.action === "IRRELEVANT" && current.status === "IRRELEVANT") return current;
      if (input.action === "RESTORED" && current.status === "ACTIVE") return current;
      if (input.action === "CONFIRMED" && current.status !== "ACTIVE") throw new Error("Restore this memory before confirming it.");
      if (input.action !== "CORRECTED" && (p.kind !== current.kind || p.statement !== current.statement)) throw new Error("Use the correction form to change a memory.");
    }
    const id = await logEvent(day.id, "MEMORY_RECORDED", p, "USER", input.factId, input.expectedPreviousId ?? undefined);
    // Validate the entire prospective chain inside the same transaction; any fault rolls back.
    const saved = (await getMemoryFacts()).find((fact) => fact.id === id);
    if (!saved) throw broken();
    if (receipt) receipt.changed = true;
    return saved;
  });
}
