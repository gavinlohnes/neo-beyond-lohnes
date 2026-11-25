import { useEffect, useRef, useState } from "react";
import {
  addWorkRecord, changeWorkRecord, getLatestStandards, getNextSwapsAndOt, getWorkRecords, markWorkDateDone,
  readWorkRecordSettings, removeWorkRecord, renewCertification, restoreWorkRecord, trainingHoursSummary,
  writeWorkRecordSettings, type WorkRecordSettings,
} from "../../../application/workRecords";
import {
  TWO_YEAR_MARK, WORK_DATE_TYPES, WORK_DATE_TYPE_LABEL, WORK_RECORD_KINDS, WORK_RECORD_KIND_LABEL, WORK_TITLE_MAX, WORK_NOTE_MAX,
  clockTime, dayKey, daysBetween, fieldsOf, remindsKind, shortDate, workDueItems, type RemindKind, type WorkRecord, type WorkRecordFields,
  type WorkRecordKind,
} from "../../../domain/workRecords";
import type { ScheduleException } from "../../../domain/scheduleExceptions";
import { STANDARD_TEST, formatStandardValue, standardDate, type StandardResult } from "../../../domain/workout/standardTests";
import "./workRecord.css";

/**
 * GRAYSON-WORK-RECORD-001 (C2.7): MORE · Work record. Coming up (next 60 days, all kinds), Training hours (this year,
 * with his goal line), Certifications (soonest expiry first), Fitness standards (read from TRAIN, never stored here),
 * a "Swaps and OT" link, and Removed. Every field is his to edit; REMOVE shows UNDO; his goal, year start and per-kind
 * reminder days are under "Your settings". Nothing is saved until he taps SAVE, ADD, DONE or RENEWED.
 */
const plain = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Z_]+: /, "") : "That couldn't be saved. Nothing changed.");
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const REMIND_LABEL: Record<RemindKind, string> = { WORK_DATE: "Court and training dates", CERTIFICATION: "Certifications (before expiry)", MILESTONE: "Milestones" };

function describe(r: WorkRecord, today: string): string {
  const remind = remindsKind(r.kind) ? (r.remind === false ? " · Remind me off" : ` · Remind ${r.remindDays} ${r.remindDays === 1 ? "day" : "days"} before`) : "";
  if (r.kind === "TRAINING") return `${shortDate(r.date!, today)} · ${r.hours} ${r.hours === 1 ? "hour" : "hours"}${r.note ? ` · ${r.note}` : ""}`;
  if (r.kind === "CERTIFICATION") {
    const earned = r.earnedOn ? `Earned ${shortDate(r.earnedOn, today)}` : "";
    const exp = r.expiresOn ? (r.expiresOn < today ? `expired ${shortDate(r.expiresOn, today)}` : `expires ${shortDate(r.expiresOn, today)}`) : "no expiry";
    return `${earned ? `${earned} · ` : ""}${exp}${r.expiresOn ? remind : ""}`;
  }
  if (r.kind === "WORK_DATE") return `${WORK_DATE_TYPE_LABEL[r.workType ?? "OTHER"]} · ${shortDate(r.date!, today)}${r.time ? ` ${clockTime(r.time)}` : ""}${r.doneAt ? " · done" : ""}${remind}`;
  return `${shortDate(r.date!, today)}${remind}`;
}

function blank(kind: WorkRecordKind, settings: WorkRecordSettings, today: string): WorkRecordFields {
  if (kind === "TRAINING") return { kind, title: "", date: today, hours: 1 };
  if (kind === "CERTIFICATION") return { kind, title: "", remind: true, remindDays: settings.remindDays.CERTIFICATION };
  if (kind === "WORK_DATE") return { kind, title: "", date: today, workType: "COURT", remind: true, remindDays: settings.remindDays.WORK_DATE };
  return { kind, title: "", date: today, remind: true, remindDays: settings.remindDays.MILESTONE };
}

