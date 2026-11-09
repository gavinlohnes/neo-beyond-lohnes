import { useEffect, useState } from "react";
import { getImportedSleep } from "../../../application/externalSleepQueries";
import { getDaySummaries } from "../../../application/dayLedgerQueries";
import { sleepRhythmFrom, type SleepRhythm } from "../../../application/sleepRhythmQueries";
import { describeGroup, describeShift } from "../today/SleepRhythm";

/** JOURNAL-LEARN-001 (part 3): SLEEP-RHYTHM-001's words, in Personal Understanding. Read only. */
export function SleepRhythmLines({ active }: { active: boolean }) {
  const [rhythm, setRhythm] = useState<SleepRhythm | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void Promise.all([getImportedSleep(), getDaySummaries()]).then(([records, summaries]) => { if (live) setRhythm(sleepRhythmFrom(records, summaries)); }).catch(() => { if (live) setRhythm("ERROR"); });
    return () => { live = false; };
  }, [active]);
  if (rhythm === "ERROR") return <p className="meta">Sleep rhythm couldn't be read. Your records are unchanged.</p>;
  if (!rhythm) return null;
  if (!rhythm.groups.length) return <p className="meta">Not enough measured Garmin nights on work days or days off yet.</p>;
  return <>
    {rhythm.groups.map((g) => <p key={g.kind}>{describeGroup(g)}</p>)}
    {rhythm.offMinusWork !== null && Math.abs(rhythm.offMinusWork) >= 30 && <p>{describeShift(rhythm.offMinusWork)}</p>}
    <p className="meta">From Garmin's measured sleep times, last 4 weeks. The chart is on the sleep page.</p>
  </>;
}
