import { useState } from "react";
import { searchAll, type SearchResult } from "../../../application/searchQueries";
import { describeSearchDomain } from "./searchCopy";

/**
 * Personal Search 1.0 (Post-FIELD Capability Acceleration Campaign,
 * Slice 2). Retrieval only — "can I find something BEYOND already
 * knows without remembering where it lives." Read-only: results are
 * plain rows, no tap-to-navigate, no mutation, no relevance scoring.
 * See src/application/searchQueries.ts for what's searched and why no
 * search library was added for this corpus size.
 */
export function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }
    setResults(await searchAll(value));
    setSearched(true);
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

      {!searched && <p className="empty-state">Type to search Missions, Obligations, and Capture.</p>}
      {searched && results.length === 0 && <p className="empty-state">No matches for "{query.trim()}".</p>}

      {results.map((result) => (
        <div className="card" key={`${result.domain}-${result.id}`}>
          <p className="meta" style={{ marginBottom: 2 }}>
            {describeSearchDomain(result.domain)} · {result.status}
          </p>
          <p className="card-body" style={{ margin: 0 }}>{result.title}</p>
          {result.context && <p className="meta" style={{ marginTop: 4 }}>{result.context}</p>}
        </div>
      ))}
    </div>
  );
}
