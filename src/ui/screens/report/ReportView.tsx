import { useEffect, useState } from "react";
import { getReport, type Report, type ReportTiming } from "../../../application/reportQueries";
import { describeReportItem, describeReportTitle, describeTonightPosition } from "./reportCopy";
import { getTonightPosition, type TonightPosition } from "../../../application/tonightQueries";
import { getCustomTemplates } from "../../../application/customTemplateQueries";
import { templateLabel } from "../train/trainCopy";
import type { WorkoutTemplateId } from "../../../domain/workout/types";

/**
 * REPORT-001: the one report (Briefing on a work night, After Action on the
 * first day off, or from Weekly any time). At most six items; read only.
 */
export function ReportView({ timing = null, now, onClose }: { timing?: ReportTiming; now?: Date | undefined; onClose?: () => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [tonight, setTonight] = useState<(TonightPosition & { nextWorkoutLabel: string }) | null>(null);
  const briefing = timing === "BRIEFING";
  useEffect(() => {
    let current = true;
    void getReport(now).then((next) => {
      if (current) setReport(next);
    });
    // TONIGHT-001: the briefing leads with tonight's position.
    if (briefing) {
      void Promise.all([getTonightPosition(), getCustomTemplates()])
        .then(([position, custom]) => {
          if (current && position) setTonight({ ...position, nextWorkoutLabel: templateLabel(position.nextTemplateId as WorkoutTemplateId, custom) });
        })
        .catch(() => {});
    }
    return () => {
      current = false;
    };
  }, [now, briefing]);
  // In the briefing, tonight's position takes the block comparison's place.
  const items = report ? (briefing && tonight ? report.items.filter((item) => item.kind !== "BLOCK") : report.items) : [];
  const tonightCopy = briefing && tonight ? describeTonightPosition(tonight) : null;
  return (
    <section aria-label={describeReportTitle(timing)} data-report>
      {timing && <p className="tool-label" style={{ marginBottom: 8 }}>{describeReportTitle(timing)}</p>}
      {!report ? (
        <p className="meta">Loading…</p>
      ) : items.length === 0 && !tonightCopy ? (
        <p className="meta">Not enough data yet — the report starts once a work block is on the schedule.</p>
      ) : (
        <>
        {tonightCopy && (
          <div data-report-item="TONIGHT" style={{ marginBottom: 10 }}>
            <p className="meta-strong" style={{ margin: 0 }}>{tonightCopy.heading}</p>
            {tonightCopy.lines.map((line) => <p key={line} className="meta" style={{ margin: 0 }}>{line}</p>)}
          </div>
        )}
        {items.map((item) => {
          const copy = describeReportItem(item);
          return (
            <div key={item.kind} data-report-item={item.kind} style={{ marginBottom: 10 }}>
              <p className="meta-strong" style={{ margin: 0 }}>{copy.heading}</p>
              {copy.lines.map((line) => (
                <p key={line} className="meta" style={{ margin: 0 }}>{line}</p>
              ))}
            </div>
          );
        })}
        </>
      )}
      {onClose && (
        <button type="button" className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={onClose}>
          CLOSE
        </button>
      )}
    </section>
  );
}
