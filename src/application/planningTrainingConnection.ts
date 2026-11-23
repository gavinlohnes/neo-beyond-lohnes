import { getProgrammeView, type SequenceProgrammeView } from "./trainingProgrammeQueries";
import { getTrainingProgramme } from "./trainingProgramme";

export type PlanningTrainingConnection =
  | {
      status: "READY";
      key: "A" | "B" | "C";
      templateId: string;
      name: string;
      why: string;
    }
  | {
      status: "REVIEW_REQUIRED" | "UNKNOWN";
      why: string;
    };

/**
 * Read-only bridge from TRAIN's authoritative sequence projection into planning views.
 * Dates never select or advance a member; every eligible opportunity sees the same projection.
 */
export function projectPlanningTrainingConnection(sequence: SequenceProgrammeView | null): PlanningTrainingConnection | null {
  if (!sequence) return null;
  if (sequence.status === "READY" && sequence.nextMember) return {
    status: "READY",
    key: sequence.nextMember.key,
    templateId: sequence.nextMember.templateId,
    name: sequence.nextMember.name,
    why: sequence.why,
  };
  return { status: sequence.status === "READY" ? "UNKNOWN" : sequence.status, why: sequence.why };
}

export async function getPlanningTrainingConnection(now = new Date()): Promise<PlanningTrainingConnection | null> {
  try {
    const current = await getTrainingProgramme();
    if (current.programme?.mode !== "SEQUENCE") return null;
    return projectPlanningTrainingConnection((await getProgrammeView(now)).sequence);
  } catch {
    return { status: "UNKNOWN", why: "Programme evidence could not be read. Nothing was inferred or changed." };
  }
}
