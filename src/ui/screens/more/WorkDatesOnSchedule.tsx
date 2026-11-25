import { useEffect, useState } from "react";
import { getWorkDatesOnSchedule, type WorkDateOnSchedule } from "../../../application/workRecords";
import { WORK_DATE_TYPE_LABEL, clockTime, dayKey, dayWords } from "../../../domain/workRecords";
import { ConfirmChangeOffer } from "../weekly/ScheduleExceptionControls";
import "./workRecord.css";

/**
 * GRAYSON-WORK-RECORD-001: in MORE · Work schedule, each upcoming court or training date on its day, with what that day
 * is on his rotation. When one lands on a day off, the item offers MARK AS WORK once: it opens the existing OT
 * confirmation (SCHEDULE-EXCEPTIONS-001's ConfirmChangeOffer, prefilled for that day). That saves nothing by itself;
 * his CONFIRM there does, as today, and then the day is a confirmed work day and the offer is gone.
 */
export function WorkDatesOnSchedule({ now: fixedNow, onOpenWorkRecord }: { now?: Date; onOpenWorkRecord?: () => void }) {
  const [items, setItems] = useState<WorkDateOnSchedule[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const now = fixedNow ?? new Date();
  const today = dayKey(now);
  useEffect(() => {
    let live = true;
    void getWorkDatesOnSchedule(fixedNow ?? new Date()).then((x) => { if (live) setItems(x); }, () => { if (live) setItems([]); });
    return () => { live = false; };
  }, [fixedNow, tick]);
  if (!items) return null;
  return <section className="work-record work-dates-on-schedule" aria-labelledby="wds-title" data-work-dates>
    <p className="section-label" id="wds-title">Work dates</p>
    {!items.length ? <p className="meta">No court or training dates in the next 60 days.</p>
      : <ul className="work-record__list">{items.map(({ record: r, day, confirmed, offerMarkAsWork }) => <li key={r.id} className="work-record__item" data-work-date={r.date} aria-label={r.title}>
        <p className="work-record__title">{r.title} · {dayWords(r.date!, today)}{r.time ? ` ${clockTime(r.time)}` : ""}</p>
        <p className="work-record__detail">{WORK_DATE_TYPE_LABEL[r.workType ?? "OTHER"]} · {day === null ? "save your schedule to see that day" : confirmed ? `a confirmed ${day === "WORK" ? "work day" : "day off"}` : day === "WORK" ? "a work day" : "a day off"}</p>
        {offerMarkAsWork && (open === r.id
          ? <ConfirmChangeOffer date={r.date!} to="WORK" swapWith={[]} onConfirmed={() => setTick((n) => n + 1)} />
          : <div className="work-record__actions"><button type="button" className="btn-secondary" onClick={() => setOpen(r.id)}>MARK AS WORK</button></div>)}
      </li>)}</ul>}
    {onOpenWorkRecord && <div className="work-record__actions"><button type="button" className="btn-secondary" onClick={onOpenWorkRecord}>OPEN WORK RECORD</button></div>}
  </section>;
}
