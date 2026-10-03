import { useEffect, useState } from "react";
import { getWeeklySummary, type WeeklySummary } from "../../../application/weeklyQueries";
import { describePersonalRecord } from "../../../application/personalRecordQueries";
import { formatShortDate } from "../../../application/bodyTrendQueries";
import { formatUsd } from "../body/quitCopy";
import { describeExpenditure } from "./weeklyCopy";
import { describeBurdenLine, describeFindings, describeWaitingFindings } from "./weeklyCopy";
import { Ribbon } from "./Ribbon";

/**
 * Drop 7 (weekly check-in, owner approval 2026-10-01): one quiet, read-only
 * page over the last 7 days — weight, training, quit tracker, protein. Facts
 * and trends only (ROADMAP 1.0 "adherence-neutral" rule): a thin section
 * says "not enough data yet" rather than grading anything, and nothing here
 * compares against a target in a way that reads as pass/fail.
 */
/** Keeps a big week calm: the best PR per exercise, at most this many lines. */
const MAX_RECORD_LINES = 5;

export function WeeklyCheckInScreen({ now }: { now?: Date } = {}) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    let current = true;
    void getWeeklySummary(now)
      .then((next) => {
        if (current) setSummary(next);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [now]);

  return (
    <div className="screen">
      <h1 className="eyebrow">MORE // WEEKLY CHECK-IN</h1>
      <p className="meta" style={{ marginBottom: 16 }}>The last 7 days. LAST 28 DAYS and FINDINGS look further back.</p>
      {!summary ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <>
          {/* The Ribbon (2026-10-03): the last 28 lived days at a glance, above the week's numbers. */}
          <Section label="LAST 28 DAYS">
            <Ribbon days={summary.ribbon.days} templateLabels={summary.ribbon.templateLabels} proteinTargetG={summary.ribbon.proteinTargetG} />
          </Section>

          {/* Read-only findings (2026-10-03): counts over longer windows, never a cause or a rule. */}
          <Section label="FINDINGS">
            {describeFindings(summary.findings.findings, summary.findings.exerciseNames).map((copy) => (
              <div key={copy.key} data-finding={copy.key} style={{ marginBottom: 12 }}>
                <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{copy.title}</p>
                {copy.lines.map((line) => (
                  <p key={line} className="meta" style={{ margin: 0, color: "var(--text-2)" }}>{line}</p>
                ))}
                {copy.basis && <p className="meta" style={{ margin: "2px 0 0" }}>{copy.basis}</p>}
              </div>
            ))}
            {describeWaitingFindings(summary.findings.waiting) && (
              <p className="meta" style={{ margin: 0 }}>{describeWaitingFindings(summary.findings.waiting)}</p>
            )}
          </Section>

          <Section label="WEIGHT">
            {summary.weight.avgLbs === undefined ? (
              <p className="meta">Not enough data yet — no weigh-ins this week.</p>
            ) : (
              <>
                <p className="recommendation-title" style={{ marginBottom: 2 }}>
                  Avg {summary.weight.avgLbs.toFixed(1)} lb
                  {summary.weight.changeLbs !== undefined && Math.abs(summary.weight.changeLbs) >= 0.05
                    ? ` · ${summary.weight.changeLbs < 0 ? "down" : "up"} ${Math.abs(summary.weight.changeLbs).toFixed(1)}`
                    : summary.weight.changeLbs !== undefined
                      ? " · same as last week"
                      : ""}
                </p>
                <p className="meta" style={{ margin: 0 }}>
                  {summary.weight.weighIns} {summary.weight.weighIns === 1 ? "weigh-in" : "weigh-ins"}
                  {summary.weight.changeLbs === undefined ? " · no weigh-ins the week before to compare" : " · vs the week before"}
                </p>
                {summary.weight.projection.kind === "DATE" && (
                  <p className="meta" style={{ margin: "4px 0 0" }}>
                    Goal {summary.weight.goalWeightLbs} lb — at this pace, about {formatShortDate(summary.weight.projection.date)}
                  </p>
                )}
                {summary.weight.projection.kind === "REACHED" && (
                  <p className="meta" style={{ margin: "4px 0 0" }}>At or past your goal of {summary.weight.goalWeightLbs} lb</p>
                )}
              </>
            )}
          </Section>

          <Section label="TRAINING">
            <p className="recommendation-title" style={{ marginBottom: 2 }}>
              {summary.training.workouts} {summary.training.workouts === 1 ? "workout" : "workouts"}
              {summary.training.records.length > 0
                ? ` · ${summary.training.records.length} ${summary.training.records.length === 1 ? "PR" : "PRs"}`
                : ""}
            </p>
            {summary.training.records.slice(0, MAX_RECORD_LINES).map((r) => (
              <p key={r.exerciseName} className="meta" style={{ margin: 0 }}>
                {r.exerciseName}: {describePersonalRecord(r.record).replace("NEW PR — ", "")}
              </p>
            ))}
            {summary.training.records.length > MAX_RECORD_LINES && (
              <p className="meta" style={{ margin: 0 }}>and {summary.training.records.length - MAX_RECORD_LINES} more</p>
            )}
          </Section>

          {summary.quit && (
            <Section label={`QUIT: ${summary.quit.habitName.toUpperCase()}`}>
              <p className="recommendation-title" style={{ marginBottom: 2 }}>
                {summary.quit.cleanDays} of 7 days clean
              </p>
              {summary.quit.savedUsd !== undefined && (
                <p className="meta" style={{ margin: 0 }}>{formatUsd(summary.quit.savedUsd)} saved</p>
              )}
            </Section>
          )}

          <Section label="PROTEIN">
            {summary.protein.avgGrams === undefined ? (
              <p className="meta">Not enough data yet — no protein logged this week.</p>
            ) : (
              <>
                <p className="recommendation-title" style={{ marginBottom: 2 }}>
                  Avg {Math.round(summary.protein.avgGrams)} g a day
                </p>
                <p className="meta" style={{ margin: 0 }}>
                  Over {summary.protein.daysLogged} logged {summary.protein.daysLogged === 1 ? "day" : "days"}
                  {summary.protein.targetGrams !== undefined ? ` · target ${summary.protein.targetGrams} g` : ""}
                </p>
              </>
            )}
          </Section>

          {/* Drop 6: a read-only estimated range — never a target, never fed anywhere. */}
          <Section label="EXPENDITURE">
            {(() => {
              const copy = describeExpenditure(summary.expenditure);
              return (
                <>
                  {copy.headline && <p className="recommendation-title" style={{ marginBottom: 2 }}>{copy.headline}</p>}
                  <p className="meta" style={{ margin: 0 }}>{copy.detail}</p>
                </>
              );
            })()}
          </Section>

          {/* Drop 1 (Burden Meter): one neutral, read-only line. */}
          <Section label="BURDEN">
            <p className="meta" style={{ margin: 0 }}>{describeBurdenLine(summary.burden)}</p>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="equipment-row" aria-label={label}>
      <p className="tool-label" style={{ marginBottom: 6 }}>{label}</p>
      {children}
    </section>
  );
}
