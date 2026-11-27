import { useState } from "react";
import { DEFAULT_STRETCH_SUGGEST, readStretchSuggestSettings, writeStretchSuggestSettings, type StretchSuggestSettings as Settings } from "../../../application/stretchRoutines";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: TRAIN's stretch suggestion, on or off, and how long each window lasts. Saved on
 * this phone at once and carried by the backup. A suggestion only ever shows on TRAIN; nothing is sent to his phone.
 */
const CHOICES = [0.5, 1, 1.5, 2, 3, 4];
const ROWS = [
  ["afterShiftHours", "After shift: within", "after a shift ends"],
  ["beforeSleepHours", "Before sleep: within", "before your usual sleep"],
  ["afterLiftingHours", "After lifting: within", "after a workout"],
] as const;
const hoursWord = (h: number) => (h === 0.5 ? "30 min" : h === 1 ? "1 hour" : `${h} hours`);

export function StretchSuggestSettings() {
  const [settings, setSettings] = useState<Settings>(() => readStretchSuggestSettings());
  const save = (next: Settings) => { writeStretchSuggestSettings(next); setSettings(next); };
  return <div className="today-quiet-settings" role="group" aria-label="Stretch suggestion">
    <p className="meta">TRAIN suggests the stretch routine that fits now, from your shift, your usual sleep and your last workout. It never starts one by itself.</p>
    <div className="today-quiet-settings__row">
      <span>Suggest a stretch routine</span>
      <button type="button" className={`chip${settings.on ? " chip--selected" : ""}`} aria-pressed={settings.on} aria-label="Suggest a stretch routine"
        onClick={() => save({ ...settings, on: !settings.on })}>{settings.on ? "ON" : "OFF"}</button>
    </div>
    {settings.on && ROWS.map(([key, label, after]) => (
      <label key={key} className="today-quiet-settings__row" style={{ flexWrap: "wrap" }}>
        <span>{label}</span>
        <select aria-label={`${label} ${after}`} value={settings[key]} style={{ minHeight: 44, fontSize: 16 }} onChange={(e) => save({ ...settings, [key]: Number(e.target.value) })}>
          {[...new Set([...CHOICES, settings[key]])].sort((a, b) => a - b).map((h) => <option key={h} value={h}>{hoursWord(h)} {after}</option>)}
        </select>
      </label>
    ))}
    {JSON.stringify(settings) !== JSON.stringify(DEFAULT_STRETCH_SUGGEST) && <button type="button" className="btn-secondary" onClick={() => save({ ...DEFAULT_STRETCH_SUGGEST })}>RESET TO DEFAULTS</button>}
  </div>;
}
