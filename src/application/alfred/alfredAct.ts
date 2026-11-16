import { confirmContextProposal, type ProposalContext } from "./contextActions";
import { undoSavedLog, type AlfredProposal, type SavedLog } from "./alfredActions";
import { whyConfirm, type ProposalSource } from "./alfredTools";

/**
 * ALFRED-ACT-001 (Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo"). A clear command to
 * log one of the low-risk kinds (water, a saved or fully-stated meal, protein, weight near his last, a habit done, a set
 * in the workout in progress) runs at once through the SAME guarded confirm a card's SAVE uses, and shows UNDO for
 * ACT_UNDO_MS. UNDO is the existing append-only void/undo of that record (CARD-UNDO-001). Everything else, and anything
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

/** UNDO from the window: refused once it has closed (the entry stays; change it from LOG or HISTORY). */
export async function undoAct(undo: SavedLog, window: UndoWindow, now = Date.now()): Promise<"UNDONE" | "EXPIRED" | "GONE"> {
  if (!undoOpen(window, now)) return "EXPIRED";
  return (await undoSavedLog(undo)) ? "UNDONE" : "GONE";
}
