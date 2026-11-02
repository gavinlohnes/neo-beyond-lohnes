import { useEffect, useRef, useState } from "react";
import { searchAll, type SearchResult } from "../../../application/searchQueries";
import { describeSearchDomain } from "./searchCopy";
import { interpret, isQuestion } from "../../../application/helper/freeHelper";
import { answerQuestion } from "../../../application/helper/freeAnswers";
import { getSavedMeals } from "../../../application/nutritionQueries";
import { getUnresolvedObligations } from "../../../application/intentQueries";
import { getProjects } from "../../../application/projectQueries";
import { getRoutines } from "../../../application/routineCommands";
import { describeProposal } from "../../../application/alfred/alfredActions";
import { findCapabilities, type SystemCapability } from "../../systemCatalog";
import { askAlfred, doInBeyond } from "../../components/AlfredSheet";

/** COMMAND-BAR-001: what the one box can do with these words, before any record search. */
interface Command { q: string; go: SystemCapability[]; doIt: string[]; answer: string | null }
async function readCommand(q: string): Promise<Command> {
  const go = findCapabilities(q).slice(0, 4);
  if (isQuestion(q)) return { q, go, doIt: [], answer: await answerQuestion(q).catch(() => null) };
  const [meals, tasks, projects, routines] = await Promise.all([getSavedMeals(), getUnresolvedObligations(), getProjects(), getRoutines()]);
  const result = interpret(q, { now: new Date(), savedMeals: meals, openTasks: tasks, openProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED"), routines: routines.filter((r) => r.status === "ACTIVE") });
  return { q, go, doIt: result.unknown.length ? [] : result.cards.map(describeProposal), answer: null };
}

/**
 * Personal Search 1.0 (Post-FIELD Capability Acceleration Campaign,
 * Slice 2; tap-to-navigate added 2026-09-02). Retrieval, not command
 * execution — no mutation, no relevance scoring. See
 * src/application/searchQueries.ts for what's searched and why no
 * search library was added for this corpus size (still true: real
 * corpus size hasn't grown past what a linear substring scan handles
 * fine, so this stays independent of the Search Capability Map entry's
 * MiniSearch note, which is about ranking, not navigation).
 *
 * A result is a plain row when `onSelectResult` is omitted (e.g. a
 * future standalone/embedded use), and a real button — same visual
 * shape, real focus/keyboard support — when the caller wants tap-to-
 * navigate. This screen never decides what "navigate" means for a
 * given domain; that's the caller's job (see MoreScreen.tsx).
 */
export function SearchScreen({ onSelectResult, onRunCapability, hiddenCapability }: { onSelectResult?: (result: SearchResult) => void; onRunCapability?: (entry: SystemCapability) => void; hiddenCapability?: (entry: SystemCapability) => boolean } = {}) {
  const [command, setCommand] = useState<Command | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Only the request whose id still matches this ref when it settles is
  // the latest one — an older fulfillment/rejection is discarded instead
  // of overwriting newer UI state (see the SearchScreen concurrency
  // contract in tests/browser/SearchScreen.test.tsx).
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleChange(value: string) {
    setQuery(value);
    const requestId = ++requestIdRef.current;

    if (value.trim().length === 0) {
      setCommand(null);
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError(false);
      return;
    }

    setCommand(null);
    setResults([]);
    setSearched(false);
    setLoading(true);
    setError(false);

    try {
      const [found, next] = await Promise.all([searchAll(value), readCommand(value.trim()).catch(() => null)]);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setCommand(next ? { ...next, go: next.go.filter((entry) => !hiddenCapability?.(entry)) } : null);
      setResults(found);
      setSearched(true);
      setLoading(false);
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="eyebrow">MORE // SEARCH</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        One box: go anywhere, log it, ask your records, or find anything you've saved. Nothing is saved until you SAVE.
      </p>

      <input
        type="text"
        className="input"
        aria-label="Search everything"
        placeholder="Go, log, ask or find…"
        enterKeyHint="go"
        onKeyDown={(e) => {
          // Enter does the most useful thing: the free log if there is one, else the first screen.
          // Review of #380: only act on what was read for exactly these words, never a stale preview.
          if (e.key !== "Enter" || !command || loading || command.q !== query.trim()) return;
          if (command.doIt.length) { e.preventDefault(); doInBeyond(query.trim()); }
          else if (command.go[0] && onRunCapability) { e.preventDefault(); onRunCapability(command.go[0]); }
        }}
        value={query}
        onChange={(e) => void handleChange(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {!searched && !loading && !error && (
        <p className="empty-state" role="status" aria-live="polite">
          Try "16 oz water", "protein left?", "week ahead" or "bench".
        </p>
      )}
      {!loading && command && (command.answer || command.doIt.length > 0 || command.go.length > 0) && <div className="command-bar" role="group" aria-label="Do it">
        {command.answer && <div className="card command-bar__answer" role="status"><p className="meta">BEYOND · FREE</p><p className="card-body" style={{ margin: 0, whiteSpace: "pre-line" }}>{command.answer}</p></div>}
        {command.doIt.length > 0 && <button type="button" className="command-result" aria-label={`Log free: ${command.doIt.join("; ")}`} onClick={() => doInBeyond(query.trim())}>
          <span><strong>LOG FREE</strong><span>{command.doIt.join(" · ")}</span></span><span aria-hidden="true" className="command-result__go">›</span>
        </button>}
        {onRunCapability && command.go.map((entry) => <button key={entry.label} type="button" className="command-result" aria-label={`Go: ${entry.label} ${entry.description}`} onClick={() => onRunCapability(entry)}>
          <span><strong>{entry.label}</strong><span>{entry.description}</span></span><span aria-hidden="true" className="command-result__go">›</span>
        </button>)}
      </div>}
      {!loading && searched && query.trim() && <button type="button" className="btn-secondary" style={{ marginBlock: 8 }} onClick={() => askAlfred(query.trim())}>ASK ALFRED ABOUT THIS</button>}
      {loading && (
        <p className="empty-state" role="status" aria-live="polite">
          Searching…
        </p>
      )}
      {error && (
        <p className="empty-state" role="status" aria-live="polite">
          Search failed. Try again.
        </p>
      )}
      {!loading && !error && searched && results.length === 0 && (
        <p className="empty-state" role="status" aria-live="polite">
          No matches for "{query.trim()}".
        </p>
      )}

      {!loading &&
        !error &&
        results.map((result) => {
          const key = `${result.domain}-${result.id}`;
          const body = (
            <>
              <p className="meta" style={{ marginBottom: 2 }}>
                {describeSearchDomain(result.domain)}
                {result.status ? ` · ${result.status}` : ""}
              </p>
              <p className="card-body" style={{ margin: 0 }}>{result.title}</p>
              {result.context && <p className="meta" style={{ marginTop: 4 }}>{result.context}</p>}
            </>
          );
          if (!onSelectResult) {
            return (
              <div className="card" key={key}>
                {body}
              </div>
            );
          }
          return (
            <button
              type="button"
              className="card"
              key={key}
              style={{ display: "block", width: "100%", textAlign: "left" }}
              aria-label={`Open ${describeSearchDomain(result.domain)}: ${result.title}`}
              onClick={() => onSelectResult(result)}
            >
              {body}
            </button>
          );
        })}
    </div>
  );
}
