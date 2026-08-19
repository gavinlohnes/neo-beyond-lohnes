import { useEffect, useState } from "react";
import type { BeyondDay, Capacity, WorkoutSession } from "../../../domain/common/types";
import type { PerformedSet, SessionType, WorkoutTemplateId } from "../../../domain/workout/types";
import { WORKOUT_TEMPLATES, getReducedExercises } from "../../../domain/workout/types";
import { deriveCapacity } from "../../../engine/capacity";
import { suggestSessionVariant } from "../../../engine/trainSuggestion";
import type { ProgressionSuggestion } from "../../../engine/progression";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { getActiveDay, getLatestCheckIn } from "../../../application/queries";
import {
  getActiveWorkoutSession,
  getPerformedSets,
  getProgressionSuggestion,
  suggestTemplateForNextWorkout,
} from "../../../application/trainQueries";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
} from "../../../application/trainCommands";

const TEMPLATE_ORDER: WorkoutTemplateId[] = ["A", "B", "C"];
const VARIANT_ORDER: SessionType[] = ["STANDARD", "REDUCED", "RECOVERY"];

function exercisesFor(templateId: WorkoutTemplateId, sessionType: SessionType) {
  if (sessionType === "RECOVERY") return [];
  return sessionType === "REDUCED"
    ? getReducedExercises(templateId)
    : WORKOUT_TEMPLATES[templateId].exercises;
}

