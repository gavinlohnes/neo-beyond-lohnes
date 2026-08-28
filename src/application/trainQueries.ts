/**
 * Leverage Implementation 001 (deterministic ordering hardening,
 * 2026-08-22): every timestamp sort in this file was audited against
 * application/queries.ts's byTimeThenSeq (the shared same-instant
 * tie-break). All were deliberately LEFT UNCHANGED: WorkoutSession
 * (domain/common/types.ts) and PerformedSet (domain/workout/types.ts)
 * carry no `seq` field — unlike StateCheckIn/Recommendation/DomainEvent,
 * which do — and adding one to either type would be a schema-adjacent
 * change outside this checkpoint's explicit scope (no schema changes,
 * no TRAIN progression redesign). getRecentSubstitutions's sort (below)
 * already has its own domain-correct tie-break (setNumber) for exactly
 * this collision case, which is arguably more meaningful here than an
 * arbitrary global insertion-order seq would be. See the Leverage
 * Implementation 001 completion report for the full disposition of
 * every audited site in this codebase.
 */
import { db } from "../persistence/db";
import { doesSessionAdvanceRotation, suggestNextTemplate } from "../engine/trainSuggestion";
import { evaluateProgression, type ProgressionSuggestion } from "../engine/progression";
import { getPrescription, WORKOUT_TEMPLATE_ORDER, WORKOUT_TEMPLATES } from "../domain/workout/types";
import type {
  ExercisePrescription,
  PerformedSet,
  SessionType,
  WorkoutSessionStatus,
  WorkoutTemplateId,
} from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";

/**
 * For resuming an in-progress session across refresh/reopen. Only one
 * session should ever be ACTIVE at a time in normal use, but sorted by
 * startedAt rather than relying on Dexie's .last() (which orders by
 * primary key, not time) for defense in depth if that invariant is ever
 * violated.
 */
export async function getActiveWorkoutSession(beyondDayId?: string): Promise<WorkoutSession | undefined> {
  const sessions = beyondDayId
    ? await db.workoutSessions.where("beyondDayId").equals(beyondDayId).toArray()
    : await db.workoutSessions.toArray();
  return sessions
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .at(-1);
}

/**
 * Workout selection (A/B/C) is Engine-suggested from the last
 * rotation-advancing session, across all history (not scoped to today) —
 * rotation "does not reset by calendar week" and persists across
 * BeyondDays.
 */
export async function suggestTemplateForNextWorkout(): Promise<WorkoutTemplateId> {
  const sessions = await db.workoutSessions.toArray();
  const advancing = sessions
    .filter((s) => doesSessionAdvanceRotation(s.sessionType as SessionType, s.status as WorkoutSessionStatus))
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));
  const last = advancing.at(-1);
  return suggestNextTemplate(last ? (last.templateId as WorkoutTemplateId) : null);
}

/**
 * Phase 6 (TRAIN redesign), item 2: purely for explaining WHY a template
 * is suggested — which prior session's rotation-advancing result the
 * current suggestion is actually based on, or null if nothing has ever
 * advanced yet (so the UI can say "first in rotation" instead of
 * inventing a false "after C"). Does not change
 * suggestTemplateForNextWorkout's own behavior, shape, or the extensive
 * existing test coverage asserting its bare WorkoutTemplateId return —
 * this is a separate, additive query reusing the same filter.
 */
export async function getLastAdvancingTemplate(): Promise<WorkoutTemplateId | null> {
  const sessions = await db.workoutSessions.toArray();
  const advancing = sessions
    .filter((s) => doesSessionAdvanceRotation(s.sessionType as SessionType, s.status as WorkoutSessionStatus))
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));
  const last = advancing.at(-1);
  return last ? (last.templateId as WorkoutTemplateId) : null;
}

/**
 * Priority 1 (fast exercise substitution): the most recent distinct
 * free-text substitutions actually used for this exerciseId across all
 * history, most recent first — lets the UI offer a one-tap re-select of
 * something the user has genuinely typed before instead of retyping it.
 * Reuses substitutedName exactly as already stored (PerformedSet); does
 * not invent any exercise-equivalence list or new substitution data.
 */
export async function getRecentSubstitutions(exerciseId: string, limit = 3): Promise<string[]> {
  const sets = (await db.performedSets.where("exerciseId").equals(exerciseId).toArray()) as unknown as PerformedSet[];
  // Tiebreak on setNumber when recordedAt collides (millisecond resolution,
  // same session logged in quick succession) — a higher setNumber within
  // the same burst is still the more recent action.
  const withSubs = sets
    .filter((s): s is PerformedSet & { substitutedName: string } => !!s.substitutedName)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.setNumber - a.setNumber);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of withSubs) {
    if (seen.has(s.substitutedName)) continue;
    seen.add(s.substitutedName);
    result.push(s.substitutedName);
    if (result.length >= limit) break;
  }
  return result;
}

