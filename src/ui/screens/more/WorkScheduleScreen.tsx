import { useEffect, useState } from "react";
import { getSchedulePattern, getScheduledContext } from "../../../application/queries";
import { updateSchedulePattern } from "../../../application/commands";
import {
  anchorMondayForCurrentWeek,
  deriveScheduledContext,
  type ScheduleWeek,
} from "../../../engine/scheduledContext";
import { describeSchedulePrediction } from "../today/workContextCopy";
import type { SchedulePattern } from "../../../domain/common/types";

/**
 * Drop 02a (Daily Intelligence / Context, first slice). MORE -> Work
 * Schedule: the only place the SchedulePattern that used to be hardcoded
 * in engine/scheduledContext.ts can be edited. Configuration, not daily
 * interaction — reachable from MORE, not TODAY.
 *
 * Deliberately does not expose `anchorMonday` or "post-work tail" as
 * concepts: the former is derived from "which week is active right now,"
 * a plain question the editor asks directly; the latter isn't something
 * Gavin asked to configure, so it's carried forward unchanged from
 * whatever pattern is already stored.
 */

const DAYS: { label: string; value: number }[] = [
  { label: "MON", value: 1 },
  { label: "TUE", value: 2 },
  { label: "WED", value: 3 },
  { label: "THU", value: 4 },
  { label: "FRI", value: 5 },
  { label: "SAT", value: 6 },
  { label: "SUN", value: 0 },
];

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${period}`;
}

function toggled(set: number[], value: number): number[] {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value].sort((a, b) => a - b);
}

export function WorkScheduleScreen() {
  const [loaded, setLoaded] = useState(false);
  const [weekAWorkdays, setWeekAWorkdays] = useState<number[]>([]);
  const [weekBWorkdays, setWeekBWorkdays] = useState<number[]>([]);
  const [shiftStartHour, setShiftStartHour] = useState(18);
  const [shiftEndHour, setShiftEndHour] = useState(6);
  const [activeWeek, setActiveWeek] = useState<ScheduleWeek>("A");
  const [postWorkTailHours, setPostWorkTailHours] = useState(6);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [pattern, ctx] = await Promise.all([getSchedulePattern(), getScheduledContext()]);
      setWeekAWorkdays(pattern.weeks[0]?.workdays ?? []);
      setWeekBWorkdays(pattern.weeks[1]?.workdays ?? []);
      setShiftStartHour(pattern.shiftStartHour);
      setShiftEndHour(pattern.shiftEndHour);
      setPostWorkTailHours(pattern.postWorkTailHours);
      setActiveWeek(ctx.week);
      setLoaded(true);
    })();
  }, []);

  const shiftHoursInvalid = shiftStartHour === shiftEndHour;

  function draftPattern(): SchedulePattern {
    const activeWeekIndex = activeWeek === "A" ? 0 : 1;
    return {
      id: "current",
      anchorMonday: anchorMondayForCurrentWeek(new Date(), activeWeekIndex),
      weeks: [{ workdays: weekAWorkdays }, { workdays: weekBWorkdays }],
      shiftStartHour,
      shiftEndHour,
      postWorkTailHours,
      createdAt: "",
      updatedAt: "",
    };
  }

  const preview = loaded && !shiftHoursInvalid ? describeSchedulePrediction(deriveScheduledContext(new Date(), draftPattern())) : null;

  async function handleSave() {
    if (saving || shiftHoursInvalid) return;
    setSaving(true);
    setStatus(null);
    try {
      const draft = draftPattern();
      await updateSchedulePattern({
        anchorMonday: draft.anchorMonday,
        weeks: draft.weeks,
        shiftStartHour: draft.shiftStartHour,
        shiftEndHour: draft.shiftEndHour,
        postWorkTailHours: draft.postWorkTailHours,
      });
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <p className="empty-state">Loading schedule...</p>;
  }

  return (
    <div className="fade-in">
      <p className="card-body" style={{ marginBottom: 16 }}>
        Your work rotation. BEYOND uses this only to predict and suggest — it never counts as an actual
        record of when you worked until you confirm it yourself.
      </p>

      <div className="card">
        <h2 className="card-title">Which week is active right now?</h2>
        <p className="meta" style={{ marginBottom: 8 }}>
          So BEYOND can line up the rotation without you picking a date.
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {(["A", "B"] as const).map((w) => (
            <button
              key={w}
              type="button"
              className={`chip ${activeWeek === w ? "chip--selected" : ""}`}
              aria-pressed={activeWeek === w}
              onClick={() => setActiveWeek(w)}
            >
              WEEK {w}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Week A working days</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`chip ${weekAWorkdays.includes(d.value) ? "chip--selected" : ""}`}
              aria-pressed={weekAWorkdays.includes(d.value)}
              onClick={() => setWeekAWorkdays(toggled(weekAWorkdays, d.value))}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Week B working days</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`chip ${weekBWorkdays.includes(d.value) ? "chip--selected" : ""}`}
              aria-pressed={weekBWorkdays.includes(d.value)}
              onClick={() => setWeekBWorkdays(toggled(weekBWorkdays, d.value))}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Shift hours</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="meta">Starts</span>
            <select
              className="input"
              value={shiftStartHour}
              onChange={(e) => setShiftStartHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="meta">Ends</span>
            <select
              className="input"
              value={shiftEndHour}
              onChange={(e) => setShiftEndHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {shiftHoursInvalid && (
          <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>
            Start and end can't be the same time.
          </p>
        )}
      </div>

      {preview && (
        <div className="card" style={{ borderColor: "var(--border-strong)" }}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PREVIEW</p>
          <p className="card-body">{preview}</p>
        </div>
      )}

      <button className="btn-primary" disabled={saving || shiftHoursInvalid} onClick={() => void handleSave()}>
        {saving ? "SAVING..." : "SAVE SCHEDULE"}
      </button>
      {status && <p className="meta" style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
