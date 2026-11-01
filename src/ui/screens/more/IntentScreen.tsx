import { captureCommitFeedback } from "../../feel/feedback";
import { useEffect, useRef, useState, useId } from "react";
import { useSessionDraft } from "../../sessionDrafts";
import type { DomainEvent } from "../../../domain/common/types";
import type { Mission, Obligation, ObligationStatus, RecurrenceRule } from "../../../domain/intent/types";
import {
  getMissionHistory,
  getMissions,
  getObligationHistory,
  getObligations,
  getObligationsForMission,
  getUnresolvedObligations,
} from "../../../application/intentQueries";
import {
  archiveMission,
  createMission,
  createObligation,
  markObligationOpen,
  markObligationWaiting,
  modifyMission,
  modifyObligation,
  releaseObligation,
  satisfyObligation,
} from "../../../application/intentCommands";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { ProjectsSection } from "./ProjectsSection";
import { saveObligationEdits } from "../../../application/projectCommands";
import { getProjects } from "../../../application/projectQueries";
import type { Project } from "../../../domain/intent/types";
import {
  buildRecurrenceRule,
  describeRecurrence,
  parseRecurrencePreset,
  type RecurrenceFreq,
} from "../../../engine/recurrence";
import { formatLocalDate } from "../../../engine/scheduledContext";
import { describeError } from "../../errorMessage";

/** INTENT-002: shared create/edit picker state — "" means "does not repeat". */
export interface RecurrenceFormState {
  freq: "" | RecurrenceFreq;
  interval: string;
  byDay: string[];
}

export const EMPTY_RECURRENCE: RecurrenceFormState = { freq: "", interval: "1", byDay: [] };

function recurrenceFormFor(recurrence: RecurrenceRule | undefined): RecurrenceFormState {
  if (!recurrence) return EMPTY_RECURRENCE;
  const preset = parseRecurrencePreset(recurrence.rrule);
  if (!preset) return EMPTY_RECURRENCE;
  return { freq: preset.freq, interval: String(preset.interval), byDay: preset.byDay ?? [] };
}

/** Builds the stored RecurrenceRule from picker state, or undefined for "does not repeat". `anchor` should be the obligation's own dueAt, falling back to today when none is set. */
/** Whether two recurrence forms mean the same rule ("Does not repeat" ignores the hidden fields). */
export function sameRecurrence(a: RecurrenceFormState, b: RecurrenceFormState): boolean {
  if (!a.freq && !b.freq) return true;
  return a.freq === b.freq && a.interval === b.interval && a.byDay.join(",") === b.byDay.join(",");
}

export function recurrenceInputFor(form: RecurrenceFormState, anchor: string): RecurrenceRule | undefined {
  if (!form.freq) return undefined;
  const interval = Math.max(1, parseInt(form.interval, 10) || 1);
  const rrule = buildRecurrenceRule({
    freq: form.freq,
    interval,
    ...(form.freq === "WEEKLY" && form.byDay.length > 0 ? { byDay: form.byDay } : {}),
    anchor,
  });
  return { rrule };
}

const WEEKDAY_OPTIONS: { code: string; label: string }[] = [
  { code: "MO", label: "Mon" },
  { code: "TU", label: "Tue" },
  { code: "WE", label: "Wed" },
  { code: "TH", label: "Thu" },
  { code: "FR", label: "Fri" },
  { code: "SA", label: "Sat" },
  { code: "SU", label: "Sun" },
];

