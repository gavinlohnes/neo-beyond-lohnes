import { useEffect, useState } from "react";
import { getActiveHabits } from "../../../application/habitQueries";
import { readLadderOff, setLadderHabitOff } from "../../../application/habitLadder";
import "../today/todayQuietLines.css";
import { QUIET_LINE_DEFAULT_ORDER, QUIET_MAX_CHOICES, type QuietLineId, type QuietLineSettings } from "../today/attentionPolicy";
import { quietLineOn, readTodayQuietSettings, setQuietLineOn, writeTodayQuietSettings } from "../today/todayQuietStore";

/**
 * GRAYSON-TODAY-CALM-001 ("I should be able to edit and tweak or correct everything in this app"): how many quiet
 * lines TODAY shows at once, their order, which ones show, and whether the after-shift cards come one at a time.
 * Saved on this phone at once and carried by the backup. The logging nudge's switch here is the same switch as in
 * Work schedule → Logging nudge, so there is one switch per line.
 */
export const QUIET_LINE_LABELS: Record<QuietLineId, string> = {
  DRIVE_HOME: "Drive home · hands-free",
  FIRST_AT_HOME: "First at home",
  LOG_NUDGE: "Logging nudge (Tell Delta line)",
  PHONE_ALERTS_BEHIND: "Phone alerts out of date",
  ROUTINE: "Routine row",
  EXPERIMENT: "Experiment line",
  REVIEW: "Review",
  HABIT_LADDER: "Habit check-ins (when a habit keeps slipping)",
  WORK_DUE: "Work record due",
};
/** Lines whose own brief hasn't been built yet: they keep their place in the order and show once they exist. */
const NOT_BUILT: ReadonlySet<QuietLineId> = new Set(["FIRST_AT_HOME"]);

export function TodayQuietSettings() {
  const [settings, setSettings] = useState<QuietLineSettings>(() => readTodayQuietSettings());
  const [, setTick] = useState(0);
  function save(next: QuietLineSettings) { writeTodayQuietSettings(next); setSettings(next); }
  function move(index: number, by: -1 | 1) {
    const order = [...settings.order];
    const to = index + by;
    if (to < 0 || to >= order.length) return;
    [order[index], order[to]] = [order[to]!, order[index]!];
    save({ ...settings, order });
  }
  const isDefaultOrder = settings.order.every((id, i) => id === QUIET_LINE_DEFAULT_ORDER[i]);

  return <div className="today-quiet-settings">
    <p className="meta">TODAY's quiet one-line notes. Errors and what you just did always show.</p>
    <div role="group" aria-label="Quiet lines at once" className="today-quiet-settings__row">
      <span className="tool-label">Quiet lines at once</span>
      <span className="today-quiet-settings__chips">
        {QUIET_MAX_CHOICES.map((n) => <button type="button" key={n} className={`chip${settings.max === n ? " chip--selected" : ""}`} aria-pressed={settings.max === n}
          onClick={() => save({ ...settings, max: n })}>{n}</button>)}
      </span>
    </div>
    <p className="tool-label">Order</p>
    <ol className="today-quiet-settings__order">
      {settings.order.map((id, i) => {
        const on = quietLineOn(settings, id);
        return <li key={id} className="today-quiet-settings__line">
          <span className="today-quiet-settings__name">{QUIET_LINE_LABELS[id]}{NOT_BUILT.has(id) && <span className="meta"> · coming</span>}</span>
          <span className="today-quiet-settings__controls">
            <button type="button" className="btn-secondary" disabled={i === 0} aria-label={`Move ${QUIET_LINE_LABELS[id]} up`} onClick={() => move(i, -1)}>UP</button>
            <button type="button" className="btn-secondary" disabled={i === settings.order.length - 1} aria-label={`Move ${QUIET_LINE_LABELS[id]} down`} onClick={() => move(i, 1)}>DOWN</button>
            <button type="button" className={`chip${on ? " chip--selected" : ""}`} aria-pressed={on} aria-label={`Show ${QUIET_LINE_LABELS[id]}`}
              onClick={() => { setSettings(setQuietLineOn(settings, id, !on)); setTick((t) => t + 1); }}>{on ? "ON" : "OFF"}</button>
          </span>
        </li>;
      })}
    </ol>
    <button type="button" className="btn-secondary" disabled={isDefaultOrder} onClick={() => save({ ...settings, order: [...QUIET_LINE_DEFAULT_ORDER] })}>RESET ORDER</button>
    <div className="today-quiet-settings__row">
      <span className="tool-label">One after-shift card at a time</span>
      <button type="button" className={`chip${settings.oneAfterShift ? " chip--selected" : ""}`} aria-pressed={settings.oneAfterShift} aria-label="One after-shift card at a time"
        onClick={() => save({ ...settings, oneAfterShift: !settings.oneAfterShift })}>{settings.oneAfterShift ? "ON" : "OFF"}</button>
    </div>
    <p className="meta">On: after SHIFT DOWN, the catch-up comes first and the close after it. Off: both show together.</p>
    <LadderPausedHabits />
  </div>;
}

/** GRAYSON-CHALLENGE-LADDER-001: habits he told Delta to stop asking about, each one tap to turn back on. */
function LadderPausedHabits() {
  const [paused, setPaused] = useState<{ id: string; name: string }[]>([]);
  const load = () => { const off = readLadderOff(); void getActiveHabits().then((all) => setPaused(all.filter((h) => off.has(h.id)).map((h) => ({ id: h.id, name: h.name }))), () => setPaused([])); };
  useEffect(load, []);
  if (!paused.length) return null;
  return <div role="group" aria-label="Habit check-ins turned off">
    <p className="tool-label">Habit check-ins turned off</p>
    {paused.map((h) => <div key={h.id} className="today-quiet-settings__row">
      <span>{h.name}</span>
      <button type="button" className="btn-secondary" aria-label={`Ask about ${h.name} again`} onClick={() => { setLadderHabitOff(h.id, false); load(); }}>ASK AGAIN</button>
    </div>)}
  </div>;
}
