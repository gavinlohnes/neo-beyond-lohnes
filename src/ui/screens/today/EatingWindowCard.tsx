import { useEffect, useState } from "react";
import { getEatingWindowView, markEatingWindow, presetLabel, skipEatingWindowToday, voidEatingWindowEvent, windowFuelLine, TYPICAL_LABEL, type EatingWindowView, type MealPrompt } from "../../../application/eatingWindow";

const clockOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
/** C4.8b: offers he waved off, on this device only (a convenience; losing it only means the offer comes back). */
const DISMISSED = "beyond.eating.dismissed.v1";
function readDismissed(): Set<string> {
  try { const raw = JSON.parse(localStorage.getItem(DISMISSED) ?? "[]") as unknown; return new Set(Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : []); } catch { return new Set(); }
}
function dismiss(prompt: MealPrompt) {
  try { localStorage.setItem(DISMISSED, JSON.stringify([...readDismissed(), `${prompt.kind}:${prompt.mealId}`].slice(-50))); } catch { /* offered again */ }
}
const span = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * GRAYSON C4.8a: the Eating Window on TODAY, shown only once he has turned it on. Neutral: END FAST never asks why,
 * SKIP TODAY needs no excuse, every tap has UNDO, and the context line is labelled typical, not measured in him.
 */
export function EatingWindowCard({ active, refreshKey, busy }: { active: boolean; refreshKey: number; busy: boolean }) {
  const [view, setView] = useState<EatingWindowView | null>(null);
  const [reload, setReload] = useState(0);
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void getEatingWindowView(new Date(), readDismissed()).then((v) => { if (!cancelled) setView(v); }, () => { if (!cancelled) setView(null); });
    return () => { cancelled = true; };
  }, [active, refreshKey, reload]);
  if (!view) return null;

  const act = async (run: () => Promise<string | void>, label: string | null) => {
    if (saving) return;
    setSaving(true); setError(null);
    try { const id = await run(); setUndo(label && typeof id === "string" ? { id, label } : null); setReload((n) => n + 1); }
    catch { setError("That didn't save. Nothing changed; try again."); }
    finally { setSaving(false); }
  };
  const { state, settings, prompt, fuel } = view;
  const fuelLine = fuel ? windowFuelLine(fuel, state) : null;
  const plan = presetLabel(settings.eatingHours);
  return (
    <section className="bf today-eating" aria-label="Eating window">
      <div className="today-eating__head">
        <h2 className="today-eating__label">EATING WINDOW</h2>
        <span className="bf-src">{plan} PLAN</span>
      </div>
      {state.kind === "FASTING" && <>
        <p className="today-eating__state">FAST IN PROGRESS <b>{span(state.elapsedMinutes)}</b></p>
        <p className="bf-meta">{state.opensAt ? `Eating planned to open at ${state.opensAt}.` : "Your planned opening for today has passed."}</p>
        <p className="today-eating__context">{state.context} <em>{TYPICAL_LABEL}</em></p>
      </>}
      {state.kind === "OPEN" && <>
        <p className="today-eating__state">OPEN <b>{span(state.leftMinutes)} LEFT</b></p>
        <p className="bf-meta">{state.leftMinutes > 0 ? `Window planned to close at ${state.closesAt}.` : `The planned ${settings.eatingHours} hours are up. Close it when you're done.`}</p>
      </>}
      {fuelLine && <p className="bf-meta today-eating__fuel">{fuelLine}</p>}
      {/* C4.8b: what he logged, offered as a boundary; he decides. */}
      {prompt && <div className="today-eating__offer" role="group" aria-label="From your meal log">
        <p className="bf-meta">{prompt.kind === "END_AT" ? `You logged ${prompt.name} at ${clockOf(prompt.at)}, during this fast.` : `Last meal logged: ${prompt.name} at ${clockOf(prompt.at)}.`}</p>
        <div className="today-eating__acts">
          <button type="button" className="btn-secondary" disabled={busy || saving}
            onClick={() => void act(() => markEatingWindow(prompt.kind === "END_AT" ? "OPENED" : "CLOSED", prompt.at), prompt.kind === "END_AT" ? `Fast ended at ${clockOf(prompt.at)}.` : `Fast started at ${clockOf(prompt.at)}.`)}>
            {prompt.kind === "END_AT" ? `END FAST AT ${clockOf(prompt.at)}` : `FAST FROM ${clockOf(prompt.at)}`}</button>
          <button type="button" className="today-eating__not" disabled={saving} onClick={() => { dismiss(prompt); setReload((n) => n + 1); }}>NOT NOW</button>
        </div>
      </div>}
      {state.kind === "PLANNED" && <p className="bf-meta">Today's plan: eat {state.opensAt}–{state.closesAt}.</p>}
      {state.kind === "SKIPPED" && <p className="bf-meta">Skipped for today. Back tomorrow.</p>}
      <div className="today-eating__acts">
        {state.kind === "FASTING" && <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void act(() => markEatingWindow("OPENED"), "Fast ended.")}>END FAST</button>}
        {(state.kind === "OPEN" || state.kind === "PLANNED") && <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void act(() => markEatingWindow("CLOSED"), "Fast started.")}>{state.kind === "OPEN" ? "CLOSE WINDOW" : "START FAST"}</button>}
        {state.kind !== "SKIPPED" && <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void act(skipEatingWindowToday, "Skipped for today.")}>SKIP TODAY</button>}
        {state.kind === "SKIPPED" && <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void act(() => voidEatingWindowEvent(state.skipId), null)}>UNDO SKIP</button>}
      </div>
      {undo && <p className="today-eating__undo" role="status">{undo.label} <button type="button" className="btn-secondary" disabled={saving} onClick={() => void act(() => voidEatingWindowEvent(undo.id), null)}>UNDO</button></p>}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}
