import { useEffect, useState } from "react";
import type { Capacity, WorkoutSession } from "../../../domain/common/types";
import type { PerformedSet, SessionType, WorkoutTemplateId } from "../../../domain/workout/types";
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
  getLastAdvancingTemplate,
  getLastPerformedSetForExercise,
  getPerformedSets,
  getProgressionSuggestion,
  getRecentSubstitutions,
  suggestTemplateForNextWorkout,
  type LastSetInfo,
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
  describePartialAdvancement,
  describeProgressionAdvisory,
  describeRecoveryPreview,
  describeStopAction,
  describeStopConfirm,
  describeTemplateSuggestion,
  describeTemplateSummary,
  describeVariantSuggestion,
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

export function TrainScreen() {
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
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  useEffect(() => {
    void refresh();
  }, []);

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
    setChosenVariant(suggestion.variant === "RESET" ? "STANDARD" : suggestion.variant);
    setNoCheckIn(suggestion.noCheckIn);

    const nextTemplate = await suggestTemplateForNextWorkout();
    setSuggestedTemplate(nextTemplate);
    setChosenTemplate(nextTemplate);
    setLastAdvancingTemplate(await getLastAdvancingTemplate());

    setShowStopConfirm(false);

    const active = activeDay ? ((await getActiveWorkoutSession(activeDay.id)) ?? null) : null;
    setSession(active);
    if (active) {
      setSets(await getPerformedSets(active.id));
      await loadExerciseAdvisory(active);
    } else {
      setSets([]);
      setProgressionSuggestions({});
      setLastPerformedSets({});
      setRecentSubstitutions({});
      setInputs({});
    }
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
      setSets([]);
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

  /** Item 5: explicit repeat-last control — re-applies the suggestion even if the user had already changed the field. */
  function handleRepeatLast(exerciseId: string, setNumber: number) {
    const suggestion = suggestedInputFor(exerciseId, setNumber);
    if (!suggestion) return;
    const key = inputKey(exerciseId, setNumber);
    setInputs((prev) => ({ ...prev, [key]: { weight: String(suggestion.weight), reps: String(suggestion.reps) } }));
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

  async function handleCompleteWorkout(status: "COMPLETED" | "PARTIAL") {
    if (busy || !session) return;
    setBusy(true);
    try {
      await completeWorkout(session.beyondDayId, session.id, session.sessionType as SessionType, status);
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

  return (
    <div className="screen">
      <p className="eyebrow">BEYOND // TRAIN</p>
      <h1 className="title">Train</h1>

      <ConfirmPanel />

      {!session && noCheckIn && (
        <div className="card" style={{ borderColor: "var(--warning)" }}>
          <p className="eyebrow" style={{ color: "var(--warning)", marginBottom: 4 }}>NO CHECK-IN YET</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            There's no check-in yet today, so TRAIN has nothing real to base a suggestion on below.
          </p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleQuickCheckIn()}>
            QUICK CHECK-IN (ALL GOOD)
          </button>
        </div>
      )}

      {!session && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            {noCheckIn ? "DEFAULT WORKOUT" : "SUGGESTED WORKOUT"}
          </p>
          <h2 className="card-title" style={{ textTransform: "capitalize" }}>
            {chosenVariant === "RECOVERY" ? "Recovery session" : suggestedSummary.bodyAreas || "Workout"}
          </h2>
          {chosenVariant !== "RECOVERY" && (
            <p className="meta" style={{ marginBottom: 8 }}>
              Template {chosenTemplate} · {suggestedSummary.exerciseNames.join(", ")}
            </p>
          )}
          <p className="card-body" style={{ marginBottom: 6 }}>{describeVariantSuggestion(variantSuggestion)}</p>
          {chosenVariant !== "RECOVERY" && (
            <p className="card-body" style={{ marginBottom: 12 }}>
              {describeTemplateSuggestion(suggestedTemplate, lastAdvancingTemplate)}
            </p>
          )}

          <p className="meta" style={{ marginBottom: 6 }}>Template (override always available)</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {TEMPLATE_ORDER.map((t) => (
              <button
                key={t}
                className="btn-primary"
                style={{
                  background: chosenTemplate === t ? "var(--accent)" : "var(--surface-2)",
                  width: "auto",
                  padding: "8px 16px",
                }}
                disabled={chosenVariant === "RECOVERY"}
                onClick={() => setChosenTemplate(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <p className="meta" style={{ marginBottom: 6 }}>Variant (override always available)</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {VARIANT_ORDER.map((v) => (
              <button
                key={v}
                className="btn-primary"
                style={{
                  background: chosenVariant === v ? "var(--accent)" : "var(--surface-2)",
                  width: "auto",
                  padding: "8px 14px",
                  fontSize: 16,
                }}
                onClick={() => setChosenVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>

          <button className="btn-primary" disabled={busy} onClick={() => void handleStart()}>
            START WORKOUT
          </button>
        </div>
      )}

      {session && session.sessionType === "RECOVERY" && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>RECOVERY — IN PROGRESS</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Duration only — how it saves depends on how many minutes you enter.
          </p>
          <div className="field">
            <label><span>Minutes</span></label>
            <input
              type="number"
              min={0}
              value={recoveryMinutes}
              onChange={(e) => setRecoveryMinutes(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
                color: "var(--text-1)",
                padding: "10px 12px",
                fontSize: 16,
              }}
            />
          </div>
          <p className="meta" style={{ marginBottom: 12 }}>{describeRecoveryPreview(recoveryMinutes)}</p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleCompleteRecovery()}>
            END RECOVERY
          </button>
        </div>
      )}

      {session && session.sessionType !== "RECOVERY" && (
        <div className="card card--action">
          {(() => {
            const summary = describeTemplateSummary(activeExercises);
            return (
              <>
                <p className="eyebrow" style={{ marginBottom: 4, textTransform: "capitalize" }}>
                  {summary.bodyAreas} — {session.sessionType} — IN PROGRESS
                </p>
                <p className="meta" style={{ marginBottom: 12 }}>
                  Template {session.templateId} · Rest ~60-90s between sets.
                </p>
              </>
            );
          })()}

          {activeExercises.map((ex) => (
            <div
              key={ex.exerciseId}
              style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginTop: 12 }}
            >
              <p className="card-title" style={{ marginBottom: 2 }}>{ex.name}</p>
              <p className="meta" style={{ marginBottom: 8 }}>
                {ex.sets} sets x {ex.repRangeLow}-{ex.repRangeHigh} reps
              </p>
              {lastPerformedSets[ex.exerciseId] && (
                <p className="card-body" style={{ marginBottom: 4 }}>
                  Last time: {lastPerformedSets[ex.exerciseId]!.weight} lb x {lastPerformedSets[ex.exerciseId]!.reps}
                </p>
              )}
              {progressionSuggestions[ex.exerciseId] && describeProgressionAdvisory(progressionSuggestions[ex.exerciseId]!) && (
                <p className="card-body" style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>
                  {describeProgressionAdvisory(progressionSuggestions[ex.exerciseId]!)}
                </p>
              )}
              <input
                type="text"
                placeholder="Substitute exercise (optional)"
                value={subs[ex.exerciseId] ?? ""}
                onChange={(e) => setSubs((prev) => ({ ...prev, [ex.exerciseId]: e.target.value }))}
                disabled={hasLoggedAnySet}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-1)",
                  padding: "8px 10px",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              />
              {!hasLoggedAnySet && recentSubstitutions[ex.exerciseId] && recentSubstitutions[ex.exerciseId]!.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {recentSubstitutions[ex.exerciseId]!.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="btn-primary"
                      style={{ width: "auto", padding: "4px 10px", fontSize: 16, background: "var(--surface-2)" }}
                      onClick={() => setSubs((prev) => ({ ...prev, [ex.exerciseId]: name }))}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNumber) => {
                const loggedSet = sets.find((s) => s.exerciseId === ex.exerciseId && s.setNumber === setNumber);
                const display = getInputDisplay(ex.exerciseId, setNumber);
                const hasSuggestion = suggestedInputFor(ex.exerciseId, setNumber) !== undefined;
                return (
                  <div key={setNumber} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="meta" style={{ width: 24 }}>#{setNumber}</span>
                    {loggedSet ? (
                      <span className="meta">
                        {loggedSet.skipped ? "SKIPPED" : `${loggedSet.weight} lb x ${loggedSet.reps}`}
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => adjustWeight(ex.exerciseId, setNumber, -ex.incrementLbs)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          placeholder="lb"
                          value={display.weight}
                          onChange={(e) => patchInput(ex.exerciseId, setNumber, { weight: e.target.value })}
                          style={{ width: 60, padding: "4px 6px", background: "var(--surface-2)", color: "var(--text-1)" }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => adjustWeight(ex.exerciseId, setNumber, ex.incrementLbs)}
                        >
                          +
                        </button>
                        <span className="meta">lb x</span>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => adjustReps(ex.exerciseId, setNumber, -1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          placeholder="reps"
                          value={display.reps}
                          onChange={(e) => patchInput(ex.exerciseId, setNumber, { reps: e.target.value })}
                          style={{ width: 44, padding: "4px 6px", background: "var(--surface-2)", color: "var(--text-1)" }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => adjustReps(ex.exerciseId, setNumber, 1)}
                        >
                          +
                        </button>
                        {hasSuggestion && (
                          <button
                            className="btn-primary"
                            style={{ width: "auto", padding: "4px 10px", fontSize: 16, background: "var(--surface-2)" }}
                            onClick={() => handleRepeatLast(ex.exerciseId, setNumber)}
                          >
                            REPEAT LAST
                          </button>
                        )}
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px", fontSize: 16 }}
                          disabled={busy}
                          onClick={() => void handleLogSet(ex.exerciseId, setNumber)}
                        >
                          LOG
                        </button>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px", fontSize: 16, background: "var(--surface-2)" }}
                          disabled={busy}
                          onClick={() => void handleSkipSet(ex.exerciseId, setNumber)}
                        >
                          SKIP
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <p className="meta" style={{ marginBottom: 8 }}>{describePartialAdvancement(session.sessionType as SessionType)}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" disabled={busy} onClick={() => void handleCompleteWorkout("COMPLETED")}>
                COMPLETE
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                disabled={busy}
                onClick={() => void handleCompleteWorkout("PARTIAL")}
              >
                PARTIAL
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                disabled={busy}
                onClick={handleStopClick}
              >
                {describeStopAction(hasLoggedAnySet)}
              </button>
            </div>
            {showStopConfirm && (
              <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--border-strong)", borderRadius: "var(--radius)" }}>
                <p className="card-body" style={{ marginBottom: 12 }}>{describeStopConfirm(sets.length)}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" disabled={busy} onClick={() => void actuallyStop()}>
                    STOP WORKOUT
                  </button>
                  <button
                    className="btn-primary"
                    style={{ background: "var(--surface-2)" }}
                    onClick={() => setShowStopConfirm(false)}
                  >
                    KEEP GOING
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
