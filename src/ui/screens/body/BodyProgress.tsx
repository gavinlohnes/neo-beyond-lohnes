import { useEffect, useRef, useState } from "react";
import { getWeeklySummary, type WeeklySummary } from "../../../application/weeklyQueries";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { describePersonalRecord } from "../../../application/personalRecordQueries";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { Ribbon } from "../weekly/Ribbon";
import { PersonalBaselines } from "../weekly/PersonalBaselines";
import { WeightTrend } from "./WeightTrend";
import { TransformationTimeline } from "./TransformationTimeline";
import { formatUsd } from "./quitCopy";
import type { HealthEvidenceRequest } from "../../../application/healthRecordQueries";
import type { SourceSelection } from "./HealthSources";
import { getBodyInsights, INSIGHT_DAY_MS, type BodyInsights } from "../../../application/bodyInsightsQueries";
import { InsightsExplorer, type InsightExploration } from "./InsightsExplorer";
import { BodyComposition } from "./BodyComposition";

export function BodyProgress({ refreshKey, weightHistory, goalWeightLbs, request, onSources, returnFocusRequest = 0, active = true }: {
  active?: boolean;
  returnFocusRequest?: number;
  request?: HealthEvidenceRequest | null;
  onSources?: ((selection: SourceSelection) => void) | undefined;
  refreshKey: number;
  weightHistory: readonly WeighIn[];
  goalWeightLbs?: number | undefined;
}) {
  const [exploration, setExploration] = useState<InsightExploration>({ metric: "weight", range: 28, pointId: null, focusDayId: null });
  useEffect(() => {
    if (request) {
      setExploration((state) => ({ ...state, metric: request.metric, pointId: null, focusDayId: request.dayId ?? null }));
      // An explicit metric entry reveals its chart; ordinary return preserves exploration.
      setTimelineOpen(false);
    }
  }, [request]);
  const readPending = useRef(false);
  const returnToObservation = useRef(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [insights, setInsights] = useState<BodyInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const restoreRetryFocus = useRef(false);
  const [usualOpen, setUsualOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  useEffect(() => {
    if (!active) return;
    let current = true;
    readPending.current = true;
    setFailed(false);
    setSummary(null);
    setInsights(null);
    void Promise.all([getWeeklySummary(), getBodyInsights()]).then(([next, data]) => {
      if (current) { readPending.current = false; setSummary(next); setInsights(data); }
    }).catch(() => { if (current) { readPending.current = false; setFailed(true); } });
    return () => { current = false; };
  }, [refreshKey, retry, active]);
  useEffect(() => {
    if (!summary || !restoreRetryFocus.current) return;
    restoreRetryFocus.current = false;
    if (document.activeElement === document.body) document.getElementById("health-progress-heading")?.focus({ preventScroll: true });
  }, [summary]);
  useEffect(() => { if (returnFocusRequest) returnToObservation.current = true; }, [returnFocusRequest]);
  useEffect(() => {
    if (!active || readPending.current || !summary || !insights || !returnToObservation.current) return;
    returnToObservation.current = false;
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (!focused || focused === document.body || focused.id === "health-progress-heading" || focused.closest("[hidden]")) document.getElementById("insight-view-records")?.focus({ preventScroll: true });
    });
  }, [summary, insights, returnFocusRequest, active]);
  return <BodyComposition active={active} refreshKey={refreshKey} metricRequest={request} weights={weightHistory} onWeight={() => { setExploration((state) => ({ ...state, metric: "weight", pointId: null, focusDayId: null })); setTimelineOpen(false); }}>
    {failed && <div role="alert"><p className="meta">Could not read your progress. Your records are unchanged.</p><button className="btn-secondary" onClick={() => { restoreRetryFocus.current = true; setRetry((value) => value + 1); }}>RETRY PROGRESS</button></div>}
    {!failed && (!summary || !insights) && <p className="meta" role="status">Loading your recorded progress…</p>}
    {!failed && summary && insights && <div className="health-progress">
    <InsightsExplorer data={insights} weights={weightHistory} goalWeightLbs={goalWeightLbs} hideChart={timelineOpen} exploration={exploration} onExploreChange={setExploration} onSources={onSources ? (point, metric) => onSources({ point, metric }) : undefined} />
    <p className="meta">Existing records, not a score. The weekly summary uses the last 7 days; the ribbon shows 28 lived days.</p>
    <section aria-label="Training accomplishments"><h3 className="tool-label">TRAINING</h3>
      <p className="health-reading">{summary.training.workouts} {summary.training.workouts === 1 ? "workout" : "workouts"} · {summary.training.records.length} {summary.training.records.length === 1 ? "PR" : "PRs"}</p>
      {summary.training.records.map((record) => <p className="meta" key={record.exerciseName}>{record.exerciseName}: {describePersonalRecord(record.record).replace("NEW PR — ", "")}</p>)}
    </section>
    {summary.quit && <section aria-label="Recorded clean days"><h3 className="tool-label">{summary.quit.habitName}</h3><p className="health-reading">{summary.quit.cleanDays} clean days recorded this week</p>{summary.quit.savedUsd !== undefined && <p className="meta">{formatUsd(summary.quit.savedUsd)} saved</p>}</section>}
    <details className="insights-inspect"><summary>Recent lived days · LAST 28 DAYS</summary><section aria-label="Recent lived days"><Ribbon dayPicker days={summary.ribbon.days} templateLabels={summary.ribbon.templateLabels} proteinTargetG={summary.ribbon.proteinTargetG} /></section></details>
    <section aria-label="Weight progress"><h3 className="tool-label">WEIGHT</h3>{weightHistory.length < 2 ? <p className="meta">{weightHistory.length ? "One weigh-in recorded. A trend needs more than one." : "No weigh-ins recorded. Your other progress is still available."}</p> : <><p className="meta">All-history milestones and the existing projection use weigh-ins through {new Date(weightHistory.at(-1)!.recordedAt).toLocaleDateString()}; they are not the selected-range average.</p><WeightTrend history={weightHistory} goalWeightLbs={goalWeightLbs} hideChart /></>}</section>
    {weightHistory.length >= 2 && Date.parse(weightHistory.at(-1)!.recordedAt) <= Date.parse(insights.readAt) - 90 * INSIGHT_DAY_MS && <details className="insights-inspect"><summary>Inspect last recorded weight window</summary><WeightTrend history={weightHistory} goalWeightLbs={goalWeightLbs} hideChart={timelineOpen} hideFacts /></details>}
    <FieldDisclosure summary={`${timelineOpen ? "HIDE" : "SHOW"} ACCOMPLISHMENT TIMELINE`} open={timelineOpen} onToggle={setTimelineOpen}>{timelineOpen && <TransformationTimeline />}</FieldDisclosure>
    <FieldDisclosure summary={`${usualOpen ? "HIDE" : "SHOW"} YOUR USUAL`} open={usualOpen} onToggle={setUsualOpen}><PersonalBaselines baselines={summary.baselines} /></FieldDisclosure>
  </div>}
  </BodyComposition>;
}
