import { useEffect, useState } from "react";
import type { DomainEvent } from "../../../domain/common/types";
import type { Mission, Obligation, ObligationStatus } from "../../../domain/intent/types";
import {
  getActiveMissions,
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

/**
 * Intent & Commitment Spine — Drop 01 (approved 2026-08-22). The one
 * dedicated Mission/Obligation management surface required by the spec
 * (section 12) — reachable from MORE, not a new primary bottom-nav
 * destination, and deliberately not a redesign of anything else. Every
 * mutation goes through application/intentCommands.ts; nothing here
 * writes to Dexie directly.
 */

type View =
  | { kind: "LIST" }
  | { kind: "MISSION_DETAIL"; missionId: string }
  | { kind: "OBLIGATION_DETAIL"; obligationId: string };

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
          <span className="meta">{new Date(e.occurredAt).toLocaleString()}</span>
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

export function IntentScreen() {
  const [view, setView] = useState<View>({ kind: "LIST" });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [showAllObligations, setShowAllObligations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missionCreateOpen, setMissionCreateOpen] = useState(false);
  const [obligationCreateOpen, setObligationCreateOpen] = useState(false);

  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newObligationTitle, setNewObligationTitle] = useState("");
  const [newObligationMissionId, setNewObligationMissionId] = useState("");
  const [newObligationDueAt, setNewObligationDueAt] = useState("");
  const [newObligationPlannedAt, setNewObligationPlannedAt] = useState("");

  useEffect(() => {
    void refreshList();
  }, [showAllMissions, showAllObligations]);

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
    const everyMission = await getMissions();
    setAllMissions(everyMission);
    setMissions(showAllMissions ? everyMission : await getActiveMissions());
    setObligations(showAllObligations ? await getObligations() : await getUnresolvedObligations());
  }

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateMission() {
    if (!newMissionTitle.trim()) return;
    await withBusy(async () => {
      await createMission({ title: newMissionTitle.trim() });
      setNewMissionTitle("");
      setMissionCreateOpen(false);
      await refreshList();
    });
  }

  async function handleCreateObligation() {
    if (!newObligationTitle.trim()) return;
    await withBusy(async () => {
      await createObligation({
        title: newObligationTitle.trim(),
        ...(newObligationMissionId ? { missionId: newObligationMissionId } : {}),
        ...(newObligationDueAt ? { dueAt: newObligationDueAt } : {}),
        ...(newObligationPlannedAt ? { plannedAt: newObligationPlannedAt } : {}),
      });
      setNewObligationTitle("");
      setNewObligationMissionId("");
      setNewObligationDueAt("");
      setNewObligationPlannedAt("");
      setObligationCreateOpen(false);
      await refreshList();
    });
  }

  if (view.kind === "MISSION_DETAIL") {
    return (
      <MissionDetail
        missionId={view.missionId}
        onBack={() => {
          setView({ kind: "LIST" });
          void refreshList();
        }}
      />
    );
  }

  if (view.kind === "OBLIGATION_DETAIL") {
    return (
      <ObligationDetail
        obligationId={view.obligationId}
        missions={allMissions}
        onBack={() => {
          setView({ kind: "LIST" });
          void refreshList();
        }}
      />
    );
  }

  return (
    <div className="intent-field">
      <header className="intent-field__intro">
        <p className="tool-label">INTENT FIELD</p>
        <p className="card-body">Missions hold durable direction. Obligations hold commitments that require deliberate resolution.</p>
      </header>

      <section aria-labelledby="missions-heading">
      <h2 id="missions-heading" className="section-label">Missions · durable direction</h2>
      <p className="section-intro">Active Missions describe where you are deliberately headed. Archived Missions remain historical truth.</p>
      <div className="intent-filter" role="group" aria-label="Mission visibility">
        <button aria-pressed={!showAllMissions} className={`chip ${!showAllMissions ? "chip--selected" : ""}`} onClick={() => setShowAllMissions(false)}>
          ACTIVE
        </button>
        <button aria-pressed={showAllMissions} className={`chip ${showAllMissions ? "chip--selected" : ""}`} onClick={() => setShowAllMissions(true)}>
          ALL / ARCHIVED
        </button>
      </div>
      {missions.length === 0 && <p className="empty-state">{showAllMissions ? "No missions yet." : "No active missions."}</p>}
      {missions.map((m) => (
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
        <p className="card-body" style={{ marginBottom: 12 }}>Create durable direction—not a task or recommendation.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
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

      <section aria-labelledby="obligations-heading">
      <h2 id="obligations-heading" className="section-label">Obligations · commitments</h2>
      <p className="section-intro">Open and waiting Obligations still require resolution. Satisfied and released records remain evidence.</p>
      <div className="intent-filter" role="group" aria-label="Obligation visibility">
        <button aria-pressed={!showAllObligations} className={`chip ${!showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(false)}>
          UNRESOLVED
        </button>
        <button aria-pressed={showAllObligations} className={`chip ${showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(true)}>
          ALL / RESOLVED
        </button>
      </div>
      {obligations.length === 0 && <p className="empty-state">Nothing here.</p>}
      {obligations.map((o) => (
        <IntentItemRow
          key={o.id}
          kind="OBLIGATION"
          status={o.status}
          title={o.title}
          {...(o.description ? { description: o.description } : {})}
          summary={describeObligationSummary(o, allMissions)}
          onOpen={() => setView({ kind: "OBLIGATION_DETAIL", obligationId: o.id })}
        />
      ))}
      <div className="intent-create">
      <FieldDisclosure summary="CREATE OBLIGATION" open={obligationCreateOpen} onToggle={setObligationCreateOpen}>
        <p className="card-body" style={{ marginBottom: 12 }}>Create a commitment requiring deliberate resolution. Linking to a Mission is optional.</p>
        <input
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
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="new-obligation-due" className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
            <input id="new-obligation-due" type="date" className="input" value={newObligationDueAt} disabled={busy} onChange={(e) => setNewObligationDueAt(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="new-obligation-planned" className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
            <input id="new-obligation-planned" type="date" className="input" value={newObligationPlannedAt} disabled={busy} onChange={(e) => setNewObligationPlannedAt(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" disabled={busy || !newObligationTitle.trim()} onClick={() => void handleCreateObligation()}>
          CREATE OBLIGATION
        </button>
      </FieldDisclosure>
      </div>
      </section>
      {error && <p className="meta" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

function describeObligationSummary(o: Obligation, missions: Mission[]): string {
  const parts: string[] = [o.status];
  if (o.missionId) {
    const mission = missions.find((m) => m.id === o.missionId);
    if (mission) parts.push(mission.title);
  }
  if (o.dueAt) parts.push(`due ${o.dueAt}`);
  if (o.plannedAt) parts.push(`planned ${o.plannedAt}`);
  return parts.join(" · ");
}

function MissionDetail({ missionId, onBack }: { missionId: string; onBack: () => void }) {
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

  useEffect(() => {
    void load();
  }, [missionId]);

  async function load() {
    const all = await getMissions();
    const found = all.find((m) => m.id === missionId) ?? null;
    setMission(found);
    if (found) {
      setTitle(found.title);
      setDescription(found.description ?? "");
    }
    setLinkedObligations(await getObligationsForMission(missionId));
    setHistory(await getMissionHistory(missionId));
  }

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await modifyMission(missionId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await archiveMission(missionId);
      setArchiveConfirming(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }} onClick={onBack}>
        ← BACK
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
            {error && <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
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
  obligationId,
  missions,
  onBack,
}: {
  obligationId: string;
  missions: Mission[];
  onBack: () => void;
}) {
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [history, setHistory] = useState<DomainEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<"SATISFY" | "RELEASE" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [obligationId]);

  async function load() {
    const all = await getObligations();
    const found = all.find((o) => o.id === obligationId) ?? null;
    setObligation(found);
    if (found) {
      setTitle(found.title);
      setDescription(found.description ?? "");
      setDueAt(found.dueAt ?? "");
      setPlannedAt(found.plannedAt ?? "");
    }
    setHistory(await getObligationHistory(obligationId));
  }

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await modifyObligation(obligationId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        dueAt: dueAt || undefined,
        plannedAt: plannedAt || undefined,
      });
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action: (id: string) => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action(obligationId);
      setPendingResolution(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  const mission = obligation?.missionId ? missions.find((m) => m.id === obligation.missionId) : undefined;

  return (
    <div>
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }} onClick={onBack}>
        ← BACK
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
                {obligation.dueAt && <p className="meta">Due: {obligation.dueAt}</p>}
                {obligation.plannedAt && <p className="meta">Planned: {obligation.plannedAt}</p>}
                {obligation.resolvedAt && (
                  <p className="meta">
                    Resolved {new Date(obligation.resolvedAt).toLocaleString()}
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
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="obligation-due" className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
                    <input id="obligation-due" type="date" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="obligation-planned" className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
                    <input id="obligation-planned" type="date" className="input" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
                  </div>
                </div>
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
            {error && <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
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
