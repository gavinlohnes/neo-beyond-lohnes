import { useEffect, useState } from "react";
import type { DomainEvent } from "../../../domain/common/types";
import type { Mission, Obligation, ObligationStatus } from "../../../domain/intent/types";
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
import { CollapsibleRow } from "../../components/CollapsibleRow";

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

export function IntentScreen() {
  const [view, setView] = useState<View>({ kind: "LIST" });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [showAllObligations, setShowAllObligations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newObligationTitle, setNewObligationTitle] = useState("");
  const [newObligationMissionId, setNewObligationMissionId] = useState("");
  const [newObligationDueAt, setNewObligationDueAt] = useState("");
  const [newObligationPlannedAt, setNewObligationPlannedAt] = useState("");

  useEffect(() => {
    void refreshList();
  }, [showAllObligations]);

  async function refreshList() {
    setMissions(await getMissions());
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
        missions={missions}
        onBack={() => {
          setView({ kind: "LIST" });
          void refreshList();
        }}
      />
    );
  }

  return (
    <div>
      <p className="section-label">Missions</p>
      {missions.length === 0 && <p className="empty-state">No missions yet.</p>}
      {missions.map((m) => (
        <CollapsibleRow
          key={m.id}
          name={m.title}
          summary={m.status === "ARCHIVED" ? "ARCHIVED" : "Active"}
          onOpen={() => setView({ kind: "MISSION_DETAIL", missionId: m.id })}
        />
      ))}
      <div className="card">
        <p className="card-title">New mission</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="What is this mission?"
            value={newMissionTitle}
            disabled={busy}
            onChange={(e) => setNewMissionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateMission();
            }}
          />
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy || !newMissionTitle.trim()} onClick={() => void handleCreateMission()}>
            ADD
          </button>
        </div>
      </div>

      <p className="section-label">Obligations</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className={`chip ${!showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(false)}>
          UNRESOLVED
        </button>
        <button className={`chip ${showAllObligations ? "chip--selected" : ""}`} onClick={() => setShowAllObligations(true)}>
          ALL
        </button>
      </div>
      {obligations.length === 0 && <p className="empty-state">Nothing here.</p>}
      {obligations.map((o) => (
        <CollapsibleRow
          key={o.id}
          name={o.title}
          summary={describeObligationSummary(o, missions)}
          onOpen={() => setView({ kind: "OBLIGATION_DETAIL", obligationId: o.id })}
        />
      ))}
      <div className="card">
        <p className="card-title">New obligation</p>
        <input
          type="text"
          className="input"
          style={{ marginBottom: 8 }}
          placeholder="What needs to be resolved?"
          value={newObligationTitle}
          disabled={busy}
          onChange={(e) => setNewObligationTitle(e.target.value)}
        />
        <select
          className="input"
          style={{ marginBottom: 8 }}
          value={newObligationMissionId}
          disabled={busy}
          onChange={(e) => setNewObligationMissionId(e.target.value)}
        >
          <option value="">No mission</option>
          {missions.filter((m) => m.status === "ACTIVE").map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
            <input type="date" className="input" value={newObligationDueAt} disabled={busy} onChange={(e) => setNewObligationDueAt(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
            <input type="date" className="input" value={newObligationPlannedAt} disabled={busy} onChange={(e) => setNewObligationPlannedAt(e.target.value)} />
          </div>
        </div>
        <button className="btn-secondary" disabled={busy || !newObligationTitle.trim()} onClick={() => void handleCreateObligation()}>
          ADD
        </button>
      </div>
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
          <div className="card">
            {!editing ? (
              <>
                <p className="eyebrow">{mission.status}</p>
                <h2 className="card-title">{mission.title}</h2>
                {mission.description && <p className="card-body">{mission.description}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setEditing(true)}>
                    EDIT
                  </button>
                  {mission.status === "ACTIVE" && (
                    <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleArchive()}>
                      ARCHIVE
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <input type="text" className="input" style={{ marginBottom: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          </div>

          <p className="section-label">Obligations</p>
          {linkedObligations.length === 0 && <p className="empty-state">None linked to this mission.</p>}
          {linkedObligations.map((o) => (
            <div key={o.id} className="card">
              <p className="card-body" style={{ margin: 0 }}>{o.title}</p>
              <p className="meta">{o.status}</p>
            </div>
          ))}

          <p className="section-label">History</p>
          <div className="card">
            <HistoryList events={history} />
          </div>
        </>
      )}
    </div>
  );
}

const NEXT_STATUS_ACTIONS: Record<ObligationStatus, { label: string; action: (id: string) => Promise<void> }[]> = {
  OPEN: [
    { label: "MARK WAITING", action: markObligationWaiting },
    { label: "SATISFY", action: (id) => satisfyObligation(id) },
    { label: "RELEASE", action: (id) => releaseObligation(id) },
  ],
  WAITING: [
    { label: "MARK OPEN", action: markObligationOpen },
    { label: "SATISFY", action: (id) => satisfyObligation(id) },
    { label: "RELEASE", action: (id) => releaseObligation(id) },
  ],
  SATISFIED: [],
  RELEASED: [],
};

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
          <div className="card">
            {!editing ? (
              <>
                <p className="eyebrow">{obligation.status}</p>
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {obligation.status !== "SATISFIED" && obligation.status !== "RELEASED" && (
                    <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setEditing(true)}>
                      EDIT
                    </button>
                  )}
                  {NEXT_STATUS_ACTIONS[obligation.status].map((a) => (
                    <button
                      key={a.label}
                      className="btn-secondary"
                      style={{ width: "auto", padding: "8px 16px" }}
                      disabled={busy}
                      onClick={() => void handleAction(a.action)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <input type="text" className="input" style={{ marginBottom: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label className="meta" style={{ display: "block", marginBottom: 4 }}>Due</label>
                    <input type="date" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="meta" style={{ display: "block", marginBottom: 4 }}>Planned</label>
                    <input type="date" className="input" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
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
          </div>

          <p className="section-label">History</p>
          <div className="card">
            <HistoryList events={history} />
          </div>
        </>
      )}
    </div>
  );
}
