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
