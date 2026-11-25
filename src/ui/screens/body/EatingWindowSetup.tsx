import { useEffect, useState } from "react";
import {
  DEFAULT_EATING_HOURS, DEFAULT_OPENS_AT, EATING_HOURS_MAX, EATING_HOURS_MIN, EATING_PRESETS, SAFETY_QUESTIONS,
  getEatingWindowSettings, presetLabel, saveEatingWindowSettings,
} from "../../../application/eatingWindow";
import type { EatingWindowDayKind, EatingWindowSettings } from "../../../domain/common/types";
import { EatingWindowReview } from "./EatingWindowReview";
import "./eatingWindow.css";

const KINDS: readonly { kind: EatingWindowDayKind; label: string }[] = [
  { kind: "WORK", label: "Work night" }, { kind: "RECOVERY", label: "Recovery day" }, { kind: "OFF", label: "Day off" },
];

/**
 * GRAYSON C4.8a: setting up the Eating Window, on BODY. Off until he turns it on. Turning it on first asks the safety
 * questions privately; any "yes" points him to a clinician and nothing is turned on. Only the fact that he completed
 * the check is kept, never his answers.
 */
export function EatingWindowSetup({ active }: { active: boolean }) {
  const [saved, setSaved] = useState<EatingWindowSettings | null | undefined>(undefined);
  const [hours, setHours] = useState(DEFAULT_EATING_HOURS);
  const [opens, setOpens] = useState<Record<EatingWindowDayKind, string>>({ ...DEFAULT_OPENS_AT });
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState<(boolean | null)[]>(SAFETY_QUESTIONS.map(() => null));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // BODY stays free of entry forms until he opens this (RedesignBody: numbers, progress and history first).
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    void getEatingWindowSettings().then((s) => {
      setSaved(s);
      if (s) { setHours(s.eatingHours); setOpens({ ...s.opensAt }); }
    }, () => setSaved(null));
  }, [active]);
  if (saved === undefined) return null;

  const save = async (enabled: boolean, safetyCheckedAt: string) => {
    setSaving(true); setMessage(null);
    try { const s = await saveEatingWindowSettings({ enabled, eatingHours: hours, opensAt: opens, safetyCheckedAt }); setSaved(s); setChecking(false); setMessage(enabled ? "Eating window is on. It shows on TODAY." : "Eating window is off."); }
    catch { setMessage("That didn't save. Check the times and try again."); }
    finally { setSaving(false); }
  };
  const turnOn = () => {
    if (saved?.safetyCheckedAt) void save(true, saved.safetyCheckedAt);
    else { setAnswers(SAFETY_QUESTIONS.map(() => null)); setChecking(true); }
  };
  const anyYes = answers.some((a) => a === true);
  const allAnswered = answers.every((a) => a !== null);

  return (
    <details className="eating-setup" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="disclosure-row">EATING WINDOW {saved?.enabled ? `· ON · ${presetLabel(saved.eatingHours)}` : "· OFF"}</summary>
      {open && <>
      <p className="meta">A time to eat and a time not to, set around your shifts. It's a tool, not a test: ending a fast early is fine, and there are no levels.</p>
      <fieldset className="eating-setup__group">
        <legend>Window</legend>
        <div className="eating-setup__presets">
          {EATING_PRESETS.map((p) => <button key={p.label} type="button" className="btn-secondary" aria-pressed={hours === p.eatingHours} onClick={() => setHours(p.eatingHours)}>{p.label}</button>)}
        </div>
        <label className="eating-setup__row">Eating hours
          <input type="number" id="eating-hours" min={EATING_HOURS_MIN} max={EATING_HOURS_MAX} value={hours} onChange={(e) => setHours(Math.max(EATING_HOURS_MIN, Math.min(EATING_HOURS_MAX, Math.round(Number(e.target.value) || DEFAULT_EATING_HOURS))))} />
        </label>
      </fieldset>
      <fieldset className="eating-setup__group">
        <legend>Eating opens at</legend>
        {KINDS.map(({ kind, label }) => (
          <label key={kind} className="eating-setup__row">{label}
            <input type="time" id={`eating-opens-${kind}`} value={opens[kind]} onChange={(e) => setOpens((o) => ({ ...o, [kind]: e.target.value || o[kind] }))} />
          </label>
        ))}
      </fieldset>
      {checking ? (
        <fieldset className="eating-setup__group" aria-label="Before you start">
          <legend>Before you start. Your answers aren't saved.</legend>
          {SAFETY_QUESTIONS.map((q, i) => (
            <div key={q} className="eating-setup__question">
              <p>{q}</p>
              <div className="eating-setup__presets">
                <button type="button" className="btn-secondary" aria-pressed={answers[i] === false} onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? false : v)))}>NO</button>
                <button type="button" className="btn-secondary" aria-pressed={answers[i] === true} onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? true : v)))}>YES</button>
              </div>
            </div>
          ))}
          {anyYes
            ? <p className="meta" role="status">Talk with your doctor before starting an eating window. Nothing has been turned on.</p>
            : <button type="button" className="btn-secondary" disabled={!allAnswered || saving} onClick={() => void save(true, new Date().toISOString())}>TURN ON</button>}
        </fieldset>
      ) : (
        <div className="eating-setup__presets">
          {saved?.enabled
            ? <><button type="button" className="btn-secondary" disabled={saving} onClick={() => void save(true, saved.safetyCheckedAt)}>SAVE CHANGES</button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => void save(false, saved.safetyCheckedAt)}>TURN OFF</button></>
            : <button type="button" className="btn-secondary" disabled={saving} onClick={turnOn}>TURN ON</button>}
        </div>
      )}
      {message && <p className="meta" role="status">{message}</p>}
      {/* GRAYSON-WINDOW-REVIEW-001 (C4.8c): what he actually does, how it's going, and why, once the window is on. */}
      {saved?.enabled && <EatingWindowReview refreshKey={saved.setAt}
        onSettings={(s) => { setSaved(s); setHours(s.eatingHours); setOpens({ ...s.opensAt }); }}
        onAdjust={() => document.getElementById("eating-hours")?.focus()} />}
      </>}
    </details>
  );
}
