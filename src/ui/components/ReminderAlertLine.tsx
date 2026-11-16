import { useEffect, useState } from "react";
import { isClockTime, reminderAlertLine } from "../../application/bridgePlan";

/**
 * REMIND-AT-001: says, when a reminder time is set, whether it will actually alert under the 3-a-day cap, the task
 * alert switch, quiet hours and the shift rotation, e.g. "Won't alert: 23:30 is in your quiet hours". Never silent.
 */
export function ReminderAlertLine({ dueAt, remindAt, title, obligationId }: { dueAt: string; remindAt: string; title?: string; obligationId?: string }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setLine(null);
    if (!dueAt || !isClockTime(remindAt)) return;
    reminderAlertLine({ dueAt, remindAt, ...(title ? { title } : {}), ...(obligationId ? { obligationId } : {}) })
      .then((text) => { if (live) setLine(text); })
      .catch(() => { if (live) setLine("BEYOND couldn't check this reminder's alert. The time is still saved with the task."); });
    return () => { live = false; };
  }, [dueAt, remindAt, title, obligationId]);
  if (!dueAt || !isClockTime(remindAt) || !line) return null;
  return <p className="meta reminder-alert" role="status" data-silent={line.startsWith("Won't") ? "true" : undefined}>{line}</p>;
}
