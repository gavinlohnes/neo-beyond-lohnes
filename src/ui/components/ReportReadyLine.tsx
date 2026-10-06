import { useEffect, useState } from "react";
import { getReportTiming, type ReportTiming } from "../../application/reportQueries";
import { ReportView } from "../screens/report/ReportView";
import { describeReportLine } from "../screens/report/reportCopy";

/**
 * REPORT-001: TODAY's one line — "BRIEFING READY" on a work night between
 * 0200 and 0500, "AFTER ACTION READY" on the first day off after a work
 * block. OPEN shows the report in place. Once opened, the line steps back
 * for the rest of that day (remembered on this device only; the report
 * itself stays one tap away in Weekly). It renders inside TODAY's banners,
 * like the backup line, so it adds no phase row.
 */
const SEEN_KEY = "beyond.reportSeen";

export function seenKey(timing: Exclude<ReportTiming, null>, now: Date): string {
  return `${timing}:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function wasSeen(key: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === key;
  } catch {
    return false;
  }
}

export function markSeen(key: string): void {
  try {
    localStorage.setItem(SEEN_KEY, key);
  } catch {
    // Not remembered — the line simply shows again next time.
  }
}

export function ReportReadyLine({ now }: { now?: Date | undefined } = {}) {
  const [timing, setTiming] = useState<ReportTiming>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Re-checked every minute, so a TODAY left open across 0200 (or 0600) still offers it.
  useEffect(() => {
    let current = true;
    const check = () =>
      void getReportTiming(now)
        .then((next) => {
          if (current) setTiming(next);
        })
        .catch(() => {});
    check();
    const timer = now ? undefined : setInterval(check, 60_000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [now]);

  if (!timing) return null;
  const key = seenKey(timing, now ?? new Date());
  if (!open && (dismissed || wasSeen(key))) return null;
  if (open) {
    return (
      <div className="backup-due">
        <div className="equipment-row">
          <ReportView
            timing={timing}
            now={now}
            onClose={() => {
              setOpen(false);
              setDismissed(true);
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="backup-due">
      {/* A neutral edge, not the backup line's red: a report is information, not a warning. */}
      <div className="backup-due__row" style={{ justifyContent: "space-between", borderLeftColor: "var(--border-strong)" }}>
        <p className="tool-label" style={{ margin: 0 }}>{describeReportLine(timing)}</p>
        <button
          type="button"
          className="chip"
          style={{ padding: "8px 14px" }}
          aria-label={timing === "BRIEFING" ? "Open the briefing" : "Open the after action report"}
          onClick={() => {
            markSeen(key);
            setOpen(true);
          }}
        >
          OPEN
        </button>
      </div>
    </div>
  );
}
