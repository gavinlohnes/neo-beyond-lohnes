import { useEffect, useRef, useState } from "react";
import { getWeeklyDashboard, type WeeklyDashboard as Dashboard } from "../../../application/weeklyDashboardQueries";
import { CONTEXT_FLOOR_DAYS, weekPattern, type PatternMode } from "../../../engine/weeklyDashboard";
import type { ReviewRow } from "../../../engine/reviewOverview";
import { describePersonalRecord } from "../../../application/personalRecordQueries";
import { Readout, ReadoutGrid } from "../../components/ReadoutGrid";
import { describeFindings, describeWaitingFindings } from "../weekly/weeklyCopy";
import { describeError } from "../../errorMessage";
import { WeeklyReviewPanel } from "./WeeklyReviewPanel";
import { MonthlyBodyReview } from "./MonthlyBodyReview";
import { getMonthlyReview, type MonthlyReview } from "../../../application/monthlyReviewQueries";

/**
 * REVIEW-001 Weekly Review dashboard (owner-approved 2026-10-18; Claude Code),
 * the prototype's MORE → Weekly Review in the prototype's order: the week and
 * its headline numbers, the seven lived days with a day's detail, patterns by
 * work and off days, a metric explorer, findings, accomplishments, and carry
 * forward (the saved-review form from #238). Read only apart from that form.
 * Facts and counts — never a grade — in neutral ink; missing stays missing.
 */

type Metric = "sleepHours" | "protein" | "water" | "weight";
const METRICS: { key: Metric; label: string; unit: string; digits: number }[] = [
  { key: "sleepHours", label: "SLEEP", unit: "h", digits: 1 },
  { key: "protein", label: "PROTEIN", unit: "g", digits: 0 },
  { key: "water", label: "WATER", unit: "oz", digits: 0 },
  { key: "weight", label: "WEIGHT", unit: "lb", digits: 1 },
];

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const weekday = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
const lastDayOf = (week: { end: string }) => new Date(Date.parse(week.end) - 86_400_000).toISOString();
function fixed(n: number | undefined, digits: number, unit: string): string {
  return n === undefined ? "Not recorded" : `${n.toFixed(digits)} ${unit}`;
}
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
function contextLabel(row: ReviewRow): string {
  return row.context === "WORK" ? "WORK DAY" : row.context === "OFF" ? "DAY OFF" : "CONTEXT UNKNOWN";
}

