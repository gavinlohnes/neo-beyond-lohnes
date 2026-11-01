import { useEffect, useRef, useState, useId } from "react";
import { captureCommitFeedback } from "../../feel/feedback";
import { useSessionDraft } from "../../sessionDrafts";
import type { DomainEvent } from "../../../domain/common/types";
import type { Mission, ProjectStatus } from "../../../domain/intent/types";
import { createObligation } from "../../../application/intentCommands";
import { createProject, setProjectNext, setProjectStatus } from "../../../application/projectCommands";
import { getProjectHistory, getProjectViews, type ProjectView } from "../../../application/projectQueries";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { describeError } from "../../errorMessage";

/**
 * PROJECTS-001: finite efforts inside the existing Intent screen (no new tab or TODAY row).
 * A Project groups ordinary Obligations; each step still opens in its own canonical editor.
 * Progress is step accounting only. Nothing here picks a next step for the operator.
 */

const STATUS_WORD: Record<ProjectStatus, string> = { ACTIVE: "ACTIVE", PAUSED: "PAUSED", COMPLETED: "COMPLETED", CLOSED: "CLOSED" };
const isOpen = (s: ProjectStatus) => s === "ACTIVE" || s === "PAUSED";

export function describeProgress(v: ProjectView): string {
  const { total, done, waiting, released } = v.progress;
  if (total === 0) return "No steps yet";
  return [`${done} of ${total - released} done`, waiting ? `${waiting} waiting` : "", released ? `${released} released` : ""].filter(Boolean).join(" · ");
}

