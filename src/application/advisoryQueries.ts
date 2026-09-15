import {
  composeAdvisoryNoteFromJournal,
  composeAdvisoryNoteFromProgression,
  composeAdvisoryNotesFromObligations,
} from "../engine/advisory";
import { findRelevantReviewedEntries } from "../engine/journalRelevance";
import { formatLocalDate } from "../engine/scheduledContext";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { getActiveMissions, getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getReviewedDecisionJournalEntries } from "./journalQueries";
import { getCurrentProgressionSuggestions } from "./trainQueries";

/**
 * Intelligence Spine — I2 (controlled consumption proof, approved
 * 2026-08-22) / I3 (second-producer generalization proof, approved
 * 2026-08-23) / JOURNAL-001 (third producer, direct owner sign-off,
 * 2026-09-15). The one shared application-layer consumption path: fetch
 * already-correct current-state data from each domain that owns it
 * (Intent & Commitment's getCurrentlyEligibleUnresolvedObligations; TRAIN's
 * getCurrentProgressionSuggestions; the Decision Journal's own
 * getReviewedDecisionJournalEntries), hand each unchanged to its own
 * engine composer/relevance function, concatenate the results. This
 * function orchestrates/translates only — it adds no judgment, threshold,
 * or interpretation of its own, and no producer call knows another
 * exists. Concatenation order (Obligations, then Progression, then
 * Decision Journal) is a fixed structural convention, not a priority
 * ranking — AdvisoryNote carries no field that could encode one (see
 * domain/intelligence/types.ts), and array position is never read as
 * significance by any consumer.
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
 *
 * JOURNAL-001 (2026-09-15): query terms for the relevance match were
 * originally built from only the same Obligations array already fetched
 * above for the first producer, to keep that Drop's diff minimal. The
 * "same Mission" half of JOURNAL-001's originally proposed matching
 * signal turned out to have no backing field on DecisionJournalEntry
 * (checked directly against domain/journal/types.ts — there is no
 * missionId), so only the keyword/text-overlap half shipped.
 *
 * JOURNAL-002 (2026-09-15): widens the query-term pool to also include
 * active Missions' titles (getActiveMissions — same eligibility filter
 * already applied to Obligations, so this stays "current situation,"
 * never a historical/archived one) — real, present text that was going
 * unread for this purpose, addressing the reported gap that
 * Obligation-title overlap alone caused a reviewed Lesson to surface too
 * rarely to be useful. Still purely a source of matching text handed
 * unchanged to the same engine relevance function; no new judgment, no
 * Engine influence, no persisted linkage. Concatenation order below is
 * unaffected — Missions/Obligations combine into one flat term list
 * before reaching findRelevantReviewedEntries, not a second producer.
 */
export async function getAdvisoryNotes(now: Date = new Date()): Promise<AdvisoryNote[]> {
  const obligations = await getCurrentlyEligibleUnresolvedObligations();
  const obligationNotes = composeAdvisoryNotesFromObligations(obligations, formatLocalDate(now));

  const progressionResults = await getCurrentProgressionSuggestions();
  const progressionNotes = progressionResults
    .map(({ prescription, suggestion }) => composeAdvisoryNoteFromProgression(prescription, suggestion))
    .filter((note): note is AdvisoryNote => note !== null);

  const activeMissions = await getActiveMissions();
  const reviewedEntries = await getReviewedDecisionJournalEntries();
  const relevantEntries = findRelevantReviewedEntries(reviewedEntries, [
    ...obligations.map((obligation) => obligation.title),
    ...activeMissions.map((mission) => mission.title),
  ]);
  const journalNotes = relevantEntries
    .map((entry) => composeAdvisoryNoteFromJournal(entry))
    .filter((note): note is AdvisoryNote => note !== null);

  return [...obligationNotes, ...progressionNotes, ...journalNotes];
}