export function WorkRecordScreen({ active = true, focusId = null, onOpenSchedule, onOpenTrain, now: fixedNow }: {
  active?: boolean;
  /** TODAY's WORK_DUE line opened this item. */
  focusId?: string | null;
  onOpenSchedule?: () => void;
  onOpenTrain?: () => void;
  now?: Date;
}) {
  const [records, setRecords] = useState<WorkRecord[] | null>(null);
  const [standards, setStandards] = useState<StandardResult[]>([]);
  const [swaps, setSwaps] = useState<ScheduleException[]>([]);
  const [settings, setSettings] = useState<WorkRecordSettings>(() => readWorkRecordSettings());
  const [form, setForm] = useState<{ id: string | null; fields: WorkRecordFields } | null>(null);
  const [picking, setPicking] = useState(false);
  const [renew, setRenew] = useState<{ id: string; expiresOn: string } | null>(null);
  const [undo, setUndo] = useState<WorkRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<{ goal: string; month: number; days: Record<RemindKind, string> } | null>(null);
  const [tick, setTick] = useState(0);
  const offered = useRef(false);
  const now = fixedNow ?? new Date();
  const today = dayKey(now);

  useEffect(() => {
    if (!active) return;
    let live = true;
    void Promise.all([getWorkRecords(), getLatestStandards().catch(() => []), getNextSwapsAndOt(now).catch(() => [])]).then(([r, s, x]) => {
      if (!live) return;
      setRecords(r); setStandards(s); setSwaps(x);
      // The two-year mark is offered once: the first time he opens Work record, unless he already has it.
      if (!offered.current) {
        offered.current = true;
        const current = readWorkRecordSettings();
        const has = r.some((x2) => x2.kind === "MILESTONE" && x2.date === TWO_YEAR_MARK.date);
        if (!current.twoYearOfferShown && !has) { setOffer(true); setSettings(writeWorkRecordSettings({ ...current, twoYearOfferShown: true })); }
      }
    }, () => { if (live) setRecords([]); });
    return () => { live = false; };
  }, [active, tick]);

  useEffect(() => {
    if (!focusId || !records) return;
    const el = document.querySelector<HTMLElement>(`[data-work-record="${CSS.escape(focusId)}"]`);
    const folded = el?.closest("details"); if (folded) folded.open = true;
    el?.scrollIntoView({ block: "center" }); el?.focus();
  }, [focusId, records]);

  const run = (write: () => Promise<unknown>, after?: () => void) => {
    setSaving(true); setError(null);
    void write().then(() => { after?.(); setTick((n) => n + 1); }, (e: unknown) => setError(plain(e))).finally(() => setSaving(false));
  };

  if (!records) return <p className="empty-state">Loading work record...</p>;

  const activeRecords = records.filter((r) => r.status === "ACTIVE");
  const removed = records.filter((r) => r.status === "REMOVED").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sixty = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60, 12));
  const dueIds = new Set(workDueItems(activeRecords, today).map((d) => d.record.id));
  const keyDate = (r: WorkRecord) => (r.kind === "CERTIFICATION" ? r.expiresOn : r.date);
  const inWindow = (r: WorkRecord) => { const d = keyDate(r); return !!d && !(r.kind === "WORK_DATE" && r.doneAt) && ((d >= today && d <= sixty) || dueIds.has(r.id)); };
  const byDate = (a: WorkRecord, b: WorkRecord) => (keyDate(a) ?? "").localeCompare(keyDate(b) ?? "") || a.createdAt.localeCompare(b.createdAt);
  const comingUp = activeRecords.filter((r) => r.kind !== "TRAINING" && inWindow(r)).sort(byDate);
  // Work dates and milestones live under Coming up; the ones outside the next 60 days (later, past or done) wait below it.
  const otherDates = activeRecords.filter((r) => (r.kind === "WORK_DATE" || r.kind === "MILESTONE") && !inWindow(r)).sort(byDate);
  const summary = trainingHoursSummary(activeRecords, now, settings);
  const yearStart = (() => { const d = new Date(now.getFullYear(), settings.yearStartMonth - 1, 1, 12); if (d > now) d.setFullYear(d.getFullYear() - 1); return dayKey(d); })();
  const training = activeRecords.filter((r) => r.kind === "TRAINING" && r.date! >= yearStart).sort((a, b) => b.date!.localeCompare(a.date!) || b.createdAt.localeCompare(a.createdAt));
  const certs = activeRecords.filter((r) => r.kind === "CERTIFICATION").sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999"));

  const item = (r: WorkRecord) => {
    const editing = form?.id === r.id;
    const pastWorkDate = r.kind === "WORK_DATE" && !r.doneAt && daysBetween(today, r.date!) < 0;
    return <li key={r.id} className="work-record__item" data-work-record={r.id} tabIndex={-1} {...(focusId === r.id ? { "data-focused": "" } : {})} aria-label={r.title}>
      {editing ? <RecordForm fields={form.fields} saving={saving} submitLabel="SAVE" onChange={(fields) => setForm({ id: r.id, fields })}
        onSubmit={() => run(() => changeWorkRecord(r.id, form.fields), () => setForm(null))} onCancel={() => { setForm(null); setError(null); }} />
        : <>
          <p className="work-record__title">{r.title}</p>
          <p className="work-record__detail">{describe(r, today)}</p>
          {renew?.id === r.id ? <div className="work-record__form" role="group" aria-label="Renew">
              <label className="work-record__field">New expiry date
                <input className="input" type="date" value={renew.expiresOn} onChange={(e) => setRenew({ id: r.id, expiresOn: e.target.value })} /></label>
              <div className="work-record__actions">
                <button type="button" className="btn-primary" disabled={saving || !renew.expiresOn} onClick={() => run(() => renewCertification(r.id, renew.expiresOn), () => setRenew(null))}>SAVE</button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => setRenew(null)}>CANCEL</button>
              </div>
            </div>
            : <div className="work-record__actions">
              {pastWorkDate && <button type="button" className="btn-primary" disabled={saving} onClick={() => run(() => markWorkDateDone(r.id))}>DONE</button>}
              {r.kind === "CERTIFICATION" && <button type="button" className="btn-secondary" disabled={saving} onClick={() => setRenew({ id: r.id, expiresOn: r.expiresOn ?? "" })}>RENEWED</button>}
              <button type="button" className="btn-secondary" disabled={saving} aria-label={`Edit ${r.title}`} onClick={() => { setError(null); setRenew(null); setForm({ id: r.id, fields: fieldsOf(r) }); }}>EDIT</button>
              <button type="button" className="btn-secondary" disabled={saving} aria-label={`Remove ${r.title}`} onClick={() => run(() => removeWorkRecord(r.id), () => setUndo(r))}>REMOVE</button>
            </div>}
        </>}
    </li>;
  };

  return <div className="work-record fade-in" data-work-record-screen>
    <p className="card-body">Training hours, certifications, court and training dates, and milestones, beside your swaps and OT.</p>
    {!form || form.id ? (picking
      ? <div className="work-record__kinds" role="group" aria-label="Pick a kind">
          {WORK_RECORD_KINDS.map((kind) => <button key={kind} type="button" className="btn-secondary" onClick={() => { setPicking(false); setError(null); setForm({ id: null, fields: blank(kind, settings, today) }); }}>{WORK_RECORD_KIND_LABEL[kind].toUpperCase()}</button>)}
          <button type="button" className="btn-secondary" onClick={() => setPicking(false)}>CANCEL</button>
        </div>
      : <div><button type="button" className="btn-primary" onClick={() => { setForm(null); setPicking(true); }}>ADD</button></div>)
      : <section className="card work-record__section" aria-label={`Add ${WORK_RECORD_KIND_LABEL[form.fields.kind].toLowerCase()}`}>
          <h2 className="card-title">Add {WORK_RECORD_KIND_LABEL[form.fields.kind].toLowerCase()}</h2>
          <RecordForm fields={form.fields} saving={saving} submitLabel="SAVE" onChange={(fields) => setForm({ id: null, fields })}
            onSubmit={() => run(() => addWorkRecord(form.fields), () => setForm(null))} onCancel={() => { setForm(null); setError(null); }} />
        </section>}
    {error && <p className="work-record__error" role="alert">{error}</p>}
    {undo && <p className="meta" role="status">Removed {undo.title}. <button type="button" className="btn-secondary" disabled={saving} onClick={() => run(() => restoreWorkRecord(undo.id), () => setUndo(null))}>UNDO</button></p>}

    {offer && <div className="work-record__item" role="group" aria-label="Two-year mark">
      <p className="work-record__title">Add your two-year mark, {shortDate(TWO_YEAR_MARK.date)}, {TWO_YEAR_MARK.date.slice(0, 4)}?</p>
      <div className="work-record__actions">
        <button type="button" className="btn-primary" disabled={saving} onClick={() => run(() => addWorkRecord({ kind: "MILESTONE", title: TWO_YEAR_MARK.title, date: TWO_YEAR_MARK.date, remind: true }), () => setOffer(false))}>ADD</button>
      </div>
    </div>}

    <section className="work-record__section" aria-labelledby="wr-coming">
      <h2 className="section-label" id="wr-coming">Coming up</h2>
      {comingUp.length ? <ul className="work-record__list">{comingUp.map((r) => r.kind === "CERTIFICATION"
        // A certification's own row is under Certifications; here it is named once, with where to find it.
        ? <li key={r.id} className="work-record__item" aria-label={`${r.title} (coming up)`}>
            <p className="work-record__title">{r.title}</p>
            <p className="work-record__detail">{describe(r, today)} · under Certifications</p>
          </li>
        : item(r))}</ul> : <p className="meta">Nothing in the next 60 days.</p>}
      {otherDates.length > 0 && <details>
        <summary className="section-label">Later and past dates ({otherDates.length})</summary>
        <ul className="work-record__list">{otherDates.map(item)}</ul>
      </details>}
    </section>

    <section className="work-record__section" aria-labelledby="wr-training">
      <h2 className="section-label" id="wr-training">Training hours</h2>
      <p className="work-record__goal" data-work-hours>{summary.line}</p>
      {settings.goalHours === null && <p className="meta"><button type="button" className="btn-secondary" onClick={() => setSettingsDraft(draftOf(settings))}>Set your yearly goal</button></p>}
      {training.length ? <ul className="work-record__list">{training.map(item)}</ul> : <p className="meta">No training hours this year yet.</p>}
    </section>

    <section className="work-record__section" aria-labelledby="wr-certs">
      <h2 className="section-label" id="wr-certs">Certifications</h2>
      {certs.length ? <ul className="work-record__list">{certs.map(item)}</ul> : <p className="meta">No certifications yet.</p>}
    </section>

    <section className="work-record__section" aria-labelledby="wr-standards">
      <h2 className="section-label" id="wr-standards">Fitness standards</h2>
      {standards.length ? <ul className="work-record__list">{standards.map((s) => <li key={s.eventId} className="work-record__item">
          <p className="work-record__title">{STANDARD_TEST[s.test].name}</p>
          <p className="work-record__detail">{formatStandardValue(s.test, s.value)} · {standardDate(s.at)}</p>
        </li>)}</ul> : <p className="meta">No standards results yet. TRAIN keeps them.</p>}
      {onOpenTrain && <div className="work-record__actions"><button type="button" className="btn-secondary" onClick={onOpenTrain}>OPEN IN TRAIN</button></div>}
    </section>

    <section className="work-record__section" aria-labelledby="wr-swaps">
      <h2 className="section-label" id="wr-swaps">Swaps and OT</h2>
      {swaps.length ? <ul className="work-record__list">{swaps.map((x) => <li key={x.id} className="work-record__detail">
          {shortDate(x.date, today)}: {x.reason === "SWAP" ? `swap (${x.kind === "WORK" ? "work" : "off"})` : x.kind === "WORK" ? "overtime (work)" : "time off"}
        </li>)}</ul> : <p className="meta">No confirmed swaps or OT coming up.</p>}
      {onOpenSchedule && <div className="work-record__actions"><button type="button" className="btn-secondary" onClick={onOpenSchedule}>OPEN WORK SCHEDULE</button></div>}
    </section>

    {removed.length > 0 && <details className="work-record__section">
      <summary className="section-label">Removed ({removed.length})</summary>
      <ul className="work-record__list">{removed.map((r) => <li key={r.id} className="work-record__item" aria-label={r.title}>
        <p className="work-record__title">{r.title}</p>
        <p className="work-record__detail">{WORK_RECORD_KIND_LABEL[r.kind]} · {describe(r, today)}</p>
        <div className="work-record__actions"><button type="button" className="btn-secondary" disabled={saving} aria-label={`Restore ${r.title}`} onClick={() => run(() => restoreWorkRecord(r.id))}>RESTORE</button></div>
      </li>)}</ul>
    </details>}

    <section className="work-record__section" aria-labelledby="wr-settings">
      <h2 className="section-label" id="wr-settings">Your settings</h2>
      {!settingsDraft ? <>
        <p className="meta">Yearly goal: {settings.goalHours === null ? "not set" : `${settings.goalHours} hours`} · Year starts in {MONTH_NAMES[settings.yearStartMonth - 1]}</p>
        <p className="meta">Remind me before: {(Object.keys(REMIND_LABEL) as RemindKind[]).map((k) => `${REMIND_LABEL[k]} ${settings.remindDays[k]} days`).join(" · ")}</p>
        <p className="meta">Whether "Work record due" shows on TODAY, and where, is in MORE → Settings → TODAY.</p>
        <div className="work-record__actions"><button type="button" className="btn-secondary" onClick={() => setSettingsDraft(draftOf(settings))}>CHANGE SETTINGS</button></div>
      </> : <div className="work-record__form" role="group" aria-label="Work record settings">
        <label className="work-record__field">Yearly training-hours goal (blank for none)
          <input className="input" inputMode="decimal" value={settingsDraft.goal} onChange={(e) => setSettingsDraft({ ...settingsDraft, goal: e.target.value })} /></label>
        <label className="work-record__field">Training year starts in
          <select className="input" value={settingsDraft.month} onChange={(e) => setSettingsDraft({ ...settingsDraft, month: Number(e.target.value) })}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select></label>
        {(Object.keys(REMIND_LABEL) as RemindKind[]).map((k) => <label key={k} className="work-record__field">{REMIND_LABEL[k]}: days before, for new items
          <input className="input" inputMode="numeric" value={settingsDraft.days[k]} onChange={(e) => setSettingsDraft({ ...settingsDraft, days: { ...settingsDraft.days, [k]: e.target.value } })} /></label>)}
        <div className="work-record__actions">
          <button type="button" className="btn-primary" onClick={() => {
            setError(null);
            try {
              const goal = settingsDraft.goal.trim() === "" ? null : Number(settingsDraft.goal);
              const days = Object.fromEntries((Object.keys(settingsDraft.days) as RemindKind[]).map((k) => [k, Number(settingsDraft.days[k])])) as Record<RemindKind, number>;
              setSettings(writeWorkRecordSettings({ ...readWorkRecordSettings(), goalHours: goal, yearStartMonth: settingsDraft.month, remindDays: days }));
              setSettingsDraft(null);
            } catch (e) { setError(plain(e)); }
          }}>SAVE SETTINGS</button>
          <button type="button" className="btn-secondary" onClick={() => { setSettingsDraft(null); setError(null); }}>CANCEL</button>
        </div>
      </div>}
    </section>
  </div>;
}

