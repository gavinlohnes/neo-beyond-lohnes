import { useEffect, useState } from "react";
import { useReportPresence } from "../../components/usePresence";
import { getWorkDue } from "../../../application/workRecords";
import { workDueLine, type WorkDueItem } from "../../../domain/workRecords";
import { openRecord } from "../../openRecordEvent";
import "../more/workRecord.css";

/**
 * GRAYSON-WORK-RECORD-001: TODAY's WORK_DUE quiet line. It names the nearest work-record item inside its reminder
 * window ("Court Thursday 9:00 AM", "CPR card expires Dec 15, in 21 days", "Two-year mark in 30 days"), with "+1 more"
 * inside the line when more are due. Tapping opens the item in MORE · Work record, where DONE or RENEWED clears it.
 * No alert, no red. It tells TODAY when it has something, and stays out of sight while tucked.
 */
export function WorkDueLine({ now, tucked = false, onPresence }: { now: Date; tucked?: boolean; onPresence?: (shown: boolean) => void }) {
  const [due, setDue] = useState<WorkDueItem[]>([]);
  const minute = Math.floor(now.getTime() / 60_000);
  useEffect(() => {
    let live = true;
    void getWorkDue(new Date(minute * 60_000)).then((items) => { if (live) setDue(items); }, () => { if (live) setDue([]); });
    return () => { live = false; };
  }, [minute]);
  const text = workDueLine(due);
  useReportPresence(!!text, onPresence);
  if (!text || tucked) return null;
  const first = due[0]!;
  return <p className="today-work-due" data-work-due>
    <button type="button" className="today-work-due__open" aria-label={`${text}. Open in Work record`} onClick={() => openRecord({ kind: "WORK_RECORD", id: first.record.id })}>{text}</button>
  </p>;
}