export function WeeklyDashboard({ active = true, onOpenHistory }: { active?: boolean; onOpenHistory?: ((id: string) => void) | undefined }) {
  const [weeksBack, setWeeksBack] = useState(0);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<PatternMode>("ALL");
  const [metric, setMetric] = useState<Metric>("sleepHours");
  const [reviewRequest, setReviewRequest] = useState(0);
  const version = useRef(0);
  // REVIEW-001 monthly review: every 4th week from the first saved review adds body composition.
  const [monthly, setMonthly] = useState<{ weekStart: string; review: MonthlyReview } | null>(null);
  const [monthlyError, setMonthlyError] = useState(false);
  const weekStart = data?.week.start;
  useEffect(() => {
    if (!active || !data) return;
    let alive = true;
    setMonthlyError(false);
    void getMonthlyReview(data.week)
      .then((review) => { if (alive) setMonthly({ weekStart: data.week.start, review }); })
      .catch(() => { if (alive) setMonthlyError(true); });
    // Leaving, or starting another read, drops the earlier result first: it may
    // show photos hidden since, so nothing renders until a current read lands.
    return () => { alive = false; setMonthly(null); };
    // Re-read when the shown week changes, on re-entry, and after a save changes the cadence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, weekStart, data?.saved?.id]);

  useEffect(() => {
    if (!active) return;
    const request = ++version.current;
    let alive = true;
    setError(null);
    void getWeeklyDashboard(weeksBack)
      .then((next) => {
        if (!alive || request !== version.current) return;
        setData(next);
        // Open on the latest recorded day of the week, as the prototype does.
        const lastRecorded = next.rows.map((row) => row.dayIds.length > 0).lastIndexOf(true);
        setSelected((current) => (data && data.week.start === next.week.start ? current : Math.max(0, lastRecorded)));
      })
      .catch((cause: unknown) => {
        if (alive && request === version.current) setError(describeError(cause, "Could not read this week."));
      });
    return () => {
      alive = false;
    };
    // `data` is read only to keep a selection when the same week is re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, weeksBack, retry]);

  if (error) {
    return (
      <section className="weekly-dashboard" aria-label="Weekly review">
        <p role="alert">{error} This week's evidence is unavailable, not empty.</p>
        <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY WEEK</button>
      </section>
    );
  }
  if (!data) return <p role="status">Reading the latest completed week…</p>;

  const { week, rows, headline } = data;
  const day = rows[selected] ?? rows[0]!;
  const pattern = weekPattern(rows, mode);
  const isLatest = data.weeksBack === 0;
  const weightChange = headline.weight;
  const monthlyReview = !monthlyError && monthly?.weekStart === week.start ? monthly.review : null;
  const kind = monthlyReview?.monthly ? "MONTHLY REVIEW" : "WEEKLY REVIEW";

  return (
    <section className="weekly-dashboard" aria-label="Weekly review">
      {/* Week and headline numbers */}
      <div className="weekly-dashboard__hero">
        <p className="tool-label">{kind} · {isLatest ? "LATEST COMPLETED WEEK" : plural(data.weeksBack, "WEEK EARLIER", "WEEKS EARLIER")}</p>
        <h2 id="weekly-dashboard-heading" className="weekly-dashboard__range">{longDate(week.start)} — {longDate(lastDayOf(week))}</h2>
        <p className="meta">Lived days, 16:30 to 16:30, Monday through Sunday. {plural(headline.recordedDays, "of 7 days has", "of 7 days have")} completed records.</p>
        <div className="weekly-dashboard__nav">
          <button type="button" className="btn-secondary" disabled={!data.hasEarlier} onClick={() => setWeeksBack((n) => n + 1)}>← PREVIOUS WEEK</button>
          <button type="button" className="btn-secondary" disabled={isLatest} onClick={() => setWeeksBack((n) => Math.max(0, n - 1))}>NEXT WEEK →</button>
        </div>
        <ReadoutGrid className="weekly-dashboard__metrics">
          <Readout
            label="SLEEP / AVERAGE"
            value={fixed(headline.sleep.mean, 1, "h")}
            detail={`${fixed(headline.sleep.work.mean, 1, "h")} work · ${fixed(headline.sleep.off.mean, 1, "h")} off · ${plural(headline.sleep.days, "day", "days")}`}
          />
          <Readout label="PROTEIN / AVERAGE" value={fixed(headline.protein.mean, 0, "g")} detail={`Recorded on ${plural(headline.protein.days, "day", "days")}`} />
          <Readout label="TRAINING" value={plural(headline.sessions, "session", "sessions")} detail="Completed or partial strength sessions" />
          <Readout
            label="WEIGHT CHANGE"
            value={weightChange ? `${weightChange.change > 0 ? "+" : ""}${weightChange.change.toFixed(1)} lb` : "Not enough"}
            detail={weightChange ? `${longDate(weightChange.firstDay)} to ${longDate(weightChange.lastDay)}, first to last recorded` : "Needs two weighed days this week"}
          />
        </ReadoutGrid>
        <p className="meta">Work and off-day sleep each need {CONTEXT_FLOOR_DAYS} logged days. Food figures are logged amounts, not verified total intake.</p>
        {isLatest ? (
          <div className="weekly-dashboard__status">
            <div>
              <p className="card-title">{data.saved ? "Review saved" : "Review ready"}</p>
              <p className="meta">Explore the evidence, then decide what to carry forward.</p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setReviewRequest((n) => n + 1)}>
              {data.saved ? "EDIT REVIEW →" : "COMPLETE REVIEW →"}
            </button>
          </div>
        ) : (
          <p className="meta">{data.saved ? "A review was saved for this week; it is shown under Carry forward." : "No review was saved for this week."}</p>
        )}
        {isLatest && monthlyReview && !monthlyReview.monthly && monthlyReview.weeksUntil !== null && (
          <p className="meta">Monthly review in {plural(monthlyReview.weeksUntil, "week", "weeks")}. It adds body composition: weight, measurements and photos.</p>
        )}
      </div>

      {monthlyReview?.body && <MonthlyBodyReview body={monthlyReview.body} />}
      {monthlyError && <p className="meta" role="status">Body composition for this month couldn’t be read. The weekly review below is unaffected.</p>}

      {/* The seven lived days */}
      <div className="weekly-dashboard__panel">
        <h3 className="tool-label">THE SEVEN LIVED DAYS</h3>
        <div className="weekly-dashboard__strip" role="group" aria-label="Days of this week">
          {rows.map((row, index) => (
            <button
              key={row.start}
              type="button"
              className={`weekly-day${index === selected ? " weekly-day--selected" : ""}`}
              aria-pressed={index === selected}
              aria-label={`${weekday(row.start)} ${longDate(row.start)}: ${row.dayIds.length === 0 ? "no completed records" : `sleep ${fixed(row.sleepHours, 1, "h")}, protein ${fixed(row.protein, 0, "g")}, ${plural(row.sessions, "session", "sessions")}, ${contextLabel(row).toLowerCase()}`}`}
              onClick={() => setSelected(index)}
            >
              <span aria-hidden="true" className="weekly-day__name">{weekday(row.start)}</span>
              <span aria-hidden="true" className="weekly-day__date">{new Date(row.start).getDate()}</span>
              <span aria-hidden="true" className="weekly-day__bars">
                <i className="weekly-day__bar weekly-day__bar--sleep" style={{ height: `${Math.max(3, ((row.sleepHours ?? 0) / 9) * 32)}px` }} />
                <i className="weekly-day__bar weekly-day__bar--protein" style={{ height: `${Math.max(3, Math.min(1, (row.protein ?? 0) / 200) * 32)}px` }} />
                <i className="weekly-day__bar weekly-day__bar--training" style={{ height: `${row.sessions > 0 ? 28 : 3}px` }} />
              </span>
              <span aria-hidden="true" className="weekly-day__tag">{row.context === "WORK" ? "SHIFT" : row.context === "OFF" ? "OFF" : "—"}</span>
            </button>
          ))}
        </div>
        <p className="meta">Bars, left to right: sleep, protein, training. Select a day to see its record.</p>
      </div>

      {/* Day detail */}
      <div className="weekly-dashboard__panel" aria-live="polite">
        <h3 className="tool-label">DAY DETAIL · {weekday(day.start)} {longDate(day.start)}</h3>
        {day.dayIds.length === 0 ? (
          <p className="card-body">No completed records for this lived day.</p>
        ) : (
          <>
            <p className="meta">{contextLabel(day)} · {day.sessions > 0 ? plural(day.sessions, "strength session", "strength sessions") : "No strength session"}</p>
            <ReadoutGrid className="weekly-dashboard__detail">
              <Readout label="SLEEP" value={day.ambiguousSleep ? "Multiple main sleeps" : fixed(day.sleepHours, 1, "h")} />
              <Readout label="PROTEIN" value={fixed(day.protein, 0, "g")} />
              <Readout label="WATER" value={fixed(day.water, 0, "oz")} />
              <Readout label="WEIGHT" value={fixed(day.weight, 1, "lb")} />
            </ReadoutGrid>
            {onOpenHistory &&
              day.dayIds.map((id, index) => (
                <button key={id} type="button" className="btn-secondary" onClick={() => onOpenHistory(id)}>
                  {day.dayIds.length > 1 ? `INSPECT DAY EVENTS, PART ${index + 1} →` : "INSPECT DAY EVENTS →"}
                </button>
              ))}
          </>
        )}
      </div>

      {/* Patterns */}
      <div className="weekly-dashboard__panel">
        <h3 className="tool-label">PATTERNS WORTH NOTICING</h3>
        <div className="weekly-dashboard__toggle" role="group" aria-label="Which days to compare">
          {(["ALL", "WORK", "OFF"] as const).map((m) => (
            <button key={m} type="button" className={`chip${mode === m ? " chip--selected" : ""}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <ReadoutGrid className="weekly-dashboard__metrics">
          <Readout label="DAYS" value={pattern.days} detail={mode === "ALL" ? "All recorded days" : mode === "WORK" ? "Declared work days" : "Declared days off"} />
          <Readout label="SLEEP" value={fixed(pattern.sleep.mean, 1, "h")} detail={pattern.sleep.mean === undefined && mode !== "ALL" ? `Needs ${CONTEXT_FLOOR_DAYS} sleep-logged days (${pattern.sleep.days})` : `Average · ${plural(pattern.sleep.days, "day", "days")}`} />
          <Readout label="PROTEIN" value={fixed(pattern.protein.mean, 0, "g")} detail={pattern.protein.mean === undefined && mode !== "ALL" ? `Needs ${CONTEXT_FLOOR_DAYS} protein-logged days (${pattern.protein.days})` : `Average · ${plural(pattern.protein.days, "day", "days")}`} />
        </ReadoutGrid>
        <p className="tool-label" style={{ marginTop: 16 }}>SLEEP BY CONTEXT</p>
        {([["Work days", headline.sleep.work], ["Days off", headline.sleep.off]] as const).map(([label, value]) => (
          <div className="weekly-barline" key={label}>
            <span className="weekly-barline__label">{label}</span>
            <span className="weekly-barline__track" aria-hidden="true"><span className="weekly-barline__fill" style={{ width: `${Math.min(100, ((value.mean ?? 0) / 9) * 100)}%` }} /></span>
            <span className="weekly-barline__value">{value.mean === undefined ? `Needs ${CONTEXT_FLOOR_DAYS} days (${value.days})` : `${value.mean.toFixed(1)} h`}</span>
          </div>
        ))}
        <p className="meta">Evidence, not diagnosis: these are counts and recorded averages from declared work context. They do not establish a cause or a personal baseline.</p>
      </div>

      {/* Metric explorer */}
      <MetricExplorer rows={rows} metric={metric} selected={selected} onMetric={setMetric} onSelect={setSelected} />

      {/* Findings */}
      <div className="weekly-dashboard__panel">
        <h3 className="tool-label">FINDINGS · SHOW THE EVIDENCE</h3>
        <p className="meta">The existing read-only findings, counted over the 45 days to the end of this week.</p>
        {describeFindings(data.findings.findings, data.findings.exerciseNames).map((copy) => (
          <div key={copy.key} className="weekly-dashboard__finding">
            <p className="card-title">{copy.title}</p>
            {copy.lines.map((line) => <p key={line} className="card-body">{line}</p>)}
          </div>
        ))}
        {data.findings.findings.length === 0 && <p className="card-body">No findings yet for this window.</p>}
        {describeWaitingFindings(data.findings.waiting) && <p className="meta">{describeWaitingFindings(data.findings.waiting)}</p>}
      </div>

      {/* Accomplishments */}
      <div className="weekly-dashboard__panel">
        <h3 className="tool-label">ACCOMPLISHMENTS &amp; MEANING</h3>
        <div className="weekly-dashboard__listrow">
          <p className="card-title">Training recorded</p>
          <p className="card-body">{headline.sessions > 0 ? `${plural(headline.sessions, "strength session", "strength sessions")} on ${plural(headline.trainingDays, "day", "days")}.` : "No strength session recorded this week."}</p>
        </div>
        <div className="weekly-dashboard__listrow">
          <p className="card-title">Personal records</p>
          {data.records.length === 0 ? (
            <p className="card-body">None set this week.</p>
          ) : (
            data.records.map((record) => (
              <p key={record.setId} className="card-body"><span className="pr-tag">PR</span> {record.exerciseName}: {describePersonalRecord(record.record).replace("NEW PR — ", "")}</p>
            ))
          )}
        </div>
        <div className="weekly-dashboard__listrow">
          <p className="card-title">Weight observed</p>
          <p className="card-body">{weightChange ? `${Math.abs(weightChange.change).toFixed(1)} lb ${weightChange.change < 0 ? "lower" : weightChange.change > 0 ? "higher" : "unchanged"} between the first and last recorded weigh-in.` : "Not enough weigh-ins this week to compare."}</p>
        </div>
        <p className="meta">A good week does not require perfect numbers. What mattered beyond the metrics goes in your note below.</p>
      </div>

      {/* Carry forward */}
      <div className="weekly-dashboard__panel">
        <h3 className="tool-label">CARRY FORWARD</h3>
        {isLatest ? (
          <WeeklyReviewPanel active={active} showFacts={false} openRequest={reviewRequest} />
        ) : data.saved ? (
          <div>
            <p className="card-title">{data.saved.focus?.text ?? "No focus chosen"}</p>
            <p className="card-body">{data.saved.note || "No note recorded."}</p>
            <p className="meta">Saved {new Date(data.saved.recordedAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}. Earlier versions remain in History.</p>
          </div>
        ) : (
          <p className="card-body">No review was saved for this week. Reviews are saved for the latest completed week.</p>
        )}
      </div>
    </section>
  );
}

function MetricExplorer({ rows, metric, selected, onMetric, onSelect }: {
  rows: ReviewRow[];
  metric: Metric;
  selected: number;
  onMetric: (metric: Metric) => void;
  onSelect: (index: number) => void;
}) {
  const spec = METRICS.find((m) => m.key === metric)!;
  const values = rows.map((row) => row[metric]);
  const known = values.filter((v): v is number => v !== undefined);
  const min = known.length ? Math.min(...known) : 0;
  const max = known.length ? Math.max(...known) : 1;
  const x = (i: number) => 20 + i * (280 / 6);
  const y = (v: number) => 100 - ((v - min) / Math.max(1e-9, max - min || 1)) * 72;
  const points = values.flatMap((v, i) => (v === undefined ? [] : [{ i, v }]));
  return (
    <div className="weekly-dashboard__panel">
      <h3 className="tool-label">METRIC EXPLORER</h3>
      <div className="weekly-dashboard__toggle" role="group" aria-label="Metric to explore">
        {METRICS.map((m) => (
          <button key={m.key} type="button" className={`chip${metric === m.key ? " chip--selected" : ""}`} aria-pressed={metric === m.key} onClick={() => onMetric(m.key)}>{m.label}</button>
        ))}
      </div>
      <svg className="weekly-explorer" viewBox="0 0 320 124" role="img" aria-label={`${spec.label.toLowerCase()} across the week; the summary below gives the values`}>
        <line x1="12" x2="308" y1="108" y2="108" stroke="currentColor" opacity=".3" />
        {points.length > 1 && <polyline points={points.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" opacity=".75" />}
        {rows.map((row, i) => (
          <g key={row.start} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            <rect x={x(i) - 18} y="4" width="36" height="118" fill="transparent" />
            {values[i] !== undefined && <circle cx={x(i)} cy={y(values[i]!)} r={i === selected ? 6 : 3.5} fill={i === selected ? "var(--bg, #000)" : "currentColor"} stroke="currentColor" strokeWidth="2" />}
            <text x={x(i)} y="121" textAnchor="middle" className="weekly-explorer__label">{weekday(row.start).slice(0, 2)}</text>
          </g>
        ))}
      </svg>
      <p className="meta">
        {known.length === 0
          ? `No ${spec.label.toLowerCase()} recorded this week.`
          : `Recorded on ${plural(known.length, "day", "days")} of 7 · ${min.toFixed(spec.digits)} to ${max.toFixed(spec.digits)} ${spec.unit}. Selected: ${weekday(rows[selected]!.start)} ${fixed(values[selected], spec.digits, spec.unit)}.`}
        {" "}Missing days are not treated as zero.
      </p>
    </div>
  );
}
