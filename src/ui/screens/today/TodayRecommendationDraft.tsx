import { useEffect, useState, type ReactNode } from "react";
import { Compass } from "lucide-react";
import { getRecommendationDraft } from "../../../application/recommendationDraftQueries";
import type { RecommendationDraft } from "../../../engine/recommendationDraft";
import { Panel, SourceTag } from "../../foundation/primitives";
import "./todayRecommendationDraft.css";

const duration = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
/** One provisional starting point in the existing guidance slot. Confirmation remains the real check-in command. */
export function TodayRecommendationDraft({ dayId, now, refreshKey, busy, openCheckIn, onPresenceChange, fallback }: {
  dayId: string; now: number; refreshKey: number; busy: boolean; openCheckIn: () => void; fallback: ReactNode; onPresenceChange?: ((present: boolean) => void) | undefined;
}) {
  const [result, setResult] = useState<{ dayId: string; draft: RecommendationDraft } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setResult(null); setFailed(false);
    void getRecommendationDraft(dayId, new Date(now)).then(draft => {
      if (live) setResult(draft ? { dayId, draft } : null);
    }, () => { if (live) setFailed(true); });
    return () => { live = false; };
    // Evidence changes on a record refresh or lived-day change; no independent clock polling.
  }, [dayId, refreshKey]);
  const draft = result?.dayId === dayId ? result.draft : null;
  useEffect(() => { onPresenceChange?.(Boolean(draft)); }, [draft, onPresenceChange]);
  useEffect(() => () => { onPresenceChange?.(false); }, [onPresenceChange]);
  if (!draft) return <>{fallback}{failed && <p className="meta" role="status">The draft suggestion couldn’t be read. You can still check in.</p>}</>;
  return <section className="bf today-rec-draft" aria-label="Draft recommendation">
    <Panel headingId="today-draft-title" headingLevel={2} wide icon={<Compass size={18} />} label="A STARTING POINT" source={<SourceTag>DRAFT · NOT CONFIRMED</SourceTag>}>
      <p className="today-rec-draft__title">{draft.title}</p>
      <p className="bf-meta">{draft.reason}</p>
      {draft.nights.length > 0 && <div className="today-rec-draft__nights" aria-label="The two main sleeps">{draft.nights.map(night => <div key={night.livedDayStart}>
        <span>{new Date(night.livedDayStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {night.kind === "WORK" ? "work day" : "day off"}</span>
        <strong>{duration(night.minutes)} <small>main sleep</small></strong>
        <span>Usual {duration(night.low)}–{duration(night.high)}</span>
      </div>)}</div>}
      <p className="bf-meta">How you feel is still unknown. Check in to confirm or adjust; your answers decide the final guidance.</p>
      <button type="button" className="btn-primary" disabled={busy} onClick={openCheckIn}>CHECK IN TO CONFIRM OR ADJUST</button>
      <details><summary>Why this starting point</summary><p className="bf-meta">From your recorded {draft.nights.length ? "main sleeps and existing personal sleep ranges" : "work-ended and shift-down history"}, using BEYOND’s existing rules. No check-in answers, recommendation or plan have been saved. This draft does not change your capacity.</p></details>
    </Panel>
  </section>;
}