export function TrainScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [suggestedTemplate, setSuggestedTemplate] = useState<WorkoutTemplateId>("A");
  const [chosenTemplate, setChosenTemplate] = useState<WorkoutTemplateId>("A");
  const [chosenVariant, setChosenVariant] = useState<SessionType>("STANDARD");
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<PerformedSet[]>([]);
  const [busy, setBusy] = useState(false);
  const [recoveryMinutes, setRecoveryMinutes] = useState(10);
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, { weight: number; reps: number }>>({});
  const [progressionSuggestions, setProgressionSuggestions] = useState<Record<string, ProgressionSuggestion>>({});
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    if (!activeDay) return;

    const checkIn = await getLatestCheckIn(activeDay.id);
    const cap = checkIn ? deriveCapacity(checkIn).capacity : null;
    setCapacity(cap);

    const suggestion = suggestSessionVariant(cap);
    setChosenVariant(suggestion.variant === "RESET" ? "STANDARD" : suggestion.variant);

    const nextTemplate = await suggestTemplateForNextWorkout();
    setSuggestedTemplate(nextTemplate);
    setChosenTemplate(nextTemplate);

    const active = (await getActiveWorkoutSession(activeDay.id)) ?? null;
    setSession(active);
    if (active) {
      setSets(await getPerformedSets(active.id));
      await loadProgressionSuggestions(active);
    } else {
      setSets([]);
      setProgressionSuggestions({});
    }
  }

  /**
   * Advisory only (Decision Register TRAIN, locked): loaded once per
   * session start/resume so the suggestion is visible before the user
   * logs anything, but never used to pre-fill or otherwise silently
   * change what the weight/rep inputs default to.
   */
  async function loadProgressionSuggestions(activeSession: WorkoutSession) {
    if (activeSession.sessionType === "RECOVERY") {
      setProgressionSuggestions({});
      return;
    }
    const templateId = activeSession.templateId as WorkoutTemplateId;
    const sessionType = activeSession.sessionType as "STANDARD" | "REDUCED";
    const exercises = exercisesFor(templateId, activeSession.sessionType as SessionType);
    const entries = await Promise.all(
      exercises.map(async (ex) => [ex.exerciseId, await getProgressionSuggestion(templateId, sessionType, ex.exerciseId)] as const),
    );
    setProgressionSuggestions(Object.fromEntries(entries));
  }

  async function actuallyStart() {
    if (!day) return;
    setBusy(true);
    try {
      const started = await startWorkout(
        day.id,
        chosenVariant === "RECOVERY" ? null : chosenTemplate,
        chosenVariant,
        { overrideConfirmed: true },
      );
      setSession(started);
      setSets([]);
      await loadProgressionSuggestions(started);
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!day) return;
    if (chosenVariant === "STANDARD") {
      guard(capacity, () => actuallyStart());
    } else {
      await actuallyStart();
    }
  }

  function inputKey(exerciseId: string, setNumber: number): string {
    return `${exerciseId}#${setNumber}`;
  }

  function getInput(exerciseId: string, setNumber: number) {
    return inputs[inputKey(exerciseId, setNumber)] ?? { weight: 0, reps: 0 };
  }

  function setInput(exerciseId: string, setNumber: number, patch: Partial<{ weight: number; reps: number }>) {
    const key = inputKey(exerciseId, setNumber);
    setInputs((prev) => ({ ...prev, [key]: { ...getInput(exerciseId, setNumber), ...patch } }));
  }

  async function handleLogSet(exerciseId: string, setNumber: number) {
    if (!day || !session) return;
    const { weight, reps } = getInput(exerciseId, setNumber);
    setBusy(true);
    try {
      await logSet(day.id, session.id, exerciseId, setNumber, weight, reps, subs[exerciseId] || undefined);
      setSets(await getPerformedSets(session.id));
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipSet(exerciseId: string, setNumber: number) {
    if (!day || !session) return;
    setBusy(true);
    try {
      await skipSet(day.id, session.id, exerciseId, setNumber);
      setSets(await getPerformedSets(session.id));
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteWorkout(status: "COMPLETED" | "PARTIAL") {
    if (!day || !session) return;
    setBusy(true);
    try {
      await completeWorkout(day.id, session.id, session.sessionType as SessionType, status);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAbandonWorkout() {
    if (!day || !session) return;
    setBusy(true);
    try {
      await abandonWorkout(day.id, session.id, session.sessionType as SessionType);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteRecovery() {
    if (!day || !session) return;
    setBusy(true);
    try {
      await completeRecoverySession(day.id, session.id, recoveryMinutes);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!day) {
    return (
      <div className="screen">
        <p className="eyebrow">BEYOND // TRAIN</p>
        <h1 className="title">Train</h1>
        <p className="card-body">Start your day on TODAY first.</p>
      </div>
    );
  }

  const hasLoggedAnySet = sets.length > 0;
  const activeExercises = session
    ? exercisesFor(session.templateId as WorkoutTemplateId, session.sessionType as SessionType)
    : [];

  return (
    <div className="screen">
      <p className="eyebrow">BEYOND // TRAIN</p>
      <h1 className="title">Train</h1>

      <ConfirmPanel />

      {!session && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>WORKOUT</p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Suggested: {suggestedTemplate} — {suggestSessionVariant(capacity).reason}
          </p>

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
                  fontSize: 13,
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
            Duration only. 10+ min completed, 1-9 min partial, 0 min ends as abandoned.
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
                fontSize: 15,
              }}
            />
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => void handleCompleteRecovery()}>
            END RECOVERY
          </button>
        </div>
      )}

      {session && session.sessionType !== "RECOVERY" && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            {session.templateId} — {session.sessionType} — IN PROGRESS
          </p>
          <p className="card-body" style={{ marginBottom: 12 }}>
            Rest ~60-90s between sets.
          </p>

          {activeExercises.map((ex) => (
            <div
              key={ex.exerciseId}
              style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginTop: 12 }}
            >
              <p className="card-title" style={{ marginBottom: 2 }}>{ex.name}</p>
              <p className="meta" style={{ marginBottom: 8 }}>
                {ex.sets} sets x {ex.repRangeLow}-{ex.repRangeHigh} reps
              </p>
              {progressionSuggestions[ex.exerciseId] && progressionSuggestions[ex.exerciseId]!.recommendation !== "NO_HISTORY" && (
                <details className="why" style={{ marginBottom: 8 }}>
                  <summary>
                    PROGRESSION: {progressionSuggestions[ex.exerciseId]!.recommendation}
                    {progressionSuggestions[ex.exerciseId]!.suggestedNextWeight !== undefined
                      ? ` → ${progressionSuggestions[ex.exerciseId]!.suggestedNextWeight}lb`
                      : ""}
                  </summary>
                  <p className="meta">{progressionSuggestions[ex.exerciseId]!.reason}</p>
                </details>
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
                  fontSize: 13,
                  marginBottom: 8,
                }}
              />
              {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNumber) => {
                const loggedSet = sets.find((s) => s.exerciseId === ex.exerciseId && s.setNumber === setNumber);
                const input = getInput(ex.exerciseId, setNumber);
                return (
                  <div key={setNumber} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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
                          onClick={() => setInput(ex.exerciseId, setNumber, { weight: Math.max(0, input.weight - 5) })}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={input.weight}
                          onChange={(e) => setInput(ex.exerciseId, setNumber, { weight: Number(e.target.value) || 0 })}
                          style={{ width: 60, padding: "4px 6px", background: "var(--surface-2)", color: "var(--text-1)" }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => setInput(ex.exerciseId, setNumber, { weight: input.weight + 5 })}
                        >
                          +
                        </button>
                        <span className="meta">lb x</span>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => setInput(ex.exerciseId, setNumber, { reps: Math.max(0, input.reps - 1) })}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={input.reps}
                          onChange={(e) => setInput(ex.exerciseId, setNumber, { reps: Number(e.target.value) || 0 })}
                          style={{ width: 44, padding: "4px 6px", background: "var(--surface-2)", color: "var(--text-1)" }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => setInput(ex.exerciseId, setNumber, { reps: input.reps + 1 })}
                        >
                          +
                        </button>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                          disabled={busy}
                          onClick={() => void handleLogSet(ex.exerciseId, setNumber)}
                        >
                          LOG
                        </button>
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "4px 10px", fontSize: 12, background: "var(--surface-2)" }}
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

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
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
              onClick={() => void handleAbandonWorkout()}
            >
              ABANDON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
