import { captureCommitFeedback } from "../../feel/feedback";
import { useSessionDraft } from "../../sessionDrafts";
import { useEffect, useRef, useState } from "react";
import type { DomainEvent } from "../../../domain/common/types";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { getDecisionJournalEntries, getDecisionJournalHistory } from "../../../application/journalQueries";
import {
  createDecisionJournalEntry,
  modifyDecisionJournalEntry,
  reviewDecisionJournalEntry,
} from "../../../application/journalCommands";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { describeError } from "../../errorMessage";
import { FollowUps } from "./FollowUps";
import { Experiments } from "./Experiments";

/**
 * Decision Journal (approved under the Whole-Life Capability North Star,
 * DEC-007; built 2026-09-02). General-purpose reflective journal — not
 * limited to BEYOND's own Engine recommendations. The one dedicated
 * management surface, reachable from MORE (same placement pattern as
 * Missions & Obligations), not a new primary bottom-nav destination.
 * Every mutation goes through application/journalCommands.ts; nothing
 * here writes to Dexie directly.
 */

type View = { kind: "LIST" } | { kind: "DETAIL"; id: string };

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

function JournalItemRow({
  entry,
  onOpen,
}: {
  entry: DecisionJournalEntry;
  onOpen: () => void;
}) {
  const summary = entry.status === "REVIEWED" ? `Reviewed ${new Date(entry.reviewedAt!).toLocaleDateString()}` : "Awaiting review";
  return (
    <button
      type="button"
      className={`intent-item intent-item--obligation${entry.status === "REVIEWED" ? " intent-item--historical" : ""}`}
      aria-label={`Open ${entry.title}`}
      onClick={onOpen}
    >
      <span className="intent-item__body">
        <span className="intent-item__identity">
          <span>DECISION</span>
          <span className="intent-state" data-status={entry.status}>{entry.status}</span>
        </span>
        <span className="intent-item__title">{entry.title}</span>
        {entry.decision && <span className="intent-item__description">{entry.decision}</span>}
        <span className="meta intent-item__summary">{summary}</span>
      </span>
      <span aria-hidden="true" className="disclosure-chevron">›</span>
    </button>
  );
}