export async function getPerformedSets(sessionId: string): Promise<PerformedSet[]> {
  const sets = await db.performedSets.where("sessionId").equals(sessionId).toArray();
  return sets as unknown as PerformedSet[];
}

export async function hasLoggedAnySet(sessionId: string): Promise<boolean> {
  const sets = await getPerformedSets(sessionId);
  return sets.length > 0;
}

/**
 * Advisory-only progression suggestion (Decision Register TRAIN, locked)
 * for one exercise within a specific (templateId, sessionType) context —
 * scoped this way because the same exercise can have a different
 * prescribed set count depending on which template it appears in (e.g.
 * Triceps Pressdown is 2 sets in A but 3 sets in C), so history from one
 * context should never be compared against another's requirements.
 * RECOVERY is excluded at the type level — it never generates strength
 * progression, per the Canonical Spec.
 */
export async function getProgressionSuggestion(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): Promise<ProgressionSuggestion> {
  const prescription = getPrescription(templateId, sessionType, exerciseId);
  if (!prescription) {
    return { recommendation: "NO_HISTORY", reason: "Unknown exercise for this template/variant." };
  }

  const sessions = (await db.workoutSessions.toArray())
    .filter((s) => s.templateId === templateId && s.sessionType === sessionType && s.status !== "ACTIVE")
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));

  for (let i = sessions.length - 1; i >= 0; i--) {
    const sets = (await getPerformedSets(sessions[i]!.id)).filter((s) => s.exerciseId === exerciseId);
    if (sets.length > 0) {
      return evaluateProgression(prescription, sets);
    }
  }
  return { recommendation: "NO_HISTORY", reason: "No prior performance recorded for this exercise in this context yet." };
}

/**
 * Intelligence Spine — I3 (second-producer generalization proof,
 * 2026-08-23). TRAIN-domain-owned current-state fetch: the progression
 * suggestion for every exercise in the static, already-locked STANDARD
 * catalog (WORKOUT_TEMPLATES) — unfiltered (INCREASE/HOLD/REDUCE/
 * NO_HISTORY all included; deciding which are advisory-worthy is
 * engine/advisory.ts's job, not this domain's). Mirrors
 * intentQueries.ts's getCurrentlyEligibleUnresolvedObligations: the
 * consuming Intelligence layer receives already-correct current-state
 * input from the domain that owns it, rather than re-deriving "which
 * session counts as current" itself — getProgressionSuggestion already
 * excludes ACTIVE (in-progress) sessions when picking the most recent
 * evidence, reused here unchanged.
 *
 * Deliberately scoped to STANDARD only for this first slice — REDUCED
 * reuses the same first-two exerciseIds per template with a different set
 * count, and would only produce near-duplicate signal for the same
 * exercise; a genuinely separate REDUCED-context sweep is a future
 * extension, not required to prove the architecture generalizes.
 *
 * TRAIN-003 (Performance Brief) addition: each entry now also carries the
 * templateId it was evaluated under — purely additive (existing consumer
 * advisoryQueries.ts destructures only {prescription, suggestion} and is
 * unaffected). The same exerciseId can appear under more than one
 * template (e.g. Triceps Pressdown in both A and C) with a different
 * prescription/history each time; without templateId a caller aggregating
 * these entries (e.g. TRAIN-003's own PROGRESSION disclosure) could not
 * tell those two contexts apart, which is exactly the "collapsing
 * progression contexts across templates" this codebase's own doctrine
 * forbids.
 */
export async function getCurrentProgressionSuggestions(): Promise<
  { templateId: WorkoutTemplateId; prescription: ExercisePrescription; suggestion: ProgressionSuggestion }[]
> {
  const results: { templateId: WorkoutTemplateId; prescription: ExercisePrescription; suggestion: ProgressionSuggestion }[] = [];
  for (const templateId of WORKOUT_TEMPLATE_ORDER) {
    for (const prescription of WORKOUT_TEMPLATES[templateId].exercises) {
      const suggestion = await getProgressionSuggestion(templateId, "STANDARD", prescription.exerciseId);
      results.push({ templateId, prescription, suggestion });
    }
  }
  return results;
}

export interface LastStrengthSessionSummary {
  templateId: WorkoutTemplateId;
  sessionType: "STANDARD" | "REDUCED";
  status: "COMPLETED" | "PARTIAL";
  workingSetCount: number;
  durationMinutes: number | null;
}

