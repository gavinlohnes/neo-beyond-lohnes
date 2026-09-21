import {
  composeAdvisoryNoteFromContinuity,
  composeAdvisoryNoteFromDayRolloverAmbiguity,
  composeAdvisoryNoteFromJournal,
  composeAdvisoryNoteFromPatternProposal,
  composeAdvisoryNoteFromProgression,
  composeAdvisoryNoteFromShiftProtection,
  composeAdvisoryNotesFromObligations,
} from "../engine/advisory";
import { deriveCapacity } from "../engine/capacity";
import { evaluateDayRolloverAmbiguity } from "../engine/dayRollover";
import { findRelevantReviewedEntries } from "../engine/journalRelevance";
import { formatLocalDate, deriveScheduledContext } from "../engine/scheduledContext";
import { evaluateShiftProtection } from "../engine/shiftProtection";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { getPatternProposal, resolvePriorDayContinuity } from "./continuityQueries";
import { getActiveMissions, getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getReviewedDecisionJournalEntries } from "./journalQueries";
import {
  getActiveDay,
  getDayRolloverAmbiguityInput,
  getLatestCheckIn,
  getMinimumDayStatus,
  getSchedulePattern,
} from "./queries";
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
 *
 * FOUNDATION-1B (2026-09-20): two more producers, appended last —
 * shiftProtection (engine/shiftProtection.ts, via
 * continuityQueries.ts's sibling current-state gathering) and continuity
 * (engine/continuity.ts's resolvePriorDayContinuity, via
 * application/continuityQueries.ts, which owns "what was the most recent
 * prior day's Recommendation" the same way intentQueries.ts owns current
 * Obligation eligibility). Both need the active day's own current state
 * (check-in-derived capacity, Minimum Day status, prior-day history) and
 * are simply absent — never fabricated — when there is no active day.
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

  // FOUNDATION-1B: both new producers need the active day's own current
  // state (check-in-derived capacity, Minimum Day status, prior-day
  // history) — neither exists without one, so both are simply absent
  // (never fabricated/defaulted) when there is no active day, same
  // "quiet by default" treatment every other producer already follows.
  const activeDay = await getActiveDay();
  let shiftProtectionNotes: AdvisoryNote[] = [];
  let continuityNotes: AdvisoryNote[] = [];
  let dayRolloverAmbiguityNotes: AdvisoryNote[] = [];
  if (activeDay) {
    const [checkIn, minimumDay, schedulePattern, continuityCandidate, rolloverAmbiguityInput] = await Promise.all([
      getLatestCheckIn(activeDay.id),
      getMinimumDayStatus(activeDay.id),
      getSchedulePattern(),
      resolvePriorDayContinuity(activeDay),
      getDayRolloverAmbiguityInput(activeDay.id),
    ]);
    const scheduledContext = deriveScheduledContext(now, schedulePattern);
    const concern = evaluateShiftProtection({
      phase: scheduledContext.phase,
      todayIsScheduledWorkDay: scheduledContext.todayIsScheduledWorkDay,
      capacity: checkIn ? deriveCapacity(checkIn).capacity : null,
      minimumDay: { hydrate: minimumDay.hydrate, protein: minimumDay.protein },
    });
    if (concern) shiftProtectionNotes = [composeAdvisoryNoteFromShiftProtection(concern)];

    if (continuityCandidate) {
      const note = composeAdvisoryNoteFromContinuity(
        continuityCandidate.recommendation.kind,
        continuityCandidate.recommendation.title,
        continuityCandidate.resolution,
      );
      if (note) continuityNotes = [note];
    }

    // DAY-ROLLOVER-001: real ambiguity, only when the active day was
    // itself created by an automatic rollover AND a PRIMARY sleep is
    // logged on it — see engine/dayRollover.ts's own doc comment.
    const rolloverAmbiguity = evaluateDayRolloverAmbiguity(rolloverAmbiguityInput);
    if (rolloverAmbiguity) dayRolloverAmbiguityNotes = [composeAdvisoryNoteFromDayRolloverAmbiguity(rolloverAmbiguity)];
  }

  const patternProposal = await getPatternProposal();
  const patternProposalNotes = patternProposal ? [composeAdvisoryNoteFromPatternProposal(patternProposal)] : [];

  return [
    ...obligationNotes,
    ...progressionNotes,
    ...journalNotes,
    ...shiftProtectionNotes,
    ...continuityNotes,
    ...patternProposalNotes,
    ...dayRolloverAmbiguityNotes,
  ];
}
