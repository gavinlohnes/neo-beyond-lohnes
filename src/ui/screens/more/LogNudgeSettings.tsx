import { useEffect, useState } from "react";
import { NUDGE_DELAY_MAX, NUDGE_DELAY_MIN, NUDGE_KINDS, NUDGE_MAX_TIMES, getLearnedMealTimes, minuteClock, minuteFromClock, type LearnedTimes, type LogNudgeSettings as Settings } from "../../../application/logNudge";
import type { EatingWindowDayKind } from "../../../domain/common/types";
import { readLogNudgeSettings, writeLogNudgeSettings } from "../today/logNudgeStore";

/**
 * GRAYSON-LOG-NUDGE-001 ("I should be able to edit and tweak or correct everything in this app"): the logging nudge's
 * settings, beside the key-moment alerts. On/off, the delay after a usual time, and per day kind the usual times as
 * learned ("from your logs, N days"), each of which he can move, delete or add to. An edited list is his and wins;
 * RESET puts the learned times back. Saved on this phone at once and carried by the backup.
 */
const KIND_LABEL: Record<EatingWindowDayKind, string> = { WORK: "Work days", RECOVERY: "Recovery days", OFF: "Days off" };

export function LogNudgeSettings() {
  const [settings, setSettings] = useState<Settings>(() => readLogNudgeSettings());
  const [learned, setLearned] = useState<LearnedTimes | null>(null);
  useEffect(() => {
    let live = true;
    void getLearnedMealTimes().then((l) => { if (live) setLearned(l); }).catch(() => { if (live) setLearned({ WORK: [], RECOVERY: [], OFF: [] }); });
    return () => { live = false; };
  }, []);
  function save(next: Settings) { writeLogNudgeSettings(next); setSettings(next); }
  const timesFor = (kind: EatingWindowDayKind): { minute: number; days: number | null }[] =>
    settings.edited[kind]?.map((minute) => ({ minute, days: null })) ?? learned?.[kind].map((t) => ({ minute: t.minute, days: t.days })) ?? [];
  const editKind = (kind: EatingWindowDayKind, list: number[]) =>
    save({ ...settings, edited: { ...settings.edited, [kind]: [...new Set(list)].sort((a, b) => a - b).slice(0, NUDGE_MAX_TIMES) } });
  const reset = (kind: EatingWindowDayKind) => { const edited = { ...settings.edited }; delete edited[kind]; save({ ...settings, edited }); };

  return (
    <section aria-label="Logging nudge" className="log-nudge-settings" style={{ marginTop: 24 }}>
      <p className="section-label">Logging nudge</p>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 className="card-title">Tell Delta line</h2>
          <p className="meta">A quiet line under AT A GLANCE when a usual meal time passes with nothing logged. Never a notification, never on shift.</p>
        </div>
        <button type="button" className={`chip ${settings.enabled ? "chip--selected" : ""}`} aria-pressed={settings.enabled} aria-label="Logging nudge"
          onClick={() => save({ ...settings, enabled: !settings.enabled })}>{settings.enabled ? "ON" : "OFF"}</button>
      </div>
      <div className="card">
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="meta">Minutes after your usual time ({NUDGE_DELAY_MIN}–{NUDGE_DELAY_MAX})</span>
          <input className="input" type="number" inputMode="numeric" min={NUDGE_DELAY_MIN} max={NUDGE_DELAY_MAX} step={5} value={settings.delayMinutes}
            onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= NUDGE_DELAY_MIN && v <= NUDGE_DELAY_MAX) save({ ...settings, delayMinutes: Math.round(v) }); }} />
        </label>
      </div>
      {NUDGE_KINDS.map((kind) => {
        const times = timesFor(kind);
        const edited = settings.edited[kind] !== undefined;
        return (
          <div className="card" key={kind} role="group" aria-label={`${KIND_LABEL[kind]} usual meal times`}>
            <h2 className="card-title">{KIND_LABEL[kind]}</h2>
            {learned === null && !edited ? <p className="meta">Reading your logs…</p>
              : times.length === 0 ? <p className="meta">{edited ? "No usual times. The line stays off on these days." : "Not enough meals logged to learn your times yet. Add one?"}</p>
              : times.map(({ minute, days }, i) => (
                <div key={`${minute}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span className="meta">{days === null ? "Yours" : `From your logs, ${days} days`}</span>
                    <input className="input" type="time" aria-label={`${KIND_LABEL[kind]} usual time ${i + 1}`} value={minuteClock(minute)}
                      onChange={(e) => { const m = minuteFromClock(e.target.value); if (m !== null) editKind(kind, times.map((t, j) => (j === i ? m : t.minute))); }} />
                  </label>
                  <button type="button" className="chip" aria-label={`Delete ${KIND_LABEL[kind]} usual time ${minuteClock(minute)}`}
                    onClick={() => editKind(kind, times.filter((_, j) => j !== i).map((t) => t.minute))}>DELETE</button>
                </div>
              ))}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              {times.length < NUDGE_MAX_TIMES && <button type="button" className="chip" aria-label={`Add a ${KIND_LABEL[kind]} usual time`}
                onClick={() => { const last = times.at(-1)?.minute; editKind(kind, [...times.map((t) => t.minute), last === undefined ? minuteFromClock("12:00")! : Math.min(1439, last + 180)]); }}>ADD TIME</button>}
              {edited && <button type="button" className="chip" aria-label={`Reset ${KIND_LABEL[kind]} to learned times`} onClick={() => reset(kind)}>RESET</button>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
