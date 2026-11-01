import { getObligation } from "../intentQueries";
import { db } from "../../persistence/db";
import { writeAtomically } from "../atomicWrite";
import { confirmProposal, type AlfredProposal } from "./alfredActions";
import { personalContextVersion, proposalContextVersion } from "./personalContext";

export interface ProposalContext { personalVersion: string; actionVersion: string; taskVersions: Record<string, string>; routineVersions?: Record<string, string> }

/**
 * Guard and canonical write share one local transaction; another tab cannot interleave edits.
 * Also returns the personal-context version just after the write, read in that same transaction,
 * so the operator's own confirmed card (e.g. "remember") advances the conversation's context
 * instead of looking like an outside change. Outside changes still fail the guard first.
 */
export function confirmContextProposal(proposal: AlfredProposal, expected: ProposalContext, includePersonal: boolean) {
  return writeAtomically(db.tables.map((table) => table.name), async () => {
    if (await personalContextVersion(includePersonal) !== expected.personalVersion || await proposalContextVersion() !== expected.actionVersion) {
      throw new Error("CONTEXT_CHANGED");
    }
    if (proposal.kind === "task_done" || proposal.kind === "task_new_date" || proposal.kind === "task_plan") {
      const current = await getObligation(proposal.task_id);
      if (!current || current.title !== proposal.title || expected.taskVersions[proposal.task_id] !== JSON.stringify(current)) throw new Error("CONTEXT_CHANGED");
    }
    // ROUTINES-001 (review of #357, L3): an edit card applies only to the routine it was proposed for.
    // FREE-HELPER-001 (review of #366): a tick applies only to the active routine it was read from.
    if (proposal.kind === "routine_edit" || proposal.kind === "routine_tick") {
      const current = await db.routines.get(proposal.routine_id);
      if (!current || expected.routineVersions?.[proposal.routine_id] !== current.updatedAt) throw new Error("CONTEXT_CHANGED");
      if (proposal.kind === "routine_tick" && (current.status !== "ACTIVE" || !current.steps.some((s) => s.id === proposal.step_id))) throw new Error("CONTEXT_CHANGED");
    }
    const result = await confirmProposal(proposal);
    return { result, personalVersion: await personalContextVersion(includePersonal) };
  });
}
