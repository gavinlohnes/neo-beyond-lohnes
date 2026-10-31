import { getObligation } from "../intentQueries";
import { db } from "../../persistence/db";
import { writeAtomically } from "../atomicWrite";
import { confirmProposal, type AlfredProposal } from "./alfredActions";
import { personalContextVersion, proposalContextVersion } from "./personalContext";

export interface ProposalContext { personalVersion: string; actionVersion: string; taskVersions: Record<string, string> }

/** Guard and canonical write share one local transaction; another tab cannot interleave edits. */
export function confirmContextProposal(proposal: AlfredProposal, expected: ProposalContext, includePersonal: boolean) {
  return writeAtomically(db.tables.map((table) => table.name), async () => {
    if (await personalContextVersion(includePersonal) !== expected.personalVersion || await proposalContextVersion() !== expected.actionVersion) {
      throw new Error("CONTEXT_CHANGED");
    }
    if (proposal.kind === "task_done" || proposal.kind === "task_new_date") {
      const current = await getObligation(proposal.task_id);
      if (!current || current.title !== proposal.title || expected.taskVersions[proposal.task_id] !== JSON.stringify(current)) throw new Error("CONTEXT_CHANGED");
    }
    return confirmProposal(proposal);
  });
}