export function JournalScreen({ active = true, navigationEntryId, onOpenCapture, onDraftChange }: { navigationEntryId?: string | undefined; active?: boolean; onOpenCapture?: () => void; onDraftChange?: (hasDraft: boolean) => void } = {}) {
  const [view, setViewState] = useState<View>({ kind: "LIST" });
  const [visitedEntries, setVisitedEntries] = useState<string[]>([]);
  const entryDrafts = useRef<Record<string, boolean>>({});
  function setView(next: View) {
    if (next.kind === "DETAIL") setVisitedEntries((ids) => ids.includes(next.id) ? ids : [...ids, next.id]);
    setViewState(next);
  }
  useEffect(() => {
    if (navigationEntryId) setView({ kind: "DETAIL", id: navigationEntryId });
  }, [navigationEntryId]);
  useEffect(() => {
    if (active && !navigationEntryId && view.kind === "DETAIL" && !entryDrafts.current[view.id]) setView({ kind: "LIST" });
  }, [active]);
  const [entries, setEntries] = useState<DecisionJournalEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [guided, setGuided] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const readSequence = useRef(0);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [readError, setReadError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newOptions, setNewOptions] = useState("");
  const [newDecision, setNewDecision] = useState("");
  const [newReasoning, setNewReasoning] = useState("");
  const [newExpectation, setNewExpectation] = useState("");

  useSessionDraft("journal-create", [newTitle, newContext, newOptions, newDecision, newReasoning, newExpectation].some((value) => value.length > 0));
  useEffect(() => {
    onDraftChange?.([newTitle, newContext, newOptions, newDecision, newReasoning, newExpectation].some((value) => value.length > 0));
  }, [onDraftChange, newTitle, newContext, newOptions, newDecision, newReasoning, newExpectation]);

  useEffect(() => {
    if (active) void refreshList();
    return () => { ++readSequence.current; };
  }, [active]);

  async function refreshList() {
    const sequence = ++readSequence.current;
    setReadState("loading");
    setReadError("");
    try {
      const next = await getDecisionJournalEntries();
      if (sequence !== readSequence.current) return;
      setEntries(next);
      setReadState("ready");
    } catch (cause) {
      if (sequence !== readSequence.current) return;
      setReadState("error");
      setReadError(describeError(cause, "Could not read decisions."));
    }
  }

  useEffect(() => {
    if (guided && createOpen && active && view.kind === "LIST") titleRef.current?.focus();
  }, [guided, createOpen, active, view.kind]);

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

  async function handleCreate() {
    if (!newTitle.trim() || !newDecision.trim()) return;
    await withBusy(async () => {
    const acknowledge = captureCommitFeedback();
      await createDecisionJournalEntry({
        title: newTitle.trim(),
        decision: newDecision.trim(),
        ...(newContext.trim() ? { context: newContext.trim() } : {}),
        ...(newOptions.trim() ? { options: newOptions.trim() } : {}),
        ...(newReasoning.trim() ? { reasoning: newReasoning.trim() } : {}),
        ...(newExpectation.trim() ? { expectation: newExpectation.trim() } : {}),
      });
      acknowledge("LIGHT");
      setNewTitle("");
      setNewContext("");
      setNewOptions("");
      setNewDecision("");
      setNewReasoning("");
      setNewExpectation("");
      setCreateOpen(false);
      await refreshList();
    });
  }

  const visible = showAll ? entries : entries.filter((e) => e.status === "OPEN");

  return (
    <div className="intent-field">
      <div hidden={view.kind !== "LIST"}>
      <header className="intent-field__intro">
        <p className="tool-label">DECISION JOURNAL</p>
        <p className="card-body">
          Context, options, decision, reasoning, and expectation — recorded now. Outcome and lesson come later, once there's something to review.
        </p>
      </header>

      <details className="writing-start">
        <summary>Need a starting point?</summary>
        <p>A real choice goes in the Journal. A memory or unfinished thought can stay a plain note in Capture.</p>
        <div className="writing-start__choices">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setGuided(true); setCreateOpen(true); }}>GUIDE A DECISION</button>
          {onOpenCapture && <button type="button" className="btn-secondary" disabled={busy} onClick={onOpenCapture}>WRITE A FREE NOTE</button>}
        </div>
      </details>

      {readState === "ready" && <FollowUps entries={entries} onAnswered={() => void refreshList()} />}
      {readState === "ready" && <Experiments entries={entries} onChanged={() => void refreshList()} />}

      <section aria-labelledby="journal-heading">
        <h2 id="journal-heading" className="section-label">Decisions</h2>
        <div className="intent-filter" role="group" aria-label="Decision visibility">
          <button aria-pressed={!showAll} className={`chip ${!showAll ? "chip--selected" : ""}`} onClick={() => setShowAll(false)}>
            AWAITING REVIEW
          </button>
          <button aria-pressed={showAll} className={`chip ${showAll ? "chip--selected" : ""}`} onClick={() => setShowAll(true)}>
            ALL / REVIEWED
          </button>
        </div>
        {readState === "loading" && <p role="status">Reading decisions…</p>}
        {readState === "error" && <div><p role="alert">{readError} The list is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refreshList()}>RETRY DECISIONS</button></div>}
        {readState === "ready" && visible.length === 0 && <p className="empty-state">{showAll ? "No decisions recorded yet." : "Nothing awaiting review."}</p>}
        {readState === "ready" && visible.map((entry) => (
          <JournalItemRow key={entry.id} entry={entry} onOpen={() => setView({ kind: "DETAIL", id: entry.id })} />
        ))}
        <div className="intent-create">
          <FieldDisclosure summary="RECORD A DECISION" open={createOpen} onToggle={setCreateOpen}>
            <button type="button" className="btn-secondary" aria-pressed={guided} disabled={busy} onClick={() => setGuided((value) => !value)}>{guided ? "WRITE WITHOUT GUIDANCE" : "SHOW WRITING PROMPTS"}</button>
            {guided && <div className="writing-start"><p>One choice is enough. Your words stay editable; prompts do not fill or save anything.</p><ol><li>Name the choice in the title.</li><li>Describe what you decided. Context, other options and reasoning are optional.</li><li>If useful, write what you expect. Return later for the actual outcome; no outcome is assumed now.</li></ol></div>}
            <p className="card-body" style={{ marginBottom: 12 }}>
              Any decision worth thinking through — not only BEYOND's own recommendations.
            </p>
            <input
              ref={titleRef}
              type="text"
              className="input"
              style={{ marginBottom: 8 }}
              aria-label="Decision title"
              placeholder="What decision is this?"
              value={newTitle}
              disabled={busy}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <label htmlFor="journal-context" className="meta" style={{ display: "block", marginBottom: 4 }}>Context (optional)</label>
            <textarea
              id="journal-context"
              className="input"
              style={{ marginBottom: 8, minHeight: 60 }}
              placeholder="What's the situation?"
              value={newContext}
              disabled={busy}
              onChange={(e) => setNewContext(e.target.value)}
            />
            <label htmlFor="journal-options" className="meta" style={{ display: "block", marginBottom: 4 }}>Options considered (optional)</label>
            <textarea
              id="journal-options"
              className="input"
              style={{ marginBottom: 8, minHeight: 60 }}
              placeholder="What were the choices?"
              value={newOptions}
              disabled={busy}
              onChange={(e) => setNewOptions(e.target.value)}
            />
            <label htmlFor="journal-decision" className="meta" style={{ display: "block", marginBottom: 4 }}>Decision</label>
            <textarea
              id="journal-decision"
              className="input"
              style={{ marginBottom: 8, minHeight: 60 }}
              placeholder="What did you decide?"
              value={newDecision}
              disabled={busy}
              onChange={(e) => setNewDecision(e.target.value)}
            />
            <label htmlFor="journal-reasoning" className="meta" style={{ display: "block", marginBottom: 4 }}>Reasoning (optional)</label>
            <textarea
              id="journal-reasoning"
              className="input"
              style={{ marginBottom: 8, minHeight: 60 }}
              placeholder="Why?"
              value={newReasoning}
              disabled={busy}
              onChange={(e) => setNewReasoning(e.target.value)}
            />
            <label htmlFor="journal-expectation" className="meta" style={{ display: "block", marginBottom: 4 }}>Expectation (optional)</label>
            <textarea
              id="journal-expectation"
              className="input"
              style={{ marginBottom: 12, minHeight: 60 }}
              placeholder="What do you expect to happen?"
              value={newExpectation}
              disabled={busy}
              onChange={(e) => setNewExpectation(e.target.value)}
            />
            <button className="btn-primary" disabled={busy || !newTitle.trim() || !newDecision.trim()} onClick={() => void handleCreate()}>
              RECORD DECISION
            </button>
          </FieldDisclosure>
        </div>
      </section>
      {error && <p className="meta meta--error">{error}</p>}
      </div>
      {visitedEntries.map((id) => <div key={id} hidden={view.kind !== "DETAIL" || view.id !== id}>
        <JournalEntryDetail entryId={id} onDraftChange={(dirty) => { entryDrafts.current[id] = dirty; }} onBack={() => {
          setView({ kind: "LIST" }); void refreshList();
        }} />
      </div>)}
    </div>
  );
}

