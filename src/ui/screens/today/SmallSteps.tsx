export function SmallSteps({ minimumDayAvailable = true, enabled, busy, onToggle, onOpen }: {
  minimumDayAvailable?: boolean; enabled: boolean; busy: boolean; onToggle: () => void; onOpen: (tool: "MINIMUM_DAY" | "CAPTURE") => void;
}) {
  return <section className="small-steps" aria-labelledby="small-steps-heading">
    <div className="small-steps__header">
      <h2 id="small-steps-heading">Keep it small</h2>
      <button type="button" className="btn-secondary" aria-pressed={enabled} disabled={busy} onClick={onToggle}>{enabled ? "USE FULL VIEW" : "USE SMALL STEPS"}</button>
    </div>
    {enabled && <>
      <p className="meta">You chose a smaller path. Capacity, plans and Engine guidance are unchanged.</p>
      <div className="small-steps__choices">
        {minimumDayAvailable && <button type="button" className="btn-secondary" disabled={busy} onClick={() => onOpen("MINIMUM_DAY")}><strong>Inspect Minimum Day</strong><span>The existing six basics, if helpful. Turning it on is your decision.</span></button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => onOpen("CAPTURE")}><strong>Put a thought down</strong><span>Write freely. Save only when you tap CAPTURE.</span></button>
      </div>
      <p className="meta">All controls remain below or in SYSTEM. Essentials stay visible.</p>
    </>}
  </section>;
}