export function ProjectsSection({ missions, onOpenObligation, onChanged, refreshKey, active }: {
  missions: Mission[]; onOpenObligation: (id: string) => void; onChanged: () => void; refreshKey: number; active: boolean;
}) {
  const [views, setViews] = useState<ProjectView[] | null>(null);
  const uid = useId();
  const [readError, setReadError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [finish, setFinish] = useState("");
  const [steps, setSteps] = useState("");
  const [missionId, setMissionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  useSessionDraft("intent-create-project", [title, finish, steps, missionId].some((v) => v.length > 0));

  async function refresh() {
    const mine = ++sequence.current;
    try {
      const next = await getProjectViews();
      if (mine === sequence.current) { setViews(next); setReadError(null); }
    } catch (cause) {
      if (mine === sequence.current) setReadError(describeError(cause, "Could not read projects."));
    }
  }
  useEffect(() => { if (active) void refresh(); }, [refreshKey, active]);

  async function run(fn: () => Promise<unknown>) {
    if (busy) return false;
    setBusy(true); setError(null);
    const acknowledge = captureCommitFeedback();
    try { await fn(); acknowledge("LIGHT"); onChanged(); return true; }
    catch (e) { setError(describeError(e, "Could not save.")); await refresh(); return false; }
    finally { setBusy(false); }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    const stepTitles = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    const ok = await run(() => createProject(
      { title: title.trim(), ...(finish.trim() ? { finish: finish.trim() } : {}), ...(missionId ? { missionId } : {}) },
      stepTitles.map((t) => ({ title: t })),
    ));
    if (ok) { setTitle(""); setFinish(""); setSteps(""); setMissionId(""); setCreateOpen(false); }
  }

  const shown = (views ?? []).filter((v) => showAll || isOpen(v.project.status));
  return (
    <section aria-labelledby={`${uid}-projects`}>
      <h2 id={`${uid}-projects`} className="section-label">Projects · finite efforts</h2>
      <div className="intent-filter" role="group" aria-label="Project visibility">
        <button aria-pressed={!showAll} className={`chip ${!showAll ? "chip--selected" : ""}`} onClick={() => setShowAll(false)}>OPEN</button>
        <button aria-pressed={showAll} className={`chip ${showAll ? "chip--selected" : ""}`} onClick={() => setShowAll(true)}>ALL / FINISHED</button>
      </div>
      {readError && <div><p role="alert">{readError} Projects are unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY PROJECTS</button></div>}
      {views && shown.length === 0 && <p className="empty-state">{showAll ? "No projects yet." : "No open projects."}</p>}
      {shown.map((v) => <ProjectCard key={v.project.id} view={v} missions={missions} busy={busy} run={run} onOpenObligation={onOpenObligation} />)}
      <div className="intent-create">
        <FieldDisclosure summary="CREATE PROJECT" open={createOpen} onToggle={setCreateOpen}>
          <p className="card-body" style={{ marginBottom: 12 }}>Something finite you want to get done. Steps become ordinary commitments; dates are optional.</p>
          <input type="text" className="input" style={{ marginBottom: 8 }} aria-label="New project title" placeholder="What do you want to get done?" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} />
          <input type="text" className="input" style={{ marginBottom: 8 }} aria-label="Finished when" placeholder="Finished when… (optional)" value={finish} disabled={busy} onChange={(e) => setFinish(e.target.value)} />
          <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} aria-label="First steps, one per line" placeholder="First steps, one per line (optional)" value={steps} disabled={busy} onChange={(e) => setSteps(e.target.value)} />
          <select className="input" style={{ marginBottom: 8 }} aria-label="Project mission" value={missionId} disabled={busy} onChange={(e) => setMissionId(e.target.value)}>
            <option value="">No mission</option>
            {missions.filter((m) => m.status === "ACTIVE").map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button className="btn-primary" disabled={busy || !title.trim()} onClick={() => void handleCreate()}>CREATE PROJECT</button>
        </FieldDisclosure>
      </div>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>
  );
}

function ProjectCard({ view, missions, busy, run, onOpenObligation }: {
  view: ProjectView; missions: Mission[]; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<boolean>; onOpenObligation: (id: string) => void;
}) {
  const { project, steps, progress } = view;
  const [open, setOpen] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [pending, setPending] = useState<"COMPLETED" | "CLOSED" | null>(null);
  const [history, setHistory] = useState<DomainEvent[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  useSessionDraft(`intent-project-step-${project.id}`, newStep.length > 0);
  const mission = project.missionId ? missions.find((m) => m.id === project.missionId) : undefined;
  const unresolved = steps.filter((s) => s.status === "OPEN" || s.status === "WAITING");
  const finished = !isOpen(project.status);
  const status = (to: ProjectStatus) => run(() => setProjectStatus(project.id, to, project.status)).then(() => setPending(null));

  return (
    <div className={`intent-project${finished ? " intent-item--historical" : ""}`}>
      <button type="button" className="intent-item intent-item--mission" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} project ${project.title}`} onClick={() => setOpen(!open)}>
        <span className="intent-item__body">
          <span className="intent-item__identity"><span>PROJECT</span><span className="intent-state" data-status={project.status}>{STATUS_WORD[project.status]}</span></span>
          <span className="intent-item__title">{project.title}</span>
          <span className="meta intent-item__summary">
            {describeProgress(view)}
            {progress.next ? ` · Next: ${progress.next.title}` : progress.nextResolved && !finished ? " · Next step done. Choose another when ready." : ""}
          </span>
        </span>
        <span aria-hidden="true" className="disclosure-chevron">{open ? "⌄" : "›"}</span>
      </button>
      {open && <div className="intent-project__body" style={{ padding: "0 var(--space-3) var(--space-3)" }}>
        {project.finish && <p className="card-body">Finished when: {project.finish}</p>}
        {mission && <p className="meta">Mission: {mission.title}</p>}
        {steps.length === 0 && <p className="meta">No steps yet.</p>}
        {steps.map((s) => (
          <button key={s.id} type="button" className="intent-item intent-item--obligation" aria-label={`Open ${s.title}`} onClick={() => onOpenObligation(s.id)}>
            <span className="intent-item__body">
              <span className="intent-item__identity"><span>STEP</span><span className="intent-state" data-status={s.status}>{s.status}</span></span>
              <span className="intent-item__title">{s.title}</span>
              {(s.dueAt || s.plannedAt) && <span className="meta intent-item__summary">{[s.dueAt ? `due ${s.dueAt}` : "", s.plannedAt ? `planned ${s.plannedAt}` : ""].filter(Boolean).join(" · ")}</span>}
            </span>
            <span aria-hidden="true" className="disclosure-chevron">›</span>
          </button>
        ))}
        {!finished && <>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="text" className="input" style={{ flex: 1 }} aria-label={`New step for ${project.title}`} placeholder="Add a step" value={newStep} disabled={busy} onChange={(e) => setNewStep(e.target.value)} />
            <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} disabled={busy || !newStep.trim()}
              onClick={() => void run(() => createObligation({ title: newStep.trim(), projectId: project.id })).then((ok) => { if (ok) setNewStep(""); })}>ADD STEP</button>
          </div>
          {unresolved.length > 0 && <label className="field" style={{ marginTop: 8 }}>Next step (your choice)
            <select className="input" aria-label={`Next step for ${project.title}`} value={progress.next?.id ?? ""} disabled={busy}
              onChange={(e) => void run(() => setProjectNext(project.id, e.target.value || null))}>
              <option value="">Not chosen</option>
              {unresolved.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>}
        </>}
        <div className="intent-actions" style={{ marginTop: 8 }}>
          {project.status === "ACTIVE" && <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void status("PAUSED")}>PAUSE</button>}
          {project.status === "PAUSED" && <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void status("ACTIVE")}>RESUME</button>}
          {!finished && <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setPending("COMPLETED")}>COMPLETE</button>}
          {!finished && <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setPending("CLOSED")}>CLOSE</button>}
          {finished && <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void status("ACTIVE")}>REOPEN</button>}
        </div>
        {pending && <div className="card card--warning intent-confirm" role="alert">
          <p className="card-title">{pending === "COMPLETED" ? "Mark this project complete?" : "Close this project?"}</p>
          <p className="card-body">
            {pending === "COMPLETED" ? "This records it as done." : "This records that you stopped, without calling it done."}
            {unresolved.length > 0 ? ` ${unresolved.length} ${unresolved.length === 1 ? "step is" : "steps are"} still open; they stay exactly as they are.` : ""} You can reopen it later.
          </p>
          <div className="intent-actions">
            <button className="btn-primary" disabled={busy} onClick={() => void status(pending)}>{pending === "COMPLETED" ? "CONFIRM COMPLETE" : "CONFIRM CLOSE"}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => setPending(null)}>CANCEL</button>
          </div>
        </div>}
        <FieldDisclosure summary={history ? `HISTORY · ${history.length} ${history.length === 1 ? "EVENT" : "EVENTS"}` : "HISTORY"} open={historyOpen}
          onToggle={(o) => { setHistoryOpen(o); setHistoryFailed(false); if (!o) setHistory(null); else void getProjectHistory(project.id).then(setHistory).catch(() => setHistoryFailed(true)); }}>
          {historyOpen && !history && !historyFailed && <p role="status" className="meta">Reading history…</p>}
          {historyFailed && <p role="alert" className="meta">History could not be read. It is unavailable, not empty.</p>}
          {history?.length === 0 && <p className="meta">No history yet.</p>}
          {history?.map((e) => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderTop: "1px solid var(--border-subtle)" }}>
            <span className="meta">{e.type.replace(/_/g, " ")}</span>
            <span className="meta">{new Date(e.occurredAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
          </div>)}
        </FieldDisclosure>
      </div>}
    </div>
  );
}
