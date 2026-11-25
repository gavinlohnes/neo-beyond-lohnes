import { useState } from "react";
import { readDictationSettings, writeDictationSettings, type DictationSettings } from "../../speech/dictationSettings";
import "../today/todayQuietLines.css";

/**
 * GRAYSON-DICTATE-001 ("I should be able to edit and tweak or correct everything in this app"): the TALK buttons, and
 * whether what he says is sorted into logs. Saved on this phone at once and carried by the backup.
 */
const SWITCHES: { key: keyof DictationSettings; label: string; meta: string }[] = [
  { key: "talk", label: "TALK buttons", meta: "In quick capture, the meal log and the check-in. Drive Home and Alfred keep their own voice." },
  { key: "sort", label: "Sort what I say into logs", meta: "Off: TALK only fills the box, like the keyboard mic, and CAPTURE saves it raw." },
];
export function VoiceSettings() {
  const [settings, setSettings] = useState<DictationSettings>(() => readDictationSettings());
  return <div className="today-quiet-settings">
    {SWITCHES.map(({ key, label, meta }) => <div className="today-quiet-settings__row" key={key}>
      <span className="today-quiet-settings__name">{label}<span className="meta" style={{ display: "block" }}>{meta}</span></span>
      <button type="button" className={`chip ${settings[key] ? "chip--selected" : ""}`} aria-pressed={settings[key]} aria-label={label}
        onClick={() => { const next = { ...settings, [key]: !settings[key] }; writeDictationSettings(next); setSettings(next); }}>{settings[key] ? "ON" : "OFF"}</button>
    </div>)}
  </div>;
}