/**
 * TRAIN-003 (Performance Brief): the most recent strength session with a
 * genuinely known outcome — STANDARD/REDUCED only (RECOVERY carries no
 * strength-performance meaning and must not contaminate this summary),
 * and only COMPLETED/PARTIAL (an ACTIVE session isn't finished history
 * yet, and ABANDONED has no honest COMPLETED/PARTIAL state to report —
 * it is deliberately excluded here rather than reworded to look like
 * one; see getRecentStrengthSessions for where it's still shown, always
 * under its own real status). workingSetCount counts only non-skipped
 * sets, matching every other "sets logged" count in this codebase (e.g.
 * TrainScreen's own handleCompleteWorkout setsLogged). durationMinutes
 * is null whenever endedAt is missing rather than derived from "now" —
 * an ended session's duration is a fixed historical fact, not something
 * that should visibly grow the way an ACTIVE session's would.
 */
export async function getLastStrengthSession(): Promise<LastStrengthSessionSummary | null> {
  const sessions = (await db.workoutSessions.toArray())
    .filter(
      (
        s,
      ): s is WorkoutSession & { sessionType: "STANDARD" | "REDUCED"; status: "COMPLETED" | "PARTIAL" } =>
        (s.sessionType === "STANDARD" || s.sessionType === "REDUCED") &&
        (s.status === "COMPLETED" || s.status === "PARTIAL"),
    )
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));
  const last = sessions.at(-1);
  if (!last) return null;

  const sets = await getPerformedSets(last.id);
  const workingSetCount = sets.filter((s) => !s.skipped).length;
  const durationMinutes = last.endedAt
    ? Math.max(0, Math.round((new Date(last.endedAt).getTime() - new Date(last.startedAt).getTime()) / 60000))
    : null;

  return {
    templateId: last.templateId as WorkoutTemplateId,
    sessionType: last.sessionType,
    status: last.status,
    workingSetCount,
    durationMinutes,
  };
}

export interface RecentStrengthSessionEntry {
  id: string;
  templateId: WorkoutTemplateId;
  sessionType: "STANDARD" | "REDUCED";
  status: "COMPLETED" | "PARTIAL" | "ABANDONED";
}

/**
 * TRAIN-003 (Performance Brief): a small, factual recent strength-training
 * sequence — STANDARD/REDUCED only (RECOVERY excluded, same reasoning as
 * getLastStrengthSession), ACTIVE excluded (an in-progress session is not
 * completed history), most-recent-first. Unlike getLastStrengthSession,
 * ABANDONED sessions ARE included here — but always carry their real
 * status, never reworded to look like a completed one.
 */
export async function getRecentStrengthSessions(limit = 5): Promise<RecentStrengthSessionEntry[]> {
  const sessions = (await db.workoutSessions.toArray())
    .filter(
      (
        s,
      ): s is WorkoutSession & {
        sessionType: "STANDARD" | "REDUCED";
        status: "COMPLETED" | "PARTIAL" | "ABANDONED";
      } => (s.sessionType === "STANDARD" || s.sessionType === "REDUCED") && s.status !== "ACTIVE",
    )
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt));
  return sessions.slice(0, limit).map((s) => ({
    id: s.id,
    templateId: s.templateId as WorkoutTemplateId,
    sessionType: s.sessionType,
    status: s.status,
  }));
}

export interface LastSetInfo {
  weight: number;
  reps: number;
}

/**
 * Phase 6 (TRAIN redesign), item 4: the most recently performed
 * (non-skipped) values for this exercise in this exact (templateId,
 * sessionType) context — used only to pre-fill/suggest a NEW set's
 * inputs, never to write anything. Same "most recent matching session"
 * walk as getProgressionSuggestion, but returns the actual weight/reps
 * rather than an advisory recommendation — progression's lastWeight
 * alone doesn't carry reps, and pre-filling needs both.
 */
export async function getLastPerformedSetForExercise(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): Promise<LastSetInfo | undefined> {
  const sessions = (await db.workoutSessions.toArray())
    .filter((s) => s.templateId === templateId && s.sessionType === sessionType && s.status !== "ACTIVE")
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));

  for (let i = sessions.length - 1; i >= 0; i--) {
    const sets = (await getPerformedSets(sessions[i]!.id))
      .filter((s) => s.exerciseId === exerciseId && !s.skipped)
      .sort((a, b) => a.setNumber - b.setNumber);
    if (sets.length > 0) {
      const first = sets[0]!;
      return { weight: first.weight, reps: first.reps };
    }
  }
  return undefined;
}
