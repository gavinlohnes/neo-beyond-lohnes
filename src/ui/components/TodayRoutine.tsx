import { useEffect, useRef, useState } from "react";
import { getRoutines, getRoutineTicks, setRoutineStep, stepKey } from "../../application/routineCommands";
import { ROUTINE_MOMENT_LABELS, type Routine, type RoutineMoment } from "../../domain/routines";
import { captureCommitFeedback } from "../feel/feedback";
import { describeError } from "../errorMessage";

/**
 * ROUTINES-001 (owner ruling: "One quiet row on TODAY"). Only the routines for the current moment,
 * collapsed. Ticks are today's only; there's no count of past days, no streak and nothing marked
 * missed. With no routine for this moment the row isn't shown at all.
 */
export function TodayRoutine({ dayId, moment, active, busy = false }: { dayId: string | null; moment: RoutineMoment | null; active: boolean; busy?: boolean }) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const epoch = useRef(0);

  async function load() {
    if (!dayId) return;
    const mine = ++epoch.current;
    try {
      const [all, done] = await Promise.all([getRoutines(), getRoutineTicks(dayId)]);
      if (mine !== epoch.current) return;
      setRoutines(all.filter((r) => r.status === "ACTIVE")); setTicks(done); setError(null);
    } catch (cause) { if (mine === epoch.current) setError(describeError(cause, "Routines could not be read. Your records are unchanged.")); }
  }
  useEffect(() => { setRoutines(null); setTicks(new Set()); if (active && dayId && moment) void load(); return () => { ++epoch.current; }; }, [dayId, moment, active]);

  if (!dayId || !moment) return null;
  if (error) return <p role="alert" className="meta">{error}</p>;
  const here = (routines ?? []).filter((r) => r.moment === moment);
  if (here.length === 0) return null;

  async function toggle(routine: Routine, stepId: string, done: boolean) {
    if (saving || busy || !dayId) return;
    setSaving(true);
    const acknowledge = captureCommitFeedback();
    try { if (await setRoutineStep(dayId, routine.id, stepId, done)) acknowledge("LIGHT"); await load(); }
    catch (cause) { setError(describeError(cause, "That tick didn't save. Try again.")); }
    finally { setSaving(false); }
  }

  return <section aria-label={`${ROUTINE_MOMENT_LABELS[moment]} routine`} className="today-routine">
    {here.map((r) => <details key={r.id} className="writing-start">
      <summary>{ROUTINE_MOMENT_LABELS[moment].toUpperCase()} · {r.title}</summary>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {r.steps.map((s) => {
          const done = ticks.has(stepKey(r.id, s.id));
          return <li key={s.id}><label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={done} disabled={saving || busy} onChange={(e) => void toggle(r, s.id, e.target.checked)} />
            <span>{s.text}</span>
          </label></li>;
        })}
      </ul>
    </details>)}
  </section>;
}