function draftOf(s: WorkRecordSettings) {
  return { goal: s.goalHours === null ? "" : String(s.goalHours), month: s.yearStartMonth, days: { WORK_DATE: String(s.remindDays.WORK_DATE), CERTIFICATION: String(s.remindDays.CERTIFICATION), MILESTONE: String(s.remindDays.MILESTONE) } };
}

/** One form for every kind: only the fields its kind uses. */
function RecordForm({ fields, onChange, onSubmit, onCancel, saving, submitLabel }: {
  fields: WorkRecordFields; onChange: (f: WorkRecordFields) => void; onSubmit: () => void; onCancel: () => void; saving: boolean; submitLabel: string;
}) {
  const set = (patch: { [K in keyof WorkRecordFields]?: WorkRecordFields[K] | undefined }) => {
    const next = { ...fields, ...patch } as WorkRecordFields & Record<string, unknown>;
    for (const [k, v] of Object.entries(patch)) if (v === undefined || v === "") delete next[k];
    onChange(next);
  };
  const cert = fields.kind === "CERTIFICATION";
  return <form className="work-record__form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
    <label className="work-record__field">{cert ? "Name" : "Title"}
      <input className="input" value={fields.title} maxLength={WORK_TITLE_MAX} placeholder={cert ? "like CPR card" : "a short title, like Court"} onChange={(e) => onChange({ ...fields, title: e.target.value })} /></label>
    {!cert && <label className="work-record__field">Date
      <input className="input" type="date" value={fields.date ?? ""} onChange={(e) => set({ date: e.target.value })} /></label>}
    {fields.kind === "TRAINING" && <>
      <label className="work-record__field">Hours
        <input className="input" type="number" min={0.25} max={24} step={0.25} value={fields.hours ?? ""} onChange={(e) => set({ hours: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
      <label className="work-record__field">Note (optional)
        <input className="input" value={fields.note ?? ""} maxLength={WORK_NOTE_MAX} onChange={(e) => set({ note: e.target.value })} /></label>
    </>}
    {cert && <>
      <label className="work-record__field">Earned (optional)
        <input className="input" type="date" value={fields.earnedOn ?? ""} onChange={(e) => set({ earnedOn: e.target.value })} /></label>
      <label className="work-record__field">Expires (optional)
        <input className="input" type="date" value={fields.expiresOn ?? ""} onChange={(e) => set({ expiresOn: e.target.value })} /></label>
    </>}
    {fields.kind === "WORK_DATE" && <>
      <label className="work-record__field">Start time (optional)
        <input className="input" type="time" value={fields.time ?? ""} onChange={(e) => set({ time: e.target.value })} /></label>
      <label className="work-record__field">Type
        <select className="input" value={fields.workType ?? "COURT"} onChange={(e) => set({ workType: e.target.value as WorkRecordFields["workType"] })}>
          {WORK_DATE_TYPES.map((t) => <option key={t} value={t}>{WORK_DATE_TYPE_LABEL[t]}</option>)}
        </select></label>
    </>}
    {remindsKind(fields.kind) && <div className="work-record__inline">
      <button type="button" className={`chip${fields.remind !== false ? " chip--selected" : ""}`} aria-pressed={fields.remind !== false} onClick={() => onChange({ ...fields, remind: fields.remind === false })}>REMIND ME</button>
      {fields.remind !== false && <label className="work-record__inline">
        <input className="input work-record__days" type="number" min={0} max={365} step={1} aria-label="Days before" value={fields.remindDays ?? ""} onChange={(e) => set({ remindDays: e.target.value === "" ? undefined : Number(e.target.value) })} />
        <span>days before</span></label>}
    </div>}
    <div className="work-record__actions">
      <button type="submit" className="btn-primary" disabled={saving}>{submitLabel}</button>
      <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>CANCEL</button>
    </div>
  </form>;
}
