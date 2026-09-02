import { useEffect, useRef, useState } from "react";
import { searchAll, type SearchResult } from "../../../application/searchQueries";
import { describeSearchDomain } from "./searchCopy";

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
export function SearchScreen({ onSelectResult }: { onSelectResult?: (result: SearchResult) => void } = {}) {
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
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError(false);
      return;
    }

    setResults([]);
    setSearched(false);
    setLoading(true);
    setError(false);

    try {
      const found = await searchAll(value);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
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
        Find a Mission, Obligation, or Capture by text. Read-only — every result, whatever its status.
      </p>

      <input
        type="text"
        className="input"
        aria-label="Search Missions, Obligations, and Capture"
        placeholder="Search…"
        value={query}
        onChange={(e) => void handleChange(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {!searched && !loading && !error && (
        <p className="empty-state" role="status" aria-live="polite">
          Type to search Missions, Obligations, and Capture.
        </p>
      )}
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
                {describeSearchDomain(result.domain)} · {result.status}
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
