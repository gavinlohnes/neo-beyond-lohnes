import { useEffect, useRef, useState } from "react";
import { ConfirmIcon, Icon } from "../../icons/Icon";
import { Emblem } from "../../icons/Emblem";
import { CommandSurface } from "../../components/CommandSurface";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import type { Capacity, WorkoutSession } from "../../../domain/common/types";
import type { ExercisePrescription, PerformedSet, SessionType, WorkoutTemplateId } from "../../../domain/workout/types";
import { WORKOUT_TEMPLATES, getReducedExercises } from "../../../domain/workout/types";
import { deriveCapacity } from "../../../engine/capacity";
import { suggestSessionVariant } from "../../../engine/trainSuggestion";
import type { ProgressionSuggestion } from "../../../engine/progression";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { getActiveDay, getLatestCheckIn } from "../../../application/queries";
import { ensureActiveDay, submitCheckIn } from "../../../application/commands";
import { quickCheckInValues } from "../today/TodayScreen";
import {
  getActiveWorkoutSession,
  getCurrentProgressionSuggestions,
  getLastAdvancingTemplate,
  getLastPerformedSetForExercise,
  getLastStrengthSession,
  getPerformedSets,
  getProgressionSuggestion,
  getRecentStrengthSessions,
  getRecentSubstitutions,
  suggestTemplateForNextWorkout,
  type LastSetInfo,
  type LastStrengthSessionSummary,
  type RecentStrengthSessionEntry,
} from "../../../application/trainQueries";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
} from "../../../application/trainCommands";
import {
  describeLastStrengthSession,
  describePartialAdvancement,
  describePartialAdvancementResult,
  describeProgressionAdvisory,
  describeProgressionSummary,
  describeRecentStrengthEntry,
  describeRecommendationLabel,
  describeRecoveryPreview,
  describeStopAction,
  describeStopConfirm,
  describeTemplateSuggestion,
  describeTemplateSummary,
  describeVariantSuggestion,
  RECENT_STRENGTH_EMPTY,
  summarizeProgressionSuggestions,
  VARIANT_MEANINGS,
} from "./trainCopy";

const TEMPLATE_ORDER: WorkoutTemplateId[] = ["A", "B", "C"];
const VARIANT_ORDER: SessionType[] = ["STANDARD", "REDUCED", "RECOVERY"];

function exercisesFor(templateId: WorkoutTemplateId, sessionType: SessionType) {
  if (sessionType === "RECOVERY") return [];
  return sessionType === "REDUCED"
    ? getReducedExercises(templateId)
    : WORKOUT_TEMPLATES[templateId].exercises;
}

interface SetInputState {
  weight: string;
  reps: string;
}

/**
 * Product Experience Sprint, P4 (workout completion state): captured at
 * the moment completeWorkout is called, from state that's about to be
 * cleared by refresh() — never recomputed later, so the summary always
 * reflects exactly what this session did, not whatever TRAIN shows next.
 */
interface CompletionSummary {
  status: "COMPLETED" | "PARTIAL";
  sessionType: SessionType;
  bodyAreas: string;
  exercisesTouched: number;
  totalExercises: number;
  setsLogged: number;
  setsSkipped: number;
  durationMinutes: number | null;
  nextTemplate: WorkoutTemplateId;
  advisoryChanges: { name: string; before: string; after: string }[];
}

export type TrainDestination = "RECOVERY" | "WORKOUT";