function JournalEntryDetail({ entryId, onBack, onDraftChange }: { entryId: string; onBack: () => void; onDraftChange: (dirty: boolean) => void }) {
  const [entry, setEntry] = useState<DecisionJournalEntry | null>(null);
  const [history, setHistory] = useState<DomainEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState("");
  const [decision, setDecision] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [expectation, setExpectation] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [lesson, setLesson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const hasDraft = (reviewing && Boolean(outcome || lesson)) || (editing && entry !== null &&
    [title !== entry.title, context !== (entry.context ?? ""), options !== (entry.options ?? ""), decision !== entry.decision,
      reasoning !== (entry.reasoning ?? ""), expectation !== (entry.expectation ?? "")].some(Boolean));
  useSessionDraft(`journal-detail-${entryId}`, hasDraft);
  useEffect(() => { onDraftChange(hasDraft); }, [hasDraft, onDraftChange]);

  useEffect(() => {
    void load();
  }, [entryId]);

  async function load() {
    const all = await getDecisionJournalEntries();
    const found = all.find((e) => e.id === entryId) ?? null;
    setEntry(found);
    if (found) {
      setTitle(found.title);
      setContext(found.context ?? "");
      setOptions(found.options ?? "");
      setDecision(found.decision);
      setReasoning(found.reasoning ?? "");
      setExpectation(found.expectation ?? "");
    }
    setHistory(await getDecisionJournalHistory(entryId));
  }

  async function handleSave() {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await modifyDecisionJournalEntry(entryId, {
        title: title.trim() || undefined,
        context: context.trim() || undefined,
        options: options.trim() || undefined,
        decision: decision.trim() || undefined,
        reasoning: reasoning.trim() || undefined,
        expectation: expectation.trim() || undefined,
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

  async function handleReview() {
    const acknowledge = captureCommitFeedback();
    if (busy || !outcome.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await reviewDecisionJournalEntry(entryId, {
        outcome: outcome.trim(),
        ...(lesson.trim() ? { lesson: lesson.trim() } : {}),
      });
      acknowledge("LIGHT");
      setReviewing(false);
      setOutcome("");
      setLesson("");
      await load();
    } catch (e) {
      setError(describeError(e, "Could not save the review."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginBottom: 12 }} onClick={onBack}>
        BACK TO DECISIONS
      </button>
      {!entry && <p className="empty-state">Decision not found.</p>}
      {entry && (
        <>
          <article className={`intent-detail intent-detail--obligation${entry.status === "REVIEWED" ? " intent-detail--historical" : ""}`}>
            {!editing ? (
              <>
                <p className="intent-detail__identity"><span>DECISION</span><span className="intent-state" data-status={entry.status}>{entry.status}</span></p>
                <h2 className="card-title">{entry.title}</h2>
                {entry.context && (
                  <>
                    <p className="why-group-label">Context</p>
                    <p className="card-body">{entry.context}</p>
                  </>
                )}
                {entry.options && (
                  <>
                    <p className="why-group-label">Options considered</p>
                    <p className="card-body">{entry.options}</p>
                  </>
                )}
                <p className="why-group-label">Decision</p>
                <p className="card-body">{entry.decision}</p>
                {entry.reasoning && (
                  <>
                    <p className="why-group-label">Reasoning</p>
                    <p className="card-body">{entry.reasoning}</p>
                  </>
                )}
                {entry.expectation && (
                  <>
                    <p className="why-group-label">Expectation</p>
                    <p className="card-body">{entry.expectation}</p>
                  </>
                )}
                {entry.status === "REVIEWED" && (
                  <>
                    <p className="why-group-label">Outcome</p>
                    <p className="card-body">{entry.outcome}</p>
                    {entry.lesson && (
                      <>
                        <p className="why-group-label">Lesson</p>
                        <p className="card-body">{entry.lesson}</p>
                      </>
                    )}
                    <p className="meta intent-detail__truth">Reviewed {new Date(entry.reviewedAt!).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.</p>
                  </>
                )}
                <div className="intent-actions">
                  <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setEditing(true)}>
                    EDIT
                  </button>
                  {entry.status === "OPEN" && !reviewing && (
                    <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => setReviewing(true)}>
                      REVIEW
                    </button>
                  )}
                </div>
                {reviewing && (
                  <div className="card card--warning intent-confirm" role="alert">
                    <p className="card-title">What actually happened?</p>
                    <p className="card-body" style={{ marginBottom: 8 }}>This is what the journal is for — recorded once, not revisited.</p>
                    <label htmlFor={`journal-outcome-${entryId}`} className="meta" style={{ display: "block", marginBottom: 4 }}>Outcome</label>
                    <textarea
                      id={`journal-outcome-${entryId}`}
                      className="input"
                      style={{ marginBottom: 8, minHeight: 60 }}
                      value={outcome}
                      disabled={busy}
                      onChange={(e) => setOutcome(e.target.value)}
                    />
                    <label htmlFor={`journal-lesson-${entryId}`} className="meta" style={{ display: "block", marginBottom: 4 }}>Lesson (optional)</label>
                    <textarea
                      id={`journal-lesson-${entryId}`}
                      className="input"
                      style={{ marginBottom: 8, minHeight: 60 }}
                      placeholder="What does this teach for next time?"
                      value={lesson}
                      disabled={busy}
                      onChange={(e) => setLesson(e.target.value)}
                    />
                    <div className="intent-actions">
                      <button className="btn-primary" disabled={busy || !outcome.trim()} onClick={() => void handleReview()}>MARK REVIEWED</button>
                      <button className="btn-secondary" disabled={busy} onClick={() => setReviewing(false)}>CANCEL</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="tool-label">EDIT DECISION</p>
                <input type="text" className="input" style={{ marginBottom: 8 }} aria-label="Decision title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 60 }} aria-label="Context" placeholder="Context" value={context} onChange={(e) => setContext(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 60 }} aria-label="Options considered" placeholder="Options considered" value={options} onChange={(e) => setOptions(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 60 }} aria-label="Decision" placeholder="Decision" value={decision} onChange={(e) => setDecision(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 60 }} aria-label="Reasoning" placeholder="Reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
                <textarea className="input" style={{ marginBottom: 8, minHeight: 60 }} aria-label="Expectation" placeholder="Expectation" value={expectation} onChange={(e) => setExpectation(e.target.value)} />
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
