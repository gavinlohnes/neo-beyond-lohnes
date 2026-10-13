import { useEffect, useRef, useState } from "react";
import { GENERIC_MORE_STARTS, getGuidedMoreStarts, type MoreStarts, type MoreStart } from "../../../application/guidedMoreQueries";
import { describeError } from "../../errorMessage";

export function GuidedOverview({ active, canOpenCapture, onOpen }: { active: boolean; canOpenCapture: boolean; onOpen: (destination: MoreStart["destination"]) => void }) {
  const [starts, setStarts] = useState<MoreStarts>(GENERIC_MORE_STARTS);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    async function read() {
      const request = ++sequence.current;
      setState("loading");
      setError("");
      try {
        const next = await getGuidedMoreStarts();
        if (disposed || request !== sequence.current) return;
        // Record-driven, not daily churn. Unchanged canonical context keeps its
        // existing values; reads never rotate prompts or disturb navigation drafts.
        setStarts((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
        setState("ready");
      } catch (cause) {
        if (disposed || request !== sequence.current) return;
        setError(describeError(cause, "Could not read starting context."));
        setState("error");
      }
    }
    void read();
    function onVisible() { if (document.visibilityState === "visible") void read(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [active, retry]);
  const visible = state === "ready" ? starts : GENERIC_MORE_STARTS;
  return <section className="guided-overview" aria-labelledby="guided-more-heading">
    <h2 id="guided-more-heading" className="guided-title">A place to start</h2>
    <p className="meta">Optional starts—not recommendations.</p>
    <ol className="guided-starts">{visible.map((start) => <li key={start.id}>
      <h3>{start.title}</h3><p className="meta">{start.basis}</p>
      <button type="button" className="btn-secondary" disabled={start.destination === "CAPTURE" && !canOpenCapture} onClick={() => onOpen(start.destination)}>{start.action}</button>
      {start.destination === "CAPTURE" && !canOpenCapture && <p className="meta">Open Capture on TODAY.</p>}
    </li>)}</ol>
    {state === "loading" && <p role="status" className="meta">Reading context… Generic starts are available meanwhile.</p>}
    {state === "error" && <div><p role="alert" className="meta">{error} Context is unavailable; these are generic starts, not findings about your records.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY STARTING CONTEXT</button></div>}
    <details className="more-inspection"><summary>Why these starts?</summary><p className="meta">Fixed reflection and direction slots use counts of unresolved Capture notes, open Journal decisions, current-eligible commitments and active Missions. They change with relevant records, not the date. No due-date ranking or inference. Opening a path records nothing; TODAY keeps the Engine’s one primary recommendation.</p></details>
  </section>;
}
