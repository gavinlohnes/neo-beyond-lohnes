import { useEffect, useState } from "react";
import { getFlipSettingsView, saveFlipSettings } from "../../../application/sleepPlanSettings";
import type { FlipChoice, FlipSetBy, FlipSettings as Settings } from "../../../application/flipPlan";

/**
 * GRAYSON-FLIP-PLAN-001: the flip card's CHANGE, the same pattern as the caffeine cut-off's: pick, SAVE, UNDO. Every
 * number and both plan choices are his; each says whether it's the default or his own.
 */
type Outcome = { kind: "SAVED"; undo: () => Promise<boolean> } | { kind: "UNDONE" } | { kind: "ERROR"; message: string };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const parseHhmm = (v: string) => { const [h, m] = v.split(":").map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h! * 60 + m! : NaN; };
const GET_UP = Array.from({ length: 17 }, (_, i) => 11 * 60 + i * 15);
const DAYLIGHT_LENGTHS = [30, 60, 90, 120, 180, 240];
const CHOICE: Record<FlipChoice, string> = { STAY_LATE: "Stay late", FLIP_BACK: "Flip back" };

export function FlipSettings({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<{ settings: Settings; setBy: FlipSetBy } | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    void getFlipSettingsView().then((v) => { if (live) setView(v); }, () => { if (live) setView(null); });
    return () => { live = false; };
  }, [reload]);
  if (!view) return null;
  const whose = (key: keyof Settings) => view.setBy[key] ? " (your setting)" : " (default)";
  const run = async (fn: () => Promise<Outcome>) => {
    if (busy) return;
    setBusy(true);
    try { setOutcome(await fn()); setReload((r) => r + 1); onChanged?.(); }
    catch { setOutcome({ kind: "ERROR", message: "That couldn't be saved. Nothing changed." }); }
    finally { setBusy(false); }
  };
  if (!draft) return <div style={{ marginTop: 6 }}>
    <p className="meta" style={{ margin: 0 }} data-flip-settings>
      Get up by {hhmm(view.settings.getUpBy)}{whose("getUpBy")}. Daylight {hhmm(view.settings.daylightStart)} for {view.settings.daylightMinutes / 60} h{whose("daylightStart")}.
      {" "}2 days off: {CHOICE[view.settings.shortBreak]}{whose("shortBreak")}; 3 or more: {CHOICE[view.settings.longBreak]}{whose("longBreak")}.
      {" "}Stay late: bed {hhmm(view.settings.stayLateBed)}, up {hhmm(view.settings.stayLateWake)}{whose("stayLateBed")}. Before nights: {view.settings.laterHours} h later{whose("laterHours")}.
    </p>
    {outcome?.kind !== "SAVED" && <button type="button" className="btn-secondary" style={{ marginTop: 6 }} disabled={busy} aria-label="Change the flip plan" onClick={() => { setDraft({ ...view.settings }); setOutcome(null); }}>CHANGE</button>}
    {outcome?.kind === "SAVED" && <div role="status" style={{ marginTop: 6 }}>
      <p className="meta" style={{ margin: 0 }}>Saved. The flip plan uses your settings.</p>
      <button type="button" className="btn-secondary" style={{ marginTop: 6 }} disabled={busy} onClick={() => void run(async () => (await outcome.undo()) ? { kind: "UNDONE" } : { kind: "ERROR", message: "The settings were changed again since, so UNDO did nothing." })}>UNDO</button>
    </div>}
    {outcome?.kind === "UNDONE" && <p role="status" className="meta">Undone. The flip settings are back as they were.</p>}
    {outcome?.kind === "ERROR" && <p role="alert" className="meta">{outcome.message}</p>}
  </div>;
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft({ ...draft, [key]: value });
  const changed = (Object.keys(draft) as (keyof Settings)[]).filter((k) => draft[k] !== view.settings[k]);
  const field = { display: "grid", gap: 4, marginTop: 8, fontSize: 16 } as const;
  return <div role="group" aria-label="Change the flip plan" className="flip-settings" style={{ marginTop: 6 }}>
    <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 16 }}><input type="checkbox" checked={draft.show} onChange={() => set("show", !draft.show)} /> Show flip plans</label>
    <label style={field}>Get up by, after the last night
      <select className="input" value={draft.getUpBy} onChange={(e) => set("getUpBy", Number(e.target.value))}>{GET_UP.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}</select></label>
    <label style={field}>A 2-day break
      <select className="input" value={draft.shortBreak} onChange={(e) => set("shortBreak", e.target.value as FlipChoice)}>{(["STAY_LATE", "FLIP_BACK"] as const).map((c) => <option key={c} value={c}>{CHOICE[c]}</option>)}</select></label>
    <label style={field}>3 or more days off
      <select className="input" value={draft.longBreak} onChange={(e) => set("longBreak", e.target.value as FlipChoice)}>{(["FLIP_BACK", "STAY_LATE"] as const).map((c) => <option key={c} value={c}>{CHOICE[c]}</option>)}</select></label>
    <label style={field}>Stay late: bed
      <input className="input" type="time" value={hhmm(draft.stayLateBed)} onChange={(e) => { const m = parseHhmm(e.target.value); if (Number.isFinite(m)) set("stayLateBed", m); }} /></label>
    <label style={field}>Stay late: up
      <input className="input" type="time" value={hhmm(draft.stayLateWake)} onChange={(e) => { const m = parseHhmm(e.target.value); if (Number.isFinite(m)) set("stayLateWake", m); }} /></label>
    <label style={field}>The night before nights, hours later than usual
      <select className="input" value={draft.laterHours} onChange={(e) => set("laterHours", Number(e.target.value))}>{[0, 1, 2, 3].map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
    <label style={field}>Daylight from
      <input className="input" type="time" step={900} min="06:00" max="18:00" value={hhmm(draft.daylightStart)} onChange={(e) => { const m = parseHhmm(e.target.value); if (Number.isFinite(m)) set("daylightStart", m); }} /></label>
    <label style={field}>Daylight for
      <select className="input" value={draft.daylightMinutes} onChange={(e) => set("daylightMinutes", Number(e.target.value))}>{DAYLIGHT_LENGTHS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}</select></label>
    <p className="meta" style={{ margin: "6px 0 0" }}>NIOSH suggests on days off staying up until 3–4 a.m. and sleeping until noon or 1 p.m.</p>
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button type="button" className="btn-primary" disabled={busy || changed.length === 0}
        onClick={() => void run(async () => {
          const patch = Object.fromEntries(changed.map((k) => [k, draft[k]])) as Partial<Settings>;
          const result = await saveFlipSettings(patch);
          setDraft(null);
          return { kind: "SAVED", undo: result.undo };
        })}>SAVE</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setDraft(null)}>CANCEL</button>
    </div>
    {outcome?.kind === "ERROR" && <p role="alert" className="meta">{outcome.message}</p>}
  </div>;
}