export function RecurrencePicker({
  form,
  onChange,
  idPrefix,
  disabled,
}: {
  form: RecurrenceFormState;
  onChange: (next: RecurrenceFormState) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label htmlFor={`${idPrefix}-freq`} className="meta" style={{ display: "block", marginBottom: 4 }}>Repeats</label>
      <select
        id={`${idPrefix}-freq`}
        className="input"
        style={{ marginBottom: 8 }}
        value={form.freq}
        disabled={disabled}
        onChange={(e) => onChange({ ...form, freq: e.target.value as RecurrenceFormState["freq"] })}
      >
        <option value="">Does not repeat</option>
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
      </select>
      {form.freq && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="meta">Every</span>
            <input
              type="number"
              min={1}
              className="input"
              style={{ width: 64 }}
              aria-label="Recurrence interval"
              value={form.interval}
              disabled={disabled}
              onChange={(e) => onChange({ ...form, interval: e.target.value })}
            />
            <span className="meta">
              {form.freq === "DAILY" ? "day(s)" : form.freq === "WEEKLY" ? "week(s)" : "month(s)"}
            </span>
          </div>
          {form.freq === "WEEKLY" && (
            <div role="group" aria-label="Repeat on these days" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {WEEKDAY_OPTIONS.map((day) => {
                const selected = form.byDay.includes(day.code);
                return (
                  <button
                    key={day.code}
                    type="button"
                    aria-pressed={selected}
                    className={`chip ${selected ? "chip--selected" : ""}`}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...form,
                        byDay: selected ? form.byDay.filter((c) => c !== day.code) : [...form.byDay, day.code],
                      })
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Intent & Commitment Spine — Drop 01 (approved 2026-08-22). The one
 * dedicated Mission/Obligation management surface required by the spec
 * (section 12) — reachable from MORE, not a new primary bottom-nav
 * destination, and deliberately not a redesign of anything else. Every
 * mutation goes through application/intentCommands.ts; nothing here
 * writes to Dexie directly.
 */

type DetailView = { kind: "MISSION_DETAIL"; missionId: string } | { kind: "OBLIGATION_DETAIL"; obligationId: string };
type View = { kind: "LIST" } | DetailView;

function detailKey(view: DetailView): string {
  return view.kind === "MISSION_DETAIL" ? `mission-${view.missionId}` : `obligation-${view.obligationId}`;
}

/** Search-to-navigate (2026-09-02): lets a caller (MoreScreen, from a Search result) open
 * straight to a specific Mission/Obligation's detail view instead of always starting at LIST.
 * Consumed once, at mount, via the `view` state's lazy initializer below — this is deliberately
 * not a controlled prop IntentScreen keeps re-syncing to, so normal in-screen navigation (e.g.
 * BACK to LIST) behaves exactly as it always has once the initial focus has been applied. */
export type IntentFocus =
  | { kind: "MISSION"; missionId: string }
  | { kind: "OBLIGATION"; obligationId: string };

function initialViewFor(focus: IntentFocus | undefined): View {
  if (!focus) return { kind: "LIST" };
  return focus.kind === "MISSION"
    ? { kind: "MISSION_DETAIL", missionId: focus.missionId }
    : { kind: "OBLIGATION_DETAIL", obligationId: focus.obligationId };
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ");
}

function HistoryList({ events }: { events: DomainEvent[] }) {
  if (events.length === 0) return <p className="meta">No history yet.</p>;
  return (
    <>
      {events.map((e) => (
        <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderTop: "1px solid var(--border-subtle)" }}>
          <span className="meta">{formatEventType(e.type)}</span>
          <span className="meta">{new Date(e.occurredAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
        </div>
      ))}
    </>
  );
}

function IntentItemRow({
  kind,
  status,
  title,
  description,
  summary,
  onOpen,
}: {
  kind: "MISSION" | "OBLIGATION";
  status: Mission["status"] | ObligationStatus;
  title: string;
  description?: string;
  summary: string;
  onOpen: () => void;
}) {
  const historical = status === "ARCHIVED" || status === "SATISFIED" || status === "RELEASED";
  return (
    <button
      type="button"
      className={`intent-item intent-item--${kind.toLowerCase()}${historical ? " intent-item--historical" : ""}`}
      aria-label={`Open ${title}`}
      onClick={onOpen}
    >
      <span className="intent-item__body">
        <span className="intent-item__identity">
          <span>{kind}</span>
          <span className="intent-state" data-status={status}>{status}</span>
        </span>
        <span className="intent-item__title">{title}</span>
        {description && <span className="intent-item__description">{description}</span>}
        <span className="meta intent-item__summary">{summary}</span>
      </span>
      <span aria-hidden="true" className="disclosure-chevron">›</span>
    </button>
  );
}

export function IntentScreen({ initialFocus, navigationFocus, active = true, onDraftChange }: { initialFocus?: IntentFocus; navigationFocus?: IntentFocus | null; active?: boolean; onDraftChange?: (hasDraft: boolean) => void } = {}) {
  const [view, setView] = useState<View>(() => initialViewFor(initialFocus));
  // Review of #362: unique ids, so a second copy (LIFE and MORE) never points a label at the hidden one.
  const uid = useId();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [showAllObligations, setShowAllObligations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missionCreateOpen, setMissionCreateOpen] = useState(false);
  const [obligationCreateOpen, setObligationCreateOpen] = useState(false);
  const [guided, setGuided] = useState<"MISSION" | "OBLIGATION" | null>(null);
  const missionTitleRef = useRef<HTMLInputElement>(null);
  const obligationTitleRef = useRef<HTMLInputElement>(null);
  const readSequence = useRef(0);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [readError, setReadError] = useState("");
  const [projectsKey, setProjectsKey] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newObligationTitle, setNewObligationTitle] = useState("");
  const [newObligationMissionId, setNewObligationMissionId] = useState("");
  const [newObligationDueAt, setNewObligationDueAt] = useState("");
  const [newObligationPlannedAt, setNewObligationPlannedAt] = useState("");
  const [newObligationRecurrence, setNewObligationRecurrence] = useState<RecurrenceFormState>(EMPTY_RECURRENCE);

  const missionCreateDirty = newMissionTitle.length > 0;
  const obligationCreateDirty = [newObligationTitle, newObligationMissionId, newObligationDueAt, newObligationPlannedAt].some((value) => value.length > 0)
    || !sameRecurrence(newObligationRecurrence, EMPTY_RECURRENCE);
  // DAILY-EXPERIENCE-001 review blocker 2: reload/update warnings cover these drafts too.
  useSessionDraft("intent-create-mission", missionCreateDirty);
  useSessionDraft("intent-create-obligation", obligationCreateDirty);
  useEffect(() => {
    onDraftChange?.(missionCreateDirty || obligationCreateDirty);
  }, [onDraftChange, missionCreateDirty, obligationCreateDirty]);

  // DAILY-EXPERIENCE-001 review blocker 1: every visited record detail stays mounted
  // (hidden when not shown), as Journal entries do, so an unfinished edit on record A
  // survives opening record B and coming back. Values are never persisted.
  const [visitedDetails, setVisitedDetails] = useState<DetailView[]>(() => (view.kind === "LIST" ? [] : [view]));
  useEffect(() => {
    if (view.kind === "LIST") return;
    setVisitedDetails((current) => (current.some((d) => detailKey(d) === detailKey(view)) ? current : [...current, view]));
  }, [view]);

  // MORE can navigate to a record or the list without remounting and discarding
  // unfinished creation text. Standalone initialFocus keeps its mount-only contract.
  useEffect(() => {
    if (active && navigationFocus !== undefined) setView(initialViewFor(navigationFocus ?? undefined));
  }, [navigationFocus]);

  useEffect(() => {
    if (active) void refreshList();
    return () => { ++readSequence.current; };
  }, [showAllMissions, showAllObligations, active]);

  useEffect(() => {
    if (!active || view.kind !== "LIST") return;
    if (guided === "MISSION" && missionCreateOpen) missionTitleRef.current?.focus();
    if (guided === "OBLIGATION" && obligationCreateOpen) obligationTitleRef.current?.focus();
  }, [guided, missionCreateOpen, obligationCreateOpen, active, view.kind]);

  /**
   * Drop 01 acceptance correction (real-device evidence, 2026-08-22): the
   * default Missions surface represents current/active direction — an
   * ARCHIVED mission is historical truth, not deleted, but must not sit
   * in the default list forever. Same progressive-disclosure shape
   * Obligations already used (UNRESOLVED/ALL); archiveMission's own
   * one-way ACTIVE->ARCHIVED semantics are unchanged — this is a query/
   * presentation fix only.
   */
  async function refreshList() {
    const sequence = ++readSequence.current;
    setReadState("loading");
    setReadError("");
    try {
      const [everyMission, nextObligations, everyProject] = await Promise.all([getMissions(), showAllObligations ? getObligations() : getUnresolvedObligations(),
        // PROJECTS-001 review: a projects read failure is shown by ProjectsSection itself, not here.
        getProjects().catch(() => [])]);
      if (sequence !== readSequence.current) return;
      setProjects(everyProject); setProjectsKey((k) => k + 1);
      setAllMissions(everyMission);
      setMissions(showAllMissions ? everyMission : everyMission.filter((mission) => mission.status === "ACTIVE"));
      setObligations(nextObligations);
      setReadState("ready");
    } catch (cause) {
      if (sequence !== readSequence.current) return;
      setReadState("error");
      setReadError(describeError(cause, "Could not read plans."));
    }
  }

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(describeError(e, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateMission() {
    if (!newMissionTitle.trim()) return;
    await withBusy(async () => {
    const acknowledge = captureCommitFeedback();
      await createMission({ title: newMissionTitle.trim() });
      acknowledge("LIGHT");
      setNewMissionTitle("");
      setMissionCreateOpen(false);
      await refreshList();
    });
  }

  async function handleCreateObligation() {
    if (!newObligationTitle.trim()) return;
    await withBusy(async () => {
    const acknowledge = captureCommitFeedback();
      const anchor = newObligationDueAt || formatLocalDate(new Date());
      const recurrence = recurrenceInputFor(newObligationRecurrence, anchor);
      await createObligation({
        title: newObligationTitle.trim(),
        ...(newObligationMissionId ? { missionId: newObligationMissionId } : {}),
        ...(newObligationDueAt ? { dueAt: newObligationDueAt } : {}),
        ...(newObligationPlannedAt ? { plannedAt: newObligationPlannedAt } : {}),
        ...(recurrence ? { recurrence } : {}),
      });
      acknowledge("LIGHT");
      setNewObligationTitle("");
      setNewObligationMissionId("");
      setNewObligationDueAt("");
      setNewObligationPlannedAt("");
      setNewObligationRecurrence(EMPTY_RECURRENCE);
      setObligationCreateOpen(false);
      await refreshList();
    });
  }

  const backToList = () => {
    setView({ kind: "LIST" });
    void refreshList();
  };
  const currentKey = view.kind === "LIST" ? null : detailKey(view);

  return (
    <>
    {visitedDetails.map((detail) => {
      const key = detailKey(detail);
      const shown = key === currentKey;
      return (
        <div key={key} hidden={!shown}>
          {detail.kind === "MISSION_DETAIL"
            ? <MissionDetail active={active && shown} missionId={detail.missionId} onBack={backToList} />
            : <ObligationDetail active={active && shown} obligationId={detail.obligationId} missions={allMissions} projects={projects} onBack={backToList} />}
        </div>
      );
    })}
    {view.kind === "LIST" && <div className="intent-field">
      <header className="intent-field__intro">
        <p className="tool-label">INTENT FIELD</p>
        <p className="card-body">Missions hold durable direction. Obligations hold commitments that require deliberate resolution.</p>
      </header>

      <details className="writing-start">
        <summary>Start a plan or a task</summary>
        <p>A Mission is direction you want to keep. An Obligation is a concrete commitment you will deliberately resolve. Neither is a workout prescription.</p>
        <div className="writing-start__choices">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setGuided("MISSION"); setMissionCreateOpen(true); }}>GUIDE A MISSION</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setGuided("OBLIGATION"); setObligationCreateOpen(true); }}>GUIDE A TASK</button>
        </div>
      </details>
      {readState === "loading" && <p role="status">Reading plans…</p>}
      {readState === "error" && <div><p role="alert">{readError} Lists are unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refreshList()}>RETRY PLANS</button></div>}

      <section aria-labelledby={`${uid}-missions`}>
      <h2 id={`${uid}-missions`} className="section-label">Missions · durable direction</h2>
      <div className="intent-filter" role="group" aria-label="Mission visibility">
        <button aria-pressed={!showAllMissions} className={`chip ${!showAllMissions ? "chip--selected" : ""}`} onClick={() => setShowAllMissions(false)}>
          ACTIVE
        </button>
        <button aria-pressed={showAllMissions} className={`chip ${showAllMissions ? "chip--selected" : ""}`} onClick={() => setShowAllMissions(true)}>
          ALL / ARCHIVED
        </button>
      </div>
      {readState === "ready" && missions.length === 0 && <p className="empty-state">{showAllMissions ? "No missions yet." : "No active missions."}</p>}
      {readState === "ready" && missions.map((m) => (
        <IntentItemRow
          key={m.id}
          kind="MISSION"
          status={m.status}
          title={m.title}
          {...(m.description ? { description: m.description } : {})}
          summary={m.status === "ARCHIVED" ? "Historical direction · no longer active" : "Current direction"}
          onOpen={() => setView({ kind: "MISSION_DETAIL", missionId: m.id })}
        />
      ))}
      <div className="intent-create">
      <FieldDisclosure summary="CREATE MISSION" open={missionCreateOpen} onToggle={setMissionCreateOpen}>
        {guided === "MISSION" && <div className="writing-start"><p>What direction would you like to keep returning to? Name it in your own words. No dates, tasks or plans are created automatically.</p><button type="button" className="btn-secondary" onClick={() => setGuided(null)}>WRITE WITHOUT GUIDANCE</button></div>}
        <p className="card-body" style={{ marginBottom: 12 }}>Create durable direction—not a task or recommendation.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={missionTitleRef}
            type="text"
            className="input"
            style={{ flex: 1 }}
            aria-label="New mission title"
            placeholder="What is this mission?"
            value={newMissionTitle}
            disabled={busy}
            onChange={(e) => setNewMissionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateMission();
            }}
          />
          <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy || !newMissionTitle.trim()} onClick={() => void handleCreateMission()}>
            CREATE
          </button>
        </div>
      </FieldDisclosure>
      </div>
      </section>

      <ProjectsSection missions={allMissions} refreshKey={projectsKey} active={active} onChanged={() => void refreshList()} onOpenObligation={(id) => setView({ kind: "OBLIGATION_DETAIL", obligationId: id })} />

      <section aria-labelledby={`${uid}-obligations`}>
      <h2 id={`${uid}-obligations`} className="section-label">Obligations · commitments</h2>
      <div className="intent-filter" role="group" aria-label="Obligation visibility">
        <button aria-pressed={!showAllObligations} className={`chip ${!showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(false)}>
          UNRESOLVED
        </button>
        <button aria-pressed={showAllObligations} className={`chip ${showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(true)}>
          ALL / RESOLVED
        </button>
      </div>
      {readState === "ready" && obligations.length === 0 && <p className="empty-state">Nothing here.</p>}
      {readState === "ready" && obligations.map((o) => (
        <IntentItemRow
          key={o.id}
          kind="OBLIGATION"
          status={o.status}
          title={o.title}
          {...(o.description ? { description: o.description } : {})}
          summary={describeObligationSummary(o, allMissions, projects)}
          onOpen={() => setView({ kind: "OBLIGATION_DETAIL", obligationId: o.id })}
        />
      ))}
      <div className="intent-create">
      <FieldDisclosure summary="CREATE OBLIGATION" open={obligationCreateOpen} onToggle={setObligationCreateOpen}>
        {guided === "OBLIGATION" && <div className="writing-start"><p>Name one concrete commitment. A due date, planned date, Mission and repetition are optional—leave them blank unless they are true. Nothing is saved until CREATE OBLIGATION.</p><button type="button" className="btn-secondary" onClick={() => setGuided(null)}>WRITE WITHOUT GUIDANCE</button></div>}
        <p className="card-body" style={{ marginBottom: 12 }}>Create a commitment requiring deliberate resolution. Linking to a Mission is optional.</p>
        <input
          ref={obligationTitleRef}
          type="text"
          className="input"
          style={{ marginBottom: 8 }}
          aria-label="New obligation title"
          placeholder="What needs to be resolved?"
          value={newObligationTitle}
          disabled={busy}
          onChange={(e) => setNewObligationTitle(e.target.value)}
        />
        <select
          className="input"
          style={{ marginBottom: 8 }}
          aria-label="Linked mission"
          value={newObligationMissionId}
          disabled={busy}
          onChange={(e) => setNewObligationMissionId(e.target.value)}
        >
          <option value="">No mission</option>
          {allMissions.filter((m) => m.status === "ACTIVE").map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <div className="intent-dates">
          <div>
            <label htmlFor={`${uid}-due`} className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
            <input id={`${uid}-due`} type="date" className="input" value={newObligationDueAt} disabled={busy} onChange={(e) => setNewObligationDueAt(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${uid}-planned`} className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
            <input id={`${uid}-planned`} type="date" className="input" value={newObligationPlannedAt} disabled={busy} onChange={(e) => setNewObligationPlannedAt(e.target.value)} />
          </div>
        </div>
        <RecurrencePicker form={newObligationRecurrence} onChange={setNewObligationRecurrence} idPrefix={`${uid}-recurrence`} disabled={busy} />
        <button className="btn-primary" disabled={busy || !newObligationTitle.trim()} onClick={() => void handleCreateObligation()}>
          CREATE OBLIGATION
        </button>
      </FieldDisclosure>
      </div>
      </section>
      {error && <p className="meta meta--error">{error}</p>}
    </div>}
    </>
  );
}

function describeObligationSummary(o: Obligation, missions: Mission[], projects: Project[]): string {
  const parts: string[] = [o.status];
  if (o.missionId) {
    const mission = missions.find((m) => m.id === o.missionId);
    if (mission) parts.push(mission.title);
  }
  if (o.projectId) {
    const project = projects.find((p) => p.id === o.projectId);
    if (project) parts.push(`project ${project.title}`);
  }
  if (o.dueAt) parts.push(`due ${o.dueAt}`);
  if (o.plannedAt) parts.push(`planned ${o.plannedAt}`);
  return parts.join(" · ");
}

function MissionDetail({ missionId, onBack, active }: { missionId: string; onBack: () => void; active: boolean }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [linkedObligations, setLinkedObligations] = useState<Obligation[]>([]);
  const [history, setHistory] = useState<DomainEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveConfirming, setArchiveConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  useSessionDraft(`intent-mission-edit-${missionId}`, editing && mission !== null
    && (title !== mission.title || description !== (mission.description ?? "")));

  const loadSequence = useRef(0);
  useEffect(() => {
    if (active) void load(editing).catch((cause) => setError(describeError(cause, "Could not read this Mission.")));
    return () => { ++loadSequence.current; };
  }, [missionId, active]);

  async function load(keepInput = false) {
    const sequence = ++loadSequence.current;
    const [all, linked, trail] = await Promise.all([getMissions(), getObligationsForMission(missionId), getMissionHistory(missionId)]);
    if (sequence !== loadSequence.current) return;
    const found = all.find((m) => m.id === missionId) ?? null;
    setMission(found);
    if (found && !keepInput) { setTitle(found.title); setDescription(found.description ?? ""); }
    setLinkedObligations(linked); setHistory(trail);
  }

  async function handleSave() {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await modifyMission(missionId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      acknowledge("LIGHT");
      setEditing(false);
      await load();
    } catch (e) {
      setError(describeError(e, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await archiveMission(missionId)) acknowledge("HEAVY");
      setArchiveConfirming(false);
      await load();
    } catch (e) {
      setError(describeError(e, "Could not archive."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }} onClick={onBack}>
        BACK TO MISSIONS
      </button>
      {!mission && <p className="empty-state">Mission not found.</p>}
      {mission && (
        <>
          <article className={`intent-detail intent-detail--mission${mission.status === "ARCHIVED" ? " intent-detail--historical" : ""}`}>
            {!editing ? (
              <>
                <p className="intent-detail__identity"><span>MISSION</span><span className="intent-state" data-status={mission.status}>{mission.status}</span></p>
                <h2 className="card-title">{mission.title}</h2>
                {mission.description && <p className="card-body">{mission.description}</p>}
                {mission.status === "ARCHIVED" && <p className="meta intent-detail__truth">Historical direction · no longer active.</p>}
                <div className="intent-actions">
                  <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setEditing(true)}>
                    EDIT
                  </button>
                  {mission.status === "ACTIVE" && (
                    <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setArchiveConfirming(true)}>
                      ARCHIVE MISSION
                    </button>
                  )}
                </div>
                {archiveConfirming && (
                  <div className="card card--warning intent-confirm" role="alert">
                    <p className="card-title">Archive this Mission?</p>
                    <p className="card-body">It becomes historical and stops contributing current attention. Linked Obligations keep their recorded status and remain manageable.</p>
                    <div className="intent-actions">
                      <button className="btn-primary" disabled={busy} onClick={() => void handleArchive()}>CONFIRM ARCHIVE</button>
                      <button className="btn-secondary" disabled={busy} onClick={() => setArchiveConfirming(false)}>CANCEL</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="tool-label">EDIT MISSION</p>
                <input type="text" className="input" style={{ marginBottom: 8 }} aria-label="Mission title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} aria-label="Mission description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
                    SAVE
                  </button>
                  <button className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>
                    CANCEL
                  </button>
                </div>
              </>
            )}
            {error && <p className="meta meta--error" style={{ marginTop: 8 }}>{error}</p>}
          </article>

          <p className="section-label">Obligations</p>
          {linkedObligations.length === 0 && <p className="empty-state">None linked to this mission.</p>}
          {linkedObligations.map((o) => (
            <div key={o.id} className="intent-linked-row">
              <p className="tool-label">OBLIGATION · {o.status}</p>
              <p className="card-body" style={{ margin: 0 }}>{o.title}</p>
            </div>
          ))}

          <div className="intent-history">
          <FieldDisclosure summary={`HISTORY · ${history.length} ${history.length === 1 ? "EVENT" : "EVENTS"}`} open={historyOpen} onToggle={setHistoryOpen}>
            <HistoryList events={history} />
          </FieldDisclosure>
          </div>
        </>
      )}
    </div>
  );
}

function ObligationDetail({
  active,
  obligationId,
  missions,
  projects,
  onBack,
}: {
  active: boolean;
  obligationId: string;
  missions: Mission[];
  projects: Project[];
  onBack: () => void;
}) {
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [history, setHistory] = useState<DomainEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [recurrenceForm, setRecurrenceForm] = useState<RecurrenceFormState>(EMPTY_RECURRENCE);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<"SATISFY" | "RELEASE" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  useSessionDraft(`intent-obligation-edit-${obligationId}`, editing && obligation !== null
    && (title !== obligation.title || description !== (obligation.description ?? "") || dueAt !== (obligation.dueAt ?? "")
      || plannedAt !== (obligation.plannedAt ?? "") || !sameRecurrence(recurrenceForm, recurrenceFormFor(obligation.recurrence))
      || projectId !== (obligation.projectId ?? "")));

  const loadSequence = useRef(0);
  useEffect(() => {
    if (active) void load(editing).catch((cause) => setError(describeError(cause, "Could not read this commitment.")));
    return () => { ++loadSequence.current; };
  }, [obligationId, active]);

  async function load(keepInput = false) {
    const sequence = ++loadSequence.current;
    const [all, trail] = await Promise.all([getObligations(), getObligationHistory(obligationId)]);
    if (sequence !== loadSequence.current) return;
    const found = all.find((o) => o.id === obligationId) ?? null;
    setObligation(found);
    if (found && !keepInput) {
      setTitle(found.title); setDescription(found.description ?? ""); setDueAt(found.dueAt ?? "");
      setPlannedAt(found.plannedAt ?? ""); setRecurrenceForm(recurrenceFormFor(found.recurrence)); setProjectId(found.projectId ?? "");
    }
    setHistory(trail);
  }

  async function handleSave() {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // INTENT-002: a picker still on "Does not repeat" leaves recurrence
      // unchanged (modifyObligation's own `undefined` = "leave unchanged"
      // convention, same limitation dueAt/plannedAt/description already
      // have here — no clear-to-unset path yet for any of these fields).
      const anchor = dueAt || formatLocalDate(new Date());
      const recurrence = recurrenceInputFor(recurrenceForm, anchor);
      await saveObligationEdits(obligationId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        dueAt: dueAt || undefined,
        plannedAt: plannedAt || undefined,
        ...(recurrence ? { recurrence } : {}),
      }, projectId || null);
      acknowledge("LIGHT");
      setEditing(false);
      await load();
    } catch (e) {
      setError(describeError(e, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action: (id: string) => Promise<boolean>) {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await action(obligationId)) acknowledge("LIGHT");
      setPendingResolution(null);
      await load();
    } catch (e) {
      setError(describeError(e, "Could not update."));
    } finally {
      setBusy(false);
    }
  }

  const mission = obligation?.missionId ? missions.find((m) => m.id === obligation.missionId) : undefined;
  const project = obligation?.projectId ? projects.find((p) => p.id === obligation.projectId) : undefined;
  const openProjects = projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED" || p.id === obligation?.projectId);

  return (
    <div>
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }} onClick={onBack}>
        BACK TO OBLIGATIONS
      </button>
      {!obligation && <p className="empty-state">Obligation not found.</p>}
      {obligation && (
        <>
          <article className={`intent-detail intent-detail--obligation${obligation.status === "SATISFIED" || obligation.status === "RELEASED" ? " intent-detail--historical" : ""}`}>
            {!editing ? (
              <>
                <p className="intent-detail__identity"><span>OBLIGATION</span><span className="intent-state" data-status={obligation.status}>{obligation.status}</span></p>
                <h2 className="card-title">{obligation.title}</h2>
                {obligation.description && <p className="card-body">{obligation.description}</p>}
                {mission && <p className="meta">Mission: {mission.title}</p>}
                {project && <p className="meta">Project: {project.title}</p>}
                {obligation.projectId && !project && <p className="meta">Project: unavailable</p>}
                {obligation.dueAt && <p className="meta">Due: {obligation.dueAt}</p>}
                {obligation.plannedAt && <p className="meta">Planned: {obligation.plannedAt}</p>}
                {obligation.recurrence && <p className="meta">Repeats: {describeRecurrence(obligation.recurrence.rrule)}</p>}
                {obligation.resolvedAt && (
                  <p className="meta">
                    Resolved {new Date(obligation.resolvedAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                    {obligation.resolutionNote ? ` — ${obligation.resolutionNote}` : ""}
                  </p>
                )}
                {(obligation.status === "SATISFIED" || obligation.status === "RELEASED") && (
                  <p className="meta intent-detail__truth">Historical commitment · resolution already recorded.</p>
                )}
                <div className="intent-actions">
                  {obligation.status !== "SATISFIED" && obligation.status !== "RELEASED" && (
                    <>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setEditing(true)}>EDIT</button>
                      {obligation.status === "OPEN" ? (
                        <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleAction(markObligationWaiting)}>MARK WAITING</button>
                      ) : (
                        <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleAction(markObligationOpen)}>MARK OPEN</button>
                      )}
                      <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setPendingResolution("SATISFY")}>SATISFY</button>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setPendingResolution("RELEASE")}>RELEASE</button>
                    </>
                  )}
                </div>
                {pendingResolution && (
                  <div className="card card--warning intent-confirm" role="alert">
                    <p className="card-title">{pendingResolution === "SATISFY" ? "Record this as satisfied?" : "Release this Obligation?"}</p>
                    <p className="card-body">
                      {pendingResolution === "SATISFY"
                        ? "This records the commitment as fulfilled. There is no reopen action."
                        : "This records that the commitment is no longer required. It is not the same as completion, and there is no reopen action."}
                    </p>
                    <div className="intent-actions">
                      <button
                        className={pendingResolution === "RELEASE" ? "btn-danger" : "btn-primary"}
                        disabled={busy}
                        onClick={() => void handleAction(pendingResolution === "SATISFY" ? satisfyObligation : releaseObligation)}
                      >
                        {pendingResolution === "SATISFY" ? "CONFIRM SATISFIED" : "CONFIRM RELEASE"}
                      </button>
                      <button className="btn-secondary" disabled={busy} onClick={() => setPendingResolution(null)}>CANCEL</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="tool-label">EDIT OBLIGATION</p>
                <input type="text" className="input" style={{ marginBottom: 8 }} aria-label="Obligation title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} aria-label="Obligation description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="intent-dates">
                  <div>
                    <label htmlFor={`obligation-due-${obligationId}`} className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
                    <input id={`obligation-due-${obligationId}`} type="date" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`obligation-planned-${obligationId}`} className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
                    <input id={`obligation-planned-${obligationId}`} type="date" className="input" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
                  </div>
                </div>
                <RecurrencePicker form={recurrenceForm} onChange={setRecurrenceForm} idPrefix={`obligation-recurrence-${obligationId}`} disabled={busy} />
                <select className="input" style={{ marginBottom: 8 }} aria-label="Project" value={projectId} disabled={busy} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">No project</option>
                  {openProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
                    SAVE
                  </button>
                  <button className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>
                    CANCEL
                  </button>
                </div>
              </>
            )}
            {error && <p className="meta meta--error" style={{ marginTop: 8 }}>{error}</p>}
          </article>

          <div className="intent-history">
          <FieldDisclosure summary={`HISTORY · ${history.length} ${history.length === 1 ? "EVENT" : "EVENTS"}`} open={historyOpen} onToggle={setHistoryOpen}>
            <HistoryList events={history} />
          </FieldDisclosure>
          </div>
        </>
      )}
    </div>
  );
}
