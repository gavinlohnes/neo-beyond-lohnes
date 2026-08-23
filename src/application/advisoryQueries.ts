import { composeAdvisoryNoteFromProgression, composeAdvisoryNotesFromObligations } from "../engine/advisory";
import { formatLocalDate } from "../engine/scheduledContext";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getCurrentProgressionSuggestions } from "./trainQueries";

/**
 * Intelligence Spine — I2 (controlled consumption proof, approved
 * 2026-08-22) / I3 (second-producer generalization proof, approved
 * 2026-08-23). The one shared application-layer consumption path: fetch
 * already-correct current-state data from each domain that owns it
 * (Intent & Commitment's getCurrentlyEligibleUnresolvedObligations; TRAIN's
 * getCurrentProgressionSuggestions), hand each unchanged to its own I1/I3
 * engine composer, concatenate the results. This function orchestrates/
 * translates only — it adds no judgment, threshold, or interpretation of
 * its own, and neither producer call knows the other exists. Concatenation
 * order (Obligations then Progression) is a fixed structural convention,
 * not a priority ranking — AdvisoryNote carries no field that could
 * encode one (see domain/intelligence/types.ts), and array position is
 * never read as significance by any consumer.
 *
 * Intent Lifecycle Integrity (2026-08-23, see docs/UX_DECISIONS.md):
 * Obligations source from getCurrentlyEligibleUnresolvedObligations, not
 * getUnresolvedObligations directly — advisory.ts itself carries no
 * archived-Mission special case (and must not); Mission-lifecycle
 * eligibility is Intent & Commitment's own already-correct current-state
 * truth by the time it reaches this composer. Matching principle for I3:
 * getCurrentProgressionSuggestions already excludes in-progress (ACTIVE)
 * sessions when resolving "current" evidence — advisory.ts carries no
 * session-status special case either.
 */
export async function getAdvisoryNotes(now: Date = new Date()): Promise<AdvisoryNote[]> {
  const obligations = await getCurrentlyEligibleUnresolvedObligations();
  const obligationNotes = composeAdvisoryNotesFromObligations(obligations, formatLocalDate(now));

  const progressionResults = await getCurrentProgressionSuggestions();
  const progressionNotes = progressionResults
    .map(({ prescription, suggestion }) => composeAdvisoryNoteFromProgression(prescription, suggestion))
    .filter((note): note is AdvisoryNote => note !== null);

  return [...obligationNotes, ...progressionNotes];
}
