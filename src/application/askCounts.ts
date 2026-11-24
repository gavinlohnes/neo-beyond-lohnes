import { db } from "../persistence/db";
import type { AskArea, AskCount, AskKind } from "../domain/askCounts";
import { askDate, summarizeAsks, type AskSummary } from "../engine/askSummary";

/**
 * GRAYSON-ASKS-COUNT-001 (Gavin, 2026-11-24, "Asking less, measured"): counts each question GRAYSON puts to him, when
 * it's shown, once per key per lived day. Never an input: nothing but the monthly review's ASKING LESS panel reads
 * these counts, so counting can't change what's asked. Counting never throws into a screen.
 */

export const ASK_COUNT_SETTINGS_KEY = "beyond.askCounts.settings.v1";
export interface AskCountSettings { on: boolean; showPanel: boolean }
export const DEFAULT_ASK_COUNT_SETTINGS: AskCountSettings = { on: true, showPanel: true };
/** Kept this long, then pruned. */
export const ASK_KEEP_DAYS = 400;

export function readAskCountSettings(): AskCountSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(ASK_COUNT_SETTINGS_KEY) ?? "null") as Partial<Record<keyof AskCountSettings, unknown>> | null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_ASK_COUNT_SETTINGS };
    return {
      on: typeof raw.on === "boolean" ? raw.on : DEFAULT_ASK_COUNT_SETTINGS.on,
      showPanel: typeof raw.showPanel === "boolean" ? raw.showPanel : DEFAULT_ASK_COUNT_SETTINGS.showPanel,
    };
  } catch { return { ...DEFAULT_ASK_COUNT_SETTINGS }; }
}

export function writeAskCountSettings(settings: AskCountSettings): void {
  try { localStorage.setItem(ASK_COUNT_SETTINGS_KEY, JSON.stringify({ on: settings.on, showPanel: settings.showPanel })); } catch { /* storage blocked */ }
}

/** Ids already written this session: a re-render never even reaches the database. */
const noted = new Set<string>();
let pruned = false;

export async function pruneAskCounts(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ASK_KEEP_DAYS * 86_400_000);
  return db.askCounts.where("date").below(askDate(cutoff)).delete();
}

/** One ask, shown now. Off writes nothing. */
export async function noteAsk(ask: { area: AskArea; kind: AskKind; key: string }, now: Date = new Date()): Promise<void> {
  if (!readAskCountSettings().on || !ask.key) return;
  const date = askDate(now);
  const id = `${date}|${ask.area}|${ask.kind}|${ask.key}`;
  if (noted.has(id)) return;
  noted.add(id);
  try {
    if (!pruned) { pruned = true; await pruneAskCounts(now); }
    await db.transaction("rw", db.askCounts, async () => {
      if (await db.askCounts.get(id)) return;
      const row: AskCount = { id, date, area: ask.area, kind: ask.kind, key: ask.key, count: 1, firstAt: now.toISOString() };
      await db.askCounts.add(row);
    });
  } catch {
    noted.delete(id); // a later showing can try again; a failed count is never a failed screen
  }
}

export async function getAskSummary(now: Date = new Date()): Promise<{ settings: AskCountSettings; summary: AskSummary }> {
  await pruneAskCounts(now);
  return { settings: readAskCountSettings(), summary: summarizeAsks(await db.askCounts.toArray(), now) };
}

/** CLEAR: removes every count and returns them, so UNDO can put them back. */
export async function clearAskCounts(): Promise<AskCount[]> {
  return db.transaction("rw", db.askCounts, async () => {
    const rows = await db.askCounts.toArray();
    await db.askCounts.clear();
    noted.clear();
    return rows;
  });
}

export async function restoreAskCounts(rows: readonly AskCount[]): Promise<void> {
  await db.askCounts.bulkPut([...rows]);
}

/** Tests only: forget what this session has written. */
export function resetAskCountSession(): void { noted.clear(); pruned = false; }
