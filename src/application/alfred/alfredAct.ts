import { confirmContextProposal, type ProposalContext } from "./contextActions";
import { undoSavedLog, type AlfredProposal, type SavedLog } from "./alfredActions";
import { whyConfirm, type ProposalSource } from "./alfredTools";

/**
 * ALFRED-ACT-001 (Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo"). A clear command to
 * log one of the six low-risk kinds (water; one of his SAVED meals only, never a typed new food or Alfred's estimate,
 * which keep SAVE + REMEMBER MEAL; protein; weight near his last; a habit done; a set in the workout in progress) runs
 * at once through the SAME guarded confirm a card's SAVE uses, and shows UNDO for ACT_UNDO_MS. UNDO is the existing append-only void/undo of that record (CARD-UNDO-001). Everything else, and anything
 * ambiguous, stays a card he confirms. The rule, in order:
 *   1. the kind's registry `autonomy` is "immediate-undo" (every other kind: card);
 *   2. the whole message was understood (the free helper left nothing unknown);
 *   3. the card isn't repeated word for word in the same message (a double log is more likely a slip);
 *   4. the kind's own `clear` rule: no time given, an ordinary amount, his own numbers (never Alfred's estimate).
 */
export const ACT_UNDO_MS = 10_000;

/** The UNDO window on screen: open until `until`, or held open while he hovers or focuses it (`pausedLeft` ms left). */
export interface UndoWindow { until: number; pausedLeft?: number | undefined }
export const undoOpen = (w: UndoWindow | undefined, now = Date.now()) => !!w && (w.pausedLeft !== undefined || now <= w.until);
export const pauseWindow = (w: UndoWindow, now = Date.now()): UndoWindow => (w.pausedLeft !== undefined ? w : { until: w.until, pausedLeft: Math.max(0, w.until - now) });
export const resumeWindow = (w: UndoWindow, now = Date.now()): UndoWindow => (w.pausedLeft === undefined ? w : { until: now + w.pausedLeft });

type Card = { id: string; proposal: AlfredProposal };

/** Which of one message's cards may run at once (ids), by the rule above. Reads the records; never writes. */
export async function immediateCards(cards: Card[], source: ProposalSource, opts: { understoodAll: boolean }): Promise<Set<string>> {
  const out = new Set<string>();
  if (!opts.understoodAll) return out;
  const seen = new Map<string, number>();
  for (const c of cards) { const k = JSON.stringify(c.proposal); seen.set(k, (seen.get(k) ?? 0) + 1); }
  for (const c of cards) {
    if ((seen.get(JSON.stringify(c.proposal)) ?? 0) > 1) continue;
    if ((await whyConfirm(c.proposal, source)) === undefined) out.add(c.id);
  }
  return out;
}

/**
 * ALFRED-MULTI-001: one message may hold several records ("16 oz water, weighed 181, slept 7h, remind me to call mum").
 * Each is its own card from the registry, kept in the order he said them; the immediate ones run at once (above) and
 * each keeps its OWN UNDO, the rest wait for SAVE. At most MAX_AT_ONCE run at once from one message: more than that is
 * more likely a paste or a slip than a report, so none of them run at once and he is told; every card still waits for
 * SAVE, so nothing is dropped or guessed.
 */
export const MAX_AT_ONCE = 5;
export interface ActPlan { ids: Set<string>; overCap: boolean }
export async function planAct(cards: Card[], source: ProposalSource, opts: { understoodAll: boolean }): Promise<ActPlan> {
  const ids = await immediateCards(cards, source, opts);
  return ids.size > MAX_AT_ONCE ? { ids: new Set(), overCap: true } : { ids, overCap: false };
}
export const OVER_CAP_NOTE = `That's more than ${MAX_AT_ONCE} logs in one message, so BEYOND saved none of them at once. SAVE the ones you want.`;

export interface ActResult {
  /** Cards that ran, with their UNDO (absent when the command had nothing to take back) and its window. */
  done: Record<string, { undo?: SavedLog | undefined; window: UndoWindow }>;
  /** The context after his own writes, so the message's other cards and his next question stay valid. */
  context: ProposalContext;
  /** Set when one didn't run (the records changed, or the command refused): it and the rest stay cards. */
  stopped?: { id: string; error: unknown } | undefined;
}

/** Runs the immediate cards in order, each through confirmContextProposal (same transaction and guards as SAVE). */
export async function runImmediate(cards: Card[], ids: Set<string>, context: ProposalContext, includePersonal: boolean, now = () => Date.now()): Promise<ActResult> {
  const done: ActResult["done"] = {};
  let ctx = context;
  for (const c of cards) {
    if (!ids.has(c.id)) continue;
    try {
      const r = await confirmContextProposal(c.proposal, ctx, includePersonal);
      ctx = { ...ctx, personalVersion: r.personalVersion, ...(r.recordVersion ? { recordVersion: r.recordVersion } : {}) };
      done[c.id] = { undo: r.result.undo, window: { until: now() + ACT_UNDO_MS } };
    } catch (error) {
      return { done, context: ctx, stopped: { id: c.id, error } };
    }
  }
  return { done, context: ctx };
}

/**
 * ALFRED-MULTI-001: what each card that was meant to run at once but didn't is told, so a failure is never silent.
 * The one that stopped says why (nothing of it was saved); the ones after it say they are waiting for SAVE.
 */
export function heldNotes(cards: Card[], ids: Set<string>, acted: ActResult, describe: (error: unknown) => string): Record<string, string> {
  const notes: Record<string, string> = {};
  if (!acted.stopped) return notes;
  let after = false;
  for (const c of cards) {
    if (!ids.has(c.id)) continue;
    if (c.id === acted.stopped.id) {
      const e = acted.stopped.error;
      notes[c.id] = e instanceof Error && e.message === "CONTEXT_CHANGED" ? "Not logged: your records changed while BEYOND was saving. Nothing of it was saved. Ask again." : `Not logged: ${describe(e)}`;
      after = true;
    } else if (after) notes[c.id] = "Not logged yet, because the one before it didn't save. SAVE it if you still want it.";
  }
  return notes;
}

/** ALFRED-MULTI-001: the free helper's one line for a message, by what ran at once and what waits. */
export function helperSummary(total: number, ran: number, stopped: boolean, overCap: boolean): string {
  if (!total) return "Nothing to save yet.";
  if (ran && ran === total) return ran === 1 ? "Logged. UNDO within 10 seconds if that's wrong." : `Logged all ${ran}. UNDO any of them within 10 seconds.`;
  if (ran) return `Logged ${ran} at once (UNDO within 10 seconds). SAVE the others you want.${stopped ? " One didn't save; it says why below." : ""}`;
  if (overCap) return OVER_CAP_NOTE;
  if (stopped) return "One didn't save; it says why below. SAVE the ones you want.";
  return "Here's what I can do for free. SAVE the ones you want.";
}

/** UNDO from the window: refused once it has closed (the entry stays; change it from LOG or HISTORY). */
export async function undoAct(undo: SavedLog, window: UndoWindow, now = Date.now()): Promise<"UNDONE" | "EXPIRED" | "GONE"> {
  if (!undoOpen(window, now)) return "EXPIRED";
  return (await undoSavedLog(undo)) ? "UNDONE" : "GONE";
}