export function TrainScreen({
  destination,
  onDestinationConsumed,
}: {
  destination?: TrainDestination | null;
  onDestinationConsumed?: () => void;
} = {}) {
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [suggestedTemplate, setSuggestedTemplate] = useState<WorkoutTemplateId>("A");
  const [lastAdvancingTemplate, setLastAdvancingTemplate] = useState<WorkoutTemplateId | null>(null);
  const [chosenTemplate, setChosenTemplate] = useState<WorkoutTemplateId>("A");
  const [chosenVariant, setChosenVariant] = useState<SessionType>("STANDARD");
  const [noCheckIn, setNoCheckIn] = useState(false);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<PerformedSet[]>([]);
  const [busy, setBusy] = useState(false);
  const [recoveryMinutes, setRecoveryMinutes] = useState(10);
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, SetInputState>>({});
  const [progressionSuggestions, setProgressionSuggestions] = useState<Record<string, ProgressionSuggestion>>({});
  const [lastPerformedSets, setLastPerformedSets] = useState<Record<string, LastSetInfo>>({});
  const [recentSubstitutions, setRecentSubstitutions] = useState<Record<string, string[]>>({});
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  // FIELD-001 (Review Correction): Performance Brief is real, truthful,
  // read-only intelligence, but it is Inspect-tier depth relative to the
  // one pre-workout decision (which template/variant) — collapsed by
  // default, same CollapsibleRow primitive RESET/SHIFT DOWN already use
  // when they aren't the prominent tool, so it structurally recedes
  // instead of consuming full footprint before any decision is made.
  const [performanceBriefOpen, setPerformanceBriefOpen] = useState(false);
  // VISUAL-001 (Hybrid Foundation): the one earned-salience moment on
  // active TRAIN — which set was *just* logged this session, if any.
  // Starts null on every mount (including a resumed session), so a
  // reload never replays the flash on sets that were already logged
  // before this component existed — only a live LOG/SAME AS LAST TIME
  // tap during this session sets it.
  const [justLoggedKey, setJustLoggedKey] = useState<string | null>(null);
  // P4 (one-handed execution mode): which exercise is the focused
  // "current" one. null means "let the derived first-incomplete-exercise
  // logic decide" — set explicitly only when the lifter taps into a
  // different exercise out of order via the compact list below.
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const [destinationReady, setDestinationReady] = useState(false);
  // TRAIN-003 (Performance Brief): only ever loaded/shown pre-workout
  // (see refresh() below) — read-only derived intelligence, never
  // consulted by handleStart/actuallyStart or any other command path.
  const [lastStrengthSession, setLastStrengthSession] = useState<LastStrengthSessionSummary | null>(null);
  const [recentStrengthSessions, setRecentStrengthSessions] = useState<RecentStrengthSessionEntry[]>([]);
  const [currentProgressionSuggestions, setCurrentProgressionSuggestions] = useState<
    { templateId: WorkoutTemplateId; prescription: ExercisePrescription; suggestion: ProgressionSuggestion }[]
  >([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const recoveryChoiceRef = useRef<HTMLButtonElement>(null);
  const destinationConsumedRef = useRef(false);
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!destination || !destinationReady || destinationConsumedRef.current) return;
    destinationConsumedRef.current = true;
    onDestinationConsumed?.();
    requestAnimationFrame(() => {
      if (session || destination === "WORKOUT") headingRef.current?.focus();
      else recoveryChoiceRef.current?.focus();
    });
  }, [destination, destinationReady, session, onDestinationConsumed]);

  async function refresh() {
    // Template/variant suggestion don't require a day to already exist —
    // rotation history is global, and capacity naturally reads as "no
    // check-in yet" when there's no active day. Only an ACTIVE session
    // genuinely requires one (nothing to resume before any day exists).
    const activeDay = await getActiveDay();

    const checkIn = activeDay ? await getLatestCheckIn(activeDay.id) : undefined;
    const cap = checkIn ? deriveCapacity(checkIn).capacity : null;
    setCapacity(cap);

    const suggestion = suggestSessionVariant(cap);
    setNoCheckIn(suggestion.noCheckIn);

    const nextTemplate = await suggestTemplateForNextWorkout();
    setSuggestedTemplate(nextTemplate);
    setChosenTemplate(nextTemplate);
    setLastAdvancingTemplate(await getLastAdvancingTemplate());

    setShowStopConfirm(false);

    // CONTINUITY-001: resume the one canonical ACTIVE session even if an
    // older build already allowed its BeyondDay to end. New day closure
    // is now blocked while a workout is active, but this global lookup is
    // the recovery path for already-stranded local state. Every mutation
    // below already uses session.beyondDayId, so history stays on the
    // original day; nothing is migrated or rewritten.
    const active = (await getActiveWorkoutSession()) ?? null;
    setSession(active);
    setChosenVariant(
      !active && destination === "RECOVERY"
        ? "RECOVERY"
        : suggestion.variant === "RESET"
          ? "STANDARD"
          : suggestion.variant,
    );
    if (active) {
      setSets(await getPerformedSets(active.id));
      await loadExerciseAdvisory(active);
    } else {
      setSets([]);
      setProgressionSuggestions({});
      setLastPerformedSets({});
      setRecentSubstitutions({});
      setInputs({});
      // TRAIN-003 (Performance Brief): loaded only pre-workout — read-only
      // derived intelligence, never consulted by any command path above.
      setLastStrengthSession(await getLastStrengthSession());
      setRecentStrengthSessions(await getRecentStrengthSessions());
      setCurrentProgressionSuggestions(await getCurrentProgressionSuggestions());
    }

    setDestinationReady(true);
  }

  /**
   * Advisory only (Decision Register TRAIN, locked): loaded once per
   * session start/resume so the suggestion is visible before the user
   * logs anything, but never used to pre-fill or otherwise silently
   * change what the weight/rep inputs default to — pre-filling (item 4,
   * below) is a separate, explicit, always-editable display default, not
   * a submission.
   */
  async function loadExerciseAdvisory(activeSession: WorkoutSession) {
    if (activeSession.sessionType === "RECOVERY") {
      setProgressionSuggestions({});
      setLastPerformedSets({});
      setRecentSubstitutions({});
      return;
    }
    const templateId = activeSession.templateId as WorkoutTemplateId;
    const sessionType = activeSession.sessionType as "STANDARD" | "REDUCED";
    const exercises = exercisesFor(templateId, activeSession.sessionType as SessionType);
    const progressionEntries = await Promise.all(
      exercises.map(async (ex) => [ex.exerciseId, await getProgressionSuggestion(templateId, sessionType, ex.exerciseId)] as const),
    );
    setProgressionSuggestions(Object.fromEntries(progressionEntries));
    const lastSetEntries = await Promise.all(
      exercises.map(async (ex) => [ex.exerciseId, await getLastPerformedSetForExercise(templateId, sessionType, ex.exerciseId)] as const),
    );
    setLastPerformedSets(
      Object.fromEntries(lastSetEntries.filter((entry): entry is [string, LastSetInfo] => entry[1] !== undefined)),
    );
    const substitutionEntries = await Promise.all(
      exercises.map(async (ex) => [ex.exerciseId, await getRecentSubstitutions(ex.exerciseId)] as const),
    );
    setRecentSubstitutions(Object.fromEntries(substitutionEntries));
  }

  async function actuallyStart() {
    if (busy) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const started = await startWorkout(
        activeDay.id,
        chosenVariant === "RECOVERY" ? null : chosenTemplate,
        chosenVariant,
        { overrideConfirmed: true },
      );
      setSession(started);
      // startWorkout is deliberately idempotent across the whole app: a
      // repeated/stale START can return the canonical existing session.
      // Re-read its sets instead of assuming every successful return is
      // brand new, so that defensive resume path never blanks progress.
      setSets(await getPerformedSets(started.id));
      setFocusedExerciseId(null);
      setCompletionSummary(null);
      await loadExerciseAdvisory(started);
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (busy) return;
    if (chosenVariant === "STANDARD") {
      guard(capacity, () => actuallyStart());
    } else {
      await actuallyStart();
    }
  }

  async function handleQuickCheckIn() {
    if (busy) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, quickCheckInValues);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function inputKey(exerciseId: string, setNumber: number): string {
    return `${exerciseId}#${setNumber}`;
  }

  /**
   * Item 4/5: what a set's inputs should show by default — the previous
   * set of the SAME exercise already logged this session, else what was
   * logged last time this exercise was trained in this exact context,
   * else nothing (a true first-ever set genuinely has no basis to
   * suggest, so it stays empty rather than showing a 0 that could be
   * mistaken for an already-recorded value).
   */
  function suggestedInputFor(exerciseId: string, setNumber: number): LastSetInfo | undefined {
    const prevInSession = sets.find(
      (s) => s.exerciseId === exerciseId && s.setNumber === setNumber - 1 && !s.skipped,
    );
    if (prevInSession) return { weight: prevInSession.weight, reps: prevInSession.reps };
    return lastPerformedSets[exerciseId];
  }

  function getInputDisplay(exerciseId: string, setNumber: number): SetInputState {
    const key = inputKey(exerciseId, setNumber);
    if (inputs[key]) return inputs[key]!;
    const suggestion = suggestedInputFor(exerciseId, setNumber);
    return suggestion ? { weight: String(suggestion.weight), reps: String(suggestion.reps) } : { weight: "", reps: "" };
  }

  function patchInput(exerciseId: string, setNumber: number, patch: Partial<SetInputState>) {
    const key = inputKey(exerciseId, setNumber);
    const current = getInputDisplay(exerciseId, setNumber);
    setInputs((prev) => ({ ...prev, [key]: { ...current, ...patch } }));
  }

  function adjustWeight(exerciseId: string, setNumber: number, deltaLbs: number) {
    const current = getInputDisplay(exerciseId, setNumber);
    const next = Math.max(0, (Number(current.weight) || 0) + deltaLbs);
    patchInput(exerciseId, setNumber, { weight: String(next) });
  }

  function adjustReps(exerciseId: string, setNumber: number, delta: number) {
    const current = getInputDisplay(exerciseId, setNumber);
    const next = Math.max(0, (Number(current.reps) || 0) + delta);
    patchInput(exerciseId, setNumber, { reps: String(next) });
  }

  async function handleLogSet(exerciseId: string, setNumber: number) {
    if (busy || !session) return;
    const display = getInputDisplay(exerciseId, setNumber);
    const weight = Number(display.weight) || 0;
    const reps = Number(display.reps) || 0;
    setBusy(true);
    try {
      await logSet(session.beyondDayId, session.id, exerciseId, setNumber, weight, reps, subs[exerciseId] || undefined);
      setSets(await getPerformedSets(session.id));
      setJustLoggedKey(inputKey(exerciseId, setNumber));
    } finally {
      setBusy(false);
    }
  }

  /**
   * P4: exact repeat of a prior set in one tap — logs directly with the
   * suggested weight/reps rather than filling the input first and
   * requiring a separate LOG tap. Same logSet call handleLogSet makes;
   * this only skips the "fill, then submit" round trip when the values
   * are already known to be exactly what was suggested.
   */
  async function handleLogExactRepeat(exerciseId: string, setNumber: number, suggestion: LastSetInfo) {
    if (busy || !session) return;
    setBusy(true);
    try {
      await logSet(
        session.beyondDayId,
        session.id,
        exerciseId,
        setNumber,
        suggestion.weight,
        suggestion.reps,
        subs[exerciseId] || undefined,
      );
      setSets(await getPerformedSets(session.id));
      setJustLoggedKey(inputKey(exerciseId, setNumber));
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipSet(exerciseId: string, setNumber: number) {
    if (busy || !session) return;
    setBusy(true);
    try {
      await skipSet(session.beyondDayId, session.id, exerciseId, setNumber);
      setSets(await getPerformedSets(session.id));
    } finally {
      setBusy(false);
    }
  }

  /**
   * P4 (restrained completion state): captures the facts BEFORE refresh()
   * clears session/sets/progressionSuggestions — everything here is a real
   * fact about the session that just ended, nothing inferred or "learned."
   * durationMinutes comes from session.startedAt (known) and the current
   * time (now) — reliably available without needing a separate timer
   * feature, and is passed through to completeWorkout so it's actually
   * persisted on the WORKOUT_COMPLETED event, not just displayed once.
   * advisoryChanges re-queries getProgressionSuggestion AFTER completing —
   * once the session's status is no longer ACTIVE, its own just-logged
   * sets become visible to that query (trainQueries.ts filters out ACTIVE
   * sessions), so this genuinely reflects what changed, not a guess.
   */
  async function handleCompleteWorkout(status: "COMPLETED" | "PARTIAL") {
    if (busy || !session) return;
    setBusy(true);
    try {
      const sessionType = session.sessionType as SessionType;
      const templateId = session.templateId as WorkoutTemplateId;
      const startedAtMs = new Date(session.startedAt).getTime();
      const durationMinutes = Number.isFinite(startedAtMs)
        ? Math.max(0, Math.round((Date.now() - startedAtMs) / 60000))
        : null;
      const exercisesTouched = new Set(sets.filter((s) => !s.skipped).map((s) => s.exerciseId)).size;
      const setsLogged = sets.filter((s) => !s.skipped).length;
      const setsSkipped = sets.filter((s) => s.skipped).length;
      const bodyAreas = describeTemplateSummary(activeExercises).bodyAreas;
      const beforeSuggestions = progressionSuggestions;

      await completeWorkout(session.beyondDayId, session.id, sessionType, status, durationMinutes ?? undefined);

      const advisoryChanges: CompletionSummary["advisoryChanges"] = [];
      if (sessionType === "STANDARD" || sessionType === "REDUCED") {
        for (const ex of activeExercises) {
          const before = beforeSuggestions[ex.exerciseId];
          if (!before) continue;
          const after = await getProgressionSuggestion(templateId, sessionType, ex.exerciseId);
          if (before.recommendation !== after.recommendation) {
            advisoryChanges.push({
              name: ex.name,
              before: describeRecommendationLabel(before.recommendation),
              after: describeRecommendationLabel(after.recommendation),
            });
          }
        }
      }

      setCompletionSummary({
        status,
        sessionType,
        bodyAreas,
        exercisesTouched,
        totalExercises: activeExercises.length,
        setsLogged,
        setsSkipped,
        durationMinutes,
        nextTemplate: await suggestTemplateForNextWorkout(),
        advisoryChanges,
      });

      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Item 6: neutral wording, and only asks for confirmation when there's
   * something meaningful to lose — if nothing has been logged yet, the
   * workout effectively never started, so stopping is immediate.
   */
  function handleStopClick() {
    if (busy || !session) return;
    if (hasLoggedAnySet && !showStopConfirm) {
      setShowStopConfirm(true);
      return;
    }
    void actuallyStop();
  }

  async function actuallyStop() {
    if (busy || !session) return;
    setBusy(true);
    try {
      await abandonWorkout(session.beyondDayId, session.id, session.sessionType as SessionType);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteRecovery() {
    if (busy || !session) return;
    setBusy(true);
    try {
      await completeRecoverySession(session.beyondDayId, session.id, recoveryMinutes);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const hasLoggedAnySet = sets.length > 0;
  const activeExercises = session
    ? exercisesFor(session.templateId as WorkoutTemplateId, session.sessionType as SessionType)
    : [];
  const variantSuggestion = suggestSessionVariant(capacity);
  const suggestedExercises = exercisesFor(chosenTemplate, chosenVariant === "RECOVERY" ? "STANDARD" : chosenVariant);
  const suggestedSummary = describeTemplateSummary(suggestedExercises);
  // TRAIN-003 (Performance Brief): pure aggregation of already-fetched
  // state, recomputed on every render — no separate query/state needed.
  const progressionCounts = summarizeProgressionSuggestions(currentProgressionSuggestions);

  // P4 (one-handed execution mode): "current" is whichever exercise still
  // has an unlogged set, unless the lifter explicitly focused a different
  // one via the compact list. If every exercise is fully logged, "current"
  // stays on the last one so Exercise X of Y still reads sensibly while
  // COMPLETE/PARTIAL is the obvious next tap.
  function loggedSetNumbers(exerciseId: string): Set<number> {
    return new Set(sets.filter((s) => s.exerciseId === exerciseId).map((s) => s.setNumber));
  }
  function isExerciseComplete(ex: { exerciseId: string; sets: number }): boolean {
    const logged = loggedSetNumbers(ex.exerciseId);
    for (let n = 1; n <= ex.sets; n++) if (!logged.has(n)) return false;
    return true;
  }
  function nextUnloggedSetNumber(ex: { exerciseId: string; sets: number }): number | null {
    const logged = loggedSetNumbers(ex.exerciseId);
    for (let n = 1; n <= ex.sets; n++) if (!logged.has(n)) return n;
    return null;
  }
  const firstIncompleteExercise = activeExercises.find((ex) => !isExerciseComplete(ex));
  const currentExercise =
    (focusedExerciseId ? activeExercises.find((ex) => ex.exerciseId === focusedExerciseId) : undefined) ??
    firstIncompleteExercise ??
    activeExercises.at(-1) ??
    null;
  const currentExerciseIndex = currentExercise
    ? activeExercises.findIndex((ex) => ex.exerciseId === currentExercise.exerciseId)
    : -1;
  const currentSetNumber = currentExercise ? nextUnloggedSetNumber(currentExercise) : null;
  // VISUAL-001 review correction: only one exercise's set rows are ever
  // mounted at a time (currentExercise, above) — the jump rail unmounts
  // the previous exercise's rows entirely and remounts whichever one is
  // selected. A justLoggedKey belonging to an exercise the lifter has
  // since navigated away from would otherwise sit there until they
  // navigate back, at which point that exercise's logged row remounts
  // fresh and replays the one-shot flash for a set that wasn't actually
  // just logged. Clearing it the moment focus leaves its owning exercise
  // — not on a timer, and independent of whether the animation itself
  // got to finish — closes that path without touching the LOG/SAME AS
  // LAST TIME/SKIP/resume guarantees, which never depended on this.
  useEffect(() => {
    if (justLoggedKey && currentExercise && !justLoggedKey.startsWith(`${currentExercise.exerciseId}#`)) {
      setJustLoggedKey(null);
    }
  }, [currentExercise, justLoggedKey]);
  // Overdrive Phase 18 (TRAIN EXECUTION UX): COMPLETE reads as the
  // expected next action only once it actually is one — mid-session it
  // sits at the same visual weight as PARTIAL/STOP (still equally
  // reachable, just not falsely promoted) and only gets full btn-primary
  // emphasis once every exercise is genuinely done. No gating: COMPLETE
  // remains callable exactly as before at any point (Engine/PARTIAL
  // semantics untouched) — this changes only which className it renders
  // with.
  const allExercisesComplete = activeExercises.length > 0 && activeExercises.every((ex) => isExerciseComplete(ex));

  return (
    <div className="screen fade-in train-field">
      {/* FIELD ALPHA Phase 2: the identity zone is deliberately quiet, same
          principle TODAY applied (Suit Implementation 01B) for the same
          reason — freed territory belongs to whatever's actually being
          executed below, not to screen chrome. A real <h1> for correct
          heading structure.
          FIELD-001: wrapped in .field-header — the same locked pilot
          "train" glyph TRAIN's own nav tab already uses, plus the
          closing structural rule TODAY-006 established, so TRAIN opens
          on the same instrument header TODAY does. A stable, truthful
          tagline follows — TRAIN's identity is stable across sessions
          (unlike TODAY's own moment-to-moment Engine truth), so a fixed
          statement of what TRAIN is fits here without inventing data. */}
      <div className="field-header">
        <div className="field-header__identity">
          <Icon name="train" size={22} />
          <h1 ref={headingRef} tabIndex={-1} className="eyebrow">BEYOND // TRAIN</h1>
        </div>
        <span className="field-header__emblem">
          <Emblem size={18} />
        </span>
      </div>
      <div className="field-tagline">
        <h2 className="field-tagline__headline">Training without guesswork.</h2>
        <p className="field-tagline__sub">The plan adapts to capacity. Progress stays visible.</p>
      </div>

      <ConfirmPanel />

      {completionSummary && (
        <div className="fade-in" style={{ padding: "var(--space-6) 0", marginBottom: "var(--space-5)" }}>
          <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {completionSummary.status === "COMPLETED" ? (
              <ConfirmIcon size={20} />
            ) : (
              <span aria-hidden="true" className="diamond" />
            )}
            {completionSummary.status === "COMPLETED" ? "WORKOUT COMPLETE" : "WORKOUT SAVED — PARTIAL"}
          </h2>
          <p className="card-body" style={{ textTransform: "capitalize", marginBottom: 8 }}>
            {completionSummary.bodyAreas || "Workout"}
          </p>
          <p className="meta" style={{ marginBottom: 4 }}>
            {completionSummary.exercisesTouched} of {completionSummary.totalExercises} exercises · {completionSummary.setsLogged}{" "}
            {completionSummary.setsLogged === 1 ? "set" : "sets"} logged
            {completionSummary.setsSkipped > 0
              ? ` · ${completionSummary.setsSkipped} skipped`
              : ""}
            {completionSummary.durationMinutes !== null ? ` · ${completionSummary.durationMinutes} min` : ""}
          </p>
          {completionSummary.status === "PARTIAL" && (
            <p className="meta" style={{ marginBottom: 8 }}>
              {describePartialAdvancementResult(completionSummary.sessionType)}
            </p>
          )}
          <p className="meta" style={{ marginBottom: 8 }}>Next up: Template {completionSummary.nextTemplate}.</p>
          {completionSummary.advisoryChanges.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <p className="meta" style={{ marginBottom: 4 }}>Advisories that changed:</p>
              {completionSummary.advisoryChanges.map((c) => (
                <p key={c.name} className="card-body" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <ConfirmIcon size={20} />
                  {c.name}: {c.before} → {c.after}
                </p>
              ))}
            </div>
          )}
          <button className="btn-secondary" style={{ marginTop: 8, width: "auto", padding: "8px 16px" }} onClick={() => setCompletionSummary(null)}>
            DONE
          </button>
        </div>
      )}

      {/* FIELD-ARCH-001: was a plain .card plus an inline
          style={{ borderColor: "var(--warning)" }} override — the same
          "ad hoc card with a color hack" gap VISUAL-002 already found and
          fixed for the danger/red tier (.card--warning); .card--caution
          is that same fix for the warning/yellow tier this call site
          actually needs. Same visible color/box, a real semantic class. */}
      {!session && !completionSummary && noCheckIn && (
        <div className="card card--caution">
          <p className="eyebrow" style={{ color: "var(--warning)", marginBottom: 4 }}>NO CHECK-IN YET</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            There's no check-in yet today, so TRAIN has nothing real to base a suggestion on below.
          </p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleQuickCheckIn()}>
            QUICK CHECK-IN (ALL GOOD)
          </button>
        </div>
      )}

      {/* FIELD ALPHA Phase 2B: the pre-session picker IS the one decision
          on screen right now (what to train) — TRAIN's own PRIMARY
          DECISION moment before execution starts, same .command-surface
          role TODAY's dominant recommendation uses. The "why suggested"
          reasoning (variant/template rationale + what STANDARD/REDUCED/
          RECOVERY generically mean) moves behind disclosure — every
          template/variant chip and its short override hint stays directly
          visible, since that's the actual decision surface, not the
          explanation of it. */}
      {!session && !completionSummary && (
        <CommandSurface>
          <p className="tool-label" style={{ marginBottom: 4 }}>
            {noCheckIn ? "DEFAULT WORKOUT" : "SUGGESTED WORKOUT"}
          </p>
          <h2 className="command-title" style={{ textTransform: "capitalize" }}>
            {chosenVariant === "RECOVERY" ? "Recovery session" : suggestedSummary.bodyAreas || "Workout"}
          </h2>
          {chosenVariant !== "RECOVERY" && (
            <p className="meta" style={{ marginBottom: 12 }}>
              Template {chosenTemplate} · {suggestedSummary.exerciseNames.join(", ")}
            </p>
          )}

          <p className="meta" style={{ marginBottom: 6 }}>Template (override always available)</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {TEMPLATE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${chosenTemplate === t ? "chip--selected" : ""}`}
                style={{ flex: "none", padding: "8px 16px" }}
                aria-pressed={chosenTemplate === t}
                disabled={chosenVariant === "RECOVERY"}
                onClick={() => setChosenTemplate(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <p className="meta" style={{ marginBottom: 6 }}>Variant (override always available)</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {VARIANT_ORDER.map((v) => (
              <button
                key={v}
                ref={v === "RECOVERY" ? recoveryChoiceRef : undefined}
                type="button"
                className={`chip ${chosenVariant === v ? "chip--selected" : ""}`}
                style={{ flex: "none", padding: "8px 14px" }}
                aria-pressed={chosenVariant === v}
                onClick={() => setChosenVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>

          <details className="why" style={{ marginBottom: 12 }}>
            <summary>Why this suggestion</summary>
            <div style={{ marginTop: 8 }}>
              <p className="card-body" style={{ marginBottom: 6 }}>{describeVariantSuggestion(variantSuggestion)}</p>
              {chosenVariant !== "RECOVERY" && (
                <p className="card-body" style={{ marginBottom: 6 }}>
                  {describeTemplateSuggestion(suggestedTemplate, lastAdvancingTemplate)}
                </p>
              )}
              <p className="card-body">{VARIANT_MEANINGS}</p>
            </div>
          </details>

          <button
            className="btn-primary"
            style={{ fontSize: 18, padding: "18px var(--space-4)" }}
            disabled={busy}
            onClick={() => void handleStart()}
          >
            START WORKOUT
          </button>
        </CommandSurface>
      )}

      {/* TRAIN-003 (Performance Brief): read-only derived intelligence,
          subordinate to the CommandSurface picker above — deliberately
          NOT a second .command-surface (no dominant decision lives
          here, the picker above already claims that territory).
          Renders only pre-workout, matching exactly when refresh()
          loads its data (see refresh() above) — never shown, and never
          queried, while a session is ACTIVE.
          FIELD-001 (Review Correction): collapsed by default behind the
          same CollapsibleRow primitive RESET/SHIFT DOWN already use for
          their own non-prominent state — real Inspect-tier depth, not
          something that should consume full footprint before the one
          actual pre-workout decision is made. */}
      {!session && !completionSummary && !performanceBriefOpen && (
        <CollapsibleRow
          name="PERFORMANCE BRIEF"
          summary={describeLastStrengthSession(lastStrengthSession)}
          onOpen={() => setPerformanceBriefOpen(true)}
        />
      )}
      {!session && !completionSummary && performanceBriefOpen && (
        <>
          <p className="section-label">Performance Brief</p>
          <div className="equipment-row">
            <p className="tool-label" style={{ marginBottom: 4 }}>LAST</p>
            <p className="card-body" style={{ marginBottom: 12 }}>{describeLastStrengthSession(lastStrengthSession)}</p>

            <p className="tool-label" style={{ marginBottom: 4 }}>PROGRESSION</p>
            <p className="card-body" style={{ marginBottom: recentStrengthSessions.length > 0 || progressionCounts.total > 0 ? 8 : 0 }}>
              {describeProgressionSummary(progressionCounts)}
            </p>
            {progressionCounts.total > 0 && (
              <details className="why" style={{ marginBottom: 12 }}>
                <summary>Exercise detail</summary>
                <div style={{ marginTop: 8 }}>
                  {TEMPLATE_ORDER.map((templateId) => (
                    <div key={templateId} style={{ marginBottom: 8 }}>
                      <p className="meta" style={{ marginBottom: 2 }}>Template {templateId}</p>
                      {currentProgressionSuggestions
                        .filter((entry) => entry.templateId === templateId)
                        .map((entry) => (
                          <p key={entry.prescription.exerciseId} className="card-body" style={{ marginBottom: 2 }}>
                            {entry.prescription.name} — {describeRecommendationLabel(entry.suggestion.recommendation)}
                          </p>
                        ))}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <p className="tool-label" style={{ marginBottom: 4 }}>RECENT</p>
            {recentStrengthSessions.length === 0 ? (
              <p className="card-body">{RECENT_STRENGTH_EMPTY}</p>
            ) : (
              recentStrengthSessions.map((entry) => (
                <p key={entry.id} className="meta" style={{ marginBottom: 2 }}>
                  {describeRecentStrengthEntry(entry)}
                </p>
              ))
            )}
            <button
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => setPerformanceBriefOpen(false)}
            >
              COLLAPSE
            </button>
          </div>
        </>
      )}

      {session && session.sessionType === "RECOVERY" && !completionSummary && (
        <CommandSurface>
          <p className="tool-label" style={{ marginBottom: 4 }}>RECOVERY — IN PROGRESS</p>
          <h2 className="command-title" style={{ fontSize: 24, marginBottom: 8 }}>Light movement</h2>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Duration only — how it saves depends on how many minutes you enter.
          </p>
          {/* FIELD ALPHA Phase 2I (accessibility): this exact
              <label><span>label</span></label> + sibling <input> pattern
              (no htmlFor/id, no nesting) is shared verbatim with several
              BodyScreen.tsx fields and never actually associates the
              label with its input — a real axe finding this checkpoint's
              new coverage surfaced. Fixed here (TRAIN-only, in scope);
              BODY's identical instances are out of this checkpoint's
              scope and left untouched. htmlFor/id rather than nesting the
              input inside the label, so .field label's existing
              space-between layout (text above, input below) is
              unchanged. */}
          <div className="field">
            <label htmlFor="recovery-minutes"><span>Minutes</span></label>
            <input
              id="recovery-minutes"
              type="number"
              min={0}
              value={recoveryMinutes}
              onChange={(e) => setRecoveryMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="input"
            />
          </div>
          <p className="meta" style={{ marginBottom: 12 }}>{describeRecoveryPreview(recoveryMinutes)}</p>
          <button
            className="btn-primary"
            style={{ fontSize: 18, padding: "18px var(--space-4)" }}
            disabled={busy}
            onClick={() => void handleCompleteRecovery()}
          >
            END RECOVERY
          </button>
        </CommandSurface>
      )}

      {session && session.sessionType !== "RECOVERY" && !completionSummary && (
        <>
          {/* FIELD ALPHA Phase 2B: STATUS/PROTOCOL — compact instrumentation
              (reusing TODAY's .status-strip primitive, already documented
              as "not TODAY-specific... intended to propagate to other
              screens' own compact status lines"), not a card. Orients the
              operator without competing with the execution surface below. */}
          {(() => {
            const summary = describeTemplateSummary(activeExercises);
            return (
              <p className="status-strip" style={{ textTransform: "capitalize" }}>
                {summary.bodyAreas} — {session.sessionType} — in progress · Template {session.templateId} · Rest ~60-90s
              </p>
            );
          })()}

          <p className="section-label section-label--field">Exercise</p>

          {/* P4/Overdrive Phase 12, FIELD ALPHA Phase 2B: the focused
              exercise IS TRAIN's PRIMARY EXECUTION surface — the same
              .command-surface/.command-title territory TODAY's dominant
              recommendation uses, not a lighter left-bar-only treatment.
              Everything the lifter needs for the set they're on right
              now, and nothing else competing for attention. */}
          {currentExercise && (
            <CommandSurface key={currentExercise.exerciseId}>
              <p className="meta" style={{ marginBottom: 2 }}>
                Exercise {currentExerciseIndex + 1} of {activeExercises.length}
              </p>
              <h2 className="command-title" style={{ marginBottom: 4 }}>{currentExercise.name}</h2>
              <p className="meta-strong" style={{ marginBottom: 8 }}>
                {currentExercise.sets} sets x {currentExercise.repRangeLow}-{currentExercise.repRangeHigh} reps
                {currentSetNumber !== null ? ` · Set ${currentSetNumber} of ${currentExercise.sets}` : " · All sets logged"}
              </p>
              {/* FIELD ALPHA Phase 2F: previous performance is
                  machine/system-derived context, not prose directed at the
                  lifter — restrained mono (.meta) rather than .card-body. */}
              {lastPerformedSets[currentExercise.exerciseId] && (
                <p className="meta" style={{ marginBottom: 4 }}>
                  Last time: {lastPerformedSets[currentExercise.exerciseId]!.weight} lb x{" "}
                  {lastPerformedSets[currentExercise.exerciseId]!.reps}
                </p>
              )}
              {progressionSuggestions[currentExercise.exerciseId] &&
                describeProgressionAdvisory(progressionSuggestions[currentExercise.exerciseId]!) && (
                  <p className="card-body" style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>
                    {describeProgressionAdvisory(progressionSuggestions[currentExercise.exerciseId]!)}
                  </p>
                )}

              {!loggedSetNumbers(currentExercise.exerciseId).size && (
                <>
                  <input
                    type="text"
                    placeholder="Substitute exercise (optional)"
                    value={subs[currentExercise.exerciseId] ?? ""}
                    onChange={(e) => setSubs((prev) => ({ ...prev, [currentExercise.exerciseId]: e.target.value }))}
                    className="input"
                    style={{ marginBottom: 8 }}
                  />
                  {recentSubstitutions[currentExercise.exerciseId] &&
                    recentSubstitutions[currentExercise.exerciseId]!.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {recentSubstitutions[currentExercise.exerciseId]!.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="btn-secondary"
                            style={{ width: "auto", padding: "4px 10px", fontSize: 16 }}
                            onClick={() => setSubs((prev) => ({ ...prev, [currentExercise.exerciseId]: name }))}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                </>
              )}

              {Array.from({ length: currentExercise.sets }, (_, i) => i + 1).map((setNumber) => {
                const ex = currentExercise;
                const loggedSet = sets.find((s) => s.exerciseId === ex.exerciseId && s.setNumber === setNumber);
                const display = getInputDisplay(ex.exerciseId, setNumber);
                const suggestion = suggestedInputFor(ex.exerciseId, setNumber);
                if (loggedSet) {
                  // Overdrive Phase 15 (motion-language expansion): this
                  // <p> replaces the unlogged <div> above at the same key —
                  // a different element type at the same key is always a
                  // fresh DOM mount to React, so fade-in genuinely plays
                  // exactly once, right when the set is actually logged.
                  // ConfirmIcon only for a real logged set, never for
                  // SKIPPED — skip stays neutral, per the established
                  // "neutral wording, not fail" rule for skip/partial.
                  //
                  // VISUAL-001: the earned-salience flash (.set-earned) is
                  // additionally gated on this being the exact set this
                  // session just logged — a SKIP never earns it (matches
                  // ConfirmIcon's own skip exclusion above), and no set
                  // from a resumed session earns it either (justLoggedKey
                  // starts null on mount).
                  const isEarned = !loggedSet.skipped && justLoggedKey === inputKey(ex.exerciseId, setNumber);
                  return (
                    <p
                      key={setNumber}
                      className={`meta fade-in${isEarned ? " set-earned" : ""}`}
                      style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {!loggedSet.skipped && <ConfirmIcon size={20} />}
                      #{setNumber} — {loggedSet.skipped ? "SKIPPED" : `${loggedSet.weight} lb x ${loggedSet.reps}`}
                    </p>
                  );
                }
                // Overdrive Phase 18 (REAL-DEVICE ACCEPTANCE CORRECTION,
                // TRAIN EXECUTION UX + PHONE WIDTH): the old single-row
                // "# − [lb] + lb x − [reps] + " adjuster packed ~7 fixed-
                // width controls into one line — comfortably wider than a
                // real Android content width, forcing an unpredictable
                // wrap. Two stacked WEIGHT/REPS rows (flex-grown input
                // between fixed 44px −/+ buttons) fit any phone width
                // without wrapping, and read as plainly labeled fields
                // instead of a symbol-decoded strip. Same adjustWeight/
                // adjustReps/handleLogSet/handleSkipSet calls — no new
                // behavior, only clearer layout. FIELD ALPHA Phase 2:
                // LOG (and SAME AS LAST TIME) enlarged to match the
                // dominant-surface primary-action treatment — the single
                // most important control on the whole screen.
                return (
                  <div key={setNumber} style={{ marginBottom: 14 }}>
                    {/* P4: exact repeat in one tap — the primary, fastest path. */}
                    {suggestion && (
                      <button
                        className="btn-primary"
                        style={{ marginBottom: 8, fontSize: 18, padding: "18px var(--space-4)" }}
                        disabled={busy}
                        onClick={() => void handleLogExactRepeat(ex.exerciseId, setNumber, suggestion)}
                      >
                        SET {setNumber}: SAME AS LAST TIME — {suggestion.weight} lb x {suggestion.reps}
                      </button>
                    )}
                    {!suggestion && <p className="meta-strong" style={{ marginBottom: 6 }}>Set {setNumber}</p>}
                    {/* SUIT-002 (TRAIN INPUT VELOCITY): direct entry is the
                        primary interaction within each row — inputMode gives
                        the correct mobile keyboard (decimal for weight,
                        numeric for reps), the aria-label carries set number +
                        unit so a screen reader user gets all three required
                        facts from the field itself, and onFocus selects the
                        prefilled value so typing replaces it immediately
                        instead of appending after it. Larger font/weight
                        than the 44px −/+ steppers beside it makes direct
                        entry the visually obvious way in, not just the
                        technically-available one. No behavioral change to
                        adjustWeight/patchInput/handleLogSet — same calls,
                        same empty-string passthrough. */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span className="meta" style={{ width: 56, flexShrink: 0 }}>WEIGHT</span>
                      <button
                        className="btn-secondary"
                        style={{ width: 44, minWidth: 44, padding: 0, flexShrink: 0 }}
                        aria-label={`Decrease set ${setNumber} weight`}
                        onClick={() => adjustWeight(ex.exerciseId, setNumber, -ex.incrementLbs)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="lb"
                        aria-label={`Set ${setNumber} weight in pounds`}
                        value={display.weight}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => patchInput(ex.exerciseId, setNumber, { weight: e.target.value })}
                        className="input"
                        style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 700 }}
                      />
                      <button
                        className="btn-secondary"
                        style={{ width: 44, minWidth: 44, padding: 0, flexShrink: 0 }}
                        aria-label={`Increase set ${setNumber} weight`}
                        onClick={() => adjustWeight(ex.exerciseId, setNumber, ex.incrementLbs)}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span className="meta" style={{ width: 56, flexShrink: 0 }}>REPS</span>
                      <button
                        className="btn-secondary"
                        style={{ width: 44, minWidth: 44, padding: 0, flexShrink: 0 }}
                        aria-label={`Decrease set ${setNumber} repetitions`}
                        onClick={() => adjustReps(ex.exerciseId, setNumber, -1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        aria-label={`Set ${setNumber} repetitions`}
                        value={display.reps}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => patchInput(ex.exerciseId, setNumber, { reps: e.target.value })}
                        className="input"
                        style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 700 }}
                      />
                      <button
                        className="btn-secondary"
                        style={{ width: 44, minWidth: 44, padding: 0, flexShrink: 0 }}
                        aria-label={`Increase set ${setNumber} repetitions`}
                        onClick={() => adjustReps(ex.exerciseId, setNumber, 1)}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-primary"
                        style={{ flex: 1, fontSize: 18, padding: "18px var(--space-4)" }}
                        disabled={busy}
                        onClick={() => void handleLogSet(ex.exerciseId, setNumber)}
                      >
                        LOG
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1 }}
                        disabled={busy}
                        onClick={() => void handleSkipSet(ex.exerciseId, setNumber)}
                      >
                        SKIP
                      </button>
                    </div>
                  </div>
                );
              })}
            </CommandSurface>
          )}

          {/* FIELD-001 (Review Correction): jump rail + Finish share one
              .field-recede cut — the execution surface above is the one
              thing that owns the field; navigation and wrap-up are both
              real, frequently-needed capability (never hidden behind
              disclosure — this is a spatial cut, not reduced access),
              but neither should visually compete with the exercise
              actually in progress. One shared gap, not one per item,
              matches the exact grammar TODAY-006's own Support zone
              already established. */}
          <div className="field-recede">
          {/* Overdrive Phase 12, FIELD ALPHA Phase 2B (NEXT): compact
              horizontal jump rail — subordinate to the execution surface
              above, a shared top rule (.equipment-row) rather than a
              second bespoke inline border. Same tap-to-jump behavior
              (setFocusedExerciseId); includes the current exercise too
              (chip--selected) so the rail alone shows whole-session
              progress. Exercise names stay in the aria-label so the
              compact numeric/fraction display never loses the accessible
              name. */}
          {activeExercises.length > 1 && (
            <div className="equipment-row">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {activeExercises.map((ex, i) => {
                  const done = isExerciseComplete(ex);
                  const isCurrent = ex.exerciseId === currentExercise?.exerciseId;
                  const loggedCount = loggedSetNumbers(ex.exerciseId).size;
                  return (
                    <button
                      key={ex.exerciseId}
                      type="button"
                      className={`chip ${isCurrent ? "chip--selected" : ""}`}
                      style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
                      aria-pressed={isCurrent}
                      aria-label={`${ex.name} — ${loggedCount} of ${ex.sets} sets${done ? ", complete" : ""}`}
                      disabled={busy}
                      onClick={() => setFocusedExerciseId(ex.exerciseId)}
                    >
                      {done && <span aria-hidden="true" className="diamond" />}
                      <span aria-hidden="true">{i + 1}</span>
                      <span aria-hidden="true" className="meta" style={{ color: isCurrent ? "var(--text-1)" : undefined }}>
                        {loggedCount}/{ex.sets}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="section-label">Finish</p>

          <div className="equipment-row">
            <p className="meta" style={{ marginBottom: 8 }}>{describePartialAdvancement(session.sessionType as SessionType)}</p>
            {/* FIELD ALPHA Phase 2K (real-device density test, phone-width
                fix): .btn-primary/.btn-secondary both set width:100% —
                without flex:1 here, three such buttons each demand their
                own full container width. flex:1 alone still wasn't
                enough at 320-375px: flex items default to min-width:auto,
                which floors shrinking at the widest unbreakable word
                ("COULDN'T"), still forcing real overflow — minWidth:0
                lets a button's own text wrap onto a second line instead.
                Pre-existing gap (no browser test previously verified
                this), not a Phase 2 regression. */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={allExercisesComplete ? "btn-primary" : "btn-secondary"}
                style={{ flex: 1, minWidth: 0 }}
                disabled={busy}
                onClick={() => void handleCompleteWorkout("COMPLETED")}
              >
                COMPLETE
              </button>
              <button className="btn-secondary" style={{ flex: 1, minWidth: 0 }} disabled={busy} onClick={() => void handleCompleteWorkout("PARTIAL")}>
                PARTIAL
              </button>
              <button className="btn-secondary" style={{ flex: 1, minWidth: 0 }} disabled={busy} onClick={handleStopClick}>
                {describeStopAction(hasLoggedAnySet)}
              </button>
            </div>
            {showStopConfirm && (
              <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--border-strong)", borderRadius: "var(--radius)" }}>
                <p className="card-body" style={{ marginBottom: 12 }}>{describeStopConfirm(sets.length)}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1, minWidth: 0 }} disabled={busy} onClick={() => void actuallyStop()}>
                    STOP WORKOUT
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, minWidth: 0 }} onClick={() => setShowStopConfirm(false)}>
                    KEEP GOING
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
