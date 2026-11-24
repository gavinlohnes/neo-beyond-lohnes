import { db } from "../../persistence/db";
import { writeAtomically } from "../atomicWrite";
import { confirmProposal, type AlfredProposal } from "./alfredActions";
import { guardKind } from "./alfredTools";
import { operatorContextVersion } from "../operatorContext";
import { personalContextVersion, proposalContextVersion } from "./personalContext";

export interface ProposalContext { personalVersion: string; actionVersion: string; taskVersions: Record<string, string>; routineVersions?: Record<string, string>; recordVersion?: string }

/**
 * Guard and canonical write share one local transaction; another tab cannot interleave edits.
 * Also returns the personal-context version just after the write, read in that same transaction,
 * so the operator's own confirmed card (e.g. "remember") advances the conversation's context
 * instead of looking like an outside change. Outside changes still fail the guard first.
 */
export function confirmContextProposal(proposal: AlfredProposal, expected: ProposalContext, includePersonal: boolean) {
  return writeAtomically(db.tables.map((table) => table.name), async () => {
    if (expected.recordVersion !== undefined && await operatorContextVersion(includePersonal) !== expected.recordVersion) throw new Error("CONTEXT_CHANGED");
    if (await personalContextVersion(includePersonal) !== expected.personalVersion || await proposalContextVersion() !== expected.actionVersion) {
      throw new Error("CONTEXT_CHANGED");
    }
    // ALFRED-TOOLS-001: each kind's own guard (a task card applies only to that task as read; a routine edit or tick
    // only to that routine; a removal only to the log it named), from its registry entry.
    await guardKind(proposal, expected);
    const result = await confirmProposal(proposal);
    return { result, personalVersion: await personalContextVersion(includePersonal), ...(expected.recordVersion !== undefined ? { recordVersion: await operatorContextVersion(includePersonal) } : {}) };
  });
}

/**
 * GRAYSON-DICTATE-001: confirms cards one after another, in order, on one context read and advanced by each of his own
 * saves (so an outside change since the read is still refused). Stops at the first failure: `saved` is how many went
 * in (the first `saved` cards), `context` is the advanced context to retry the rest with, and `error` is the failure
 * as thrown (a `CONTEXT_CHANGED` refusal comes through as that Error). Used by Drive Home and the "I heard" preview.
 */
export async function confirmProposals<C extends ProposalContext>(
  cards: readonly AlfredProposal[], context: C, includePersonal = false,
): Promise<{ saved: number; context: C; error: unknown }> {
  let ctx = context, saved = 0;
  try {
    for (const card of cards) {
      const done = await confirmContextProposal(card, ctx, includePersonal);
      ctx = { ...ctx, personalVersion: done.personalVersion, ...(done.recordVersion ? { recordVersion: done.recordVersion } : {}) };
      saved++;
    }
    return { saved, context: ctx, error: null };
  } catch (error) {
    return { saved, context: ctx, error };
  }
}
