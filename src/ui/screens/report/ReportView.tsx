import { useEffect, useState } from "react";
import { getReport, type Report, type ReportTiming } from "../../../application/reportQueries";
import { describeReportItem, describeReportTitle } from "./reportCopy";

/**
 * REPORT-001: the one report (Briefing on a work night, After Action on the
 * first day off, or from Weekly any time). At most five items; read only.
 */
export function ReportView({ timing = null, now, onClose }: { timing?: ReportTiming; now?: Date | undefined; onClose?: () => void }) {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let current = true;
    void getReport(now).then((next) => {
      if (current) setReport(next);
    });
    return () => {
      current = false;
    };
  }, [now]);
  return (
    <section aria-label={describeReportTitle(timing)} data-report>
      {timing && <p className="tool-label" style={{ marginBottom: 8 }}>{describeReportTitle(timing)}</p>}
      {!report ? (
        <p className="meta">Loading…</p>
      ) : report.items.length === 0 ? (
        <p className="meta">Not enough data yet — the report starts once a work block is on the schedule.</p>
      ) : (
        report.items.map((item) => {
          const copy = describeReportItem(item);
          return (
            <div key={item.kind} data-report-item={item.kind} style={{ marginBottom: 10 }}>
              <p className="meta-strong" style={{ margin: 0 }}>{copy.heading}</p>
              {copy.lines.map((line) => (
                <p key={line} className="meta" style={{ margin: 0 }}>{line}</p>
              ))}
            </div>
          );
        })
      )}
      {onClose && (
        <button type="button" className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={onClose}>
          CLOSE
        </button>
      )}
    </section>
  );
}
