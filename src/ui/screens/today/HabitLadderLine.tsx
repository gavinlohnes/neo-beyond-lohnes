import { useEffect, useRef, useState } from "react";
import { useReportPresence } from "../../components/usePresence";
import { WhyTraceDisclosure } from "../../components/WhyTrace";
import { describeError } from "../../errorMessage";
import { answerLadder, askAgainAbout, getHabitLadderLine, stopAskingAbout } from "../../../application/habitLadder";
import { LADDER_REASONS, LADDER_REASON_LABEL, type LadderAnswerValue, type LadderLine } from "../../../domain/habitLadder";
import "./habitLadder.css";

const AFTER: Partial<Record<LadderAnswerValue, string>> = {
  RIGHT: "Noted. Delta keeps that in mind.", NOT_RIGHT: "Noted. Delta won't ask about this habit for two weeks.",
  START_SMALLER: "Two minutes counts. Mark it done in Habits when it happens.", KEEP: "Kept as it is. Delta won't ask about it for two weeks.",
  LATER: "Okay. Not today.",
};
const thanks = (a: LadderAnswerValue) => AFTER[a] ?? "Saved. Delta won't ask again today.";

/**
 * GRAYSON-CHALLENGE-LADDER-001 (C6.6): one quiet line on TODAY when a habit he set keeps slipping (HABIT_LADDER).
 * At most one a day; every step can be answered, put off, or turned off for that habit; nothing changes a habit.
 */
export function HabitLadderLine({ now, tucked = false, onPresence, onOpenHabits }: { now: Date; tucked?: boolean; onPresence?: (shown: boolean) => void; onOpenHabits?: (() => void) | undefined }) {
  const [line, setLine] = useState<LadderLine | null>(null);
  const [notice, setNotice] = useState<{ text: string; undoOff?: string } | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const working = useRef(false);
  const minute = Math.floor(now.getTime() / 600_000);
  const load = () => getHabitLadderLine().then(setLine, () => setLine(null));
  useEffect(() => { void load(); }, [minute]);
  // #708 review: the "what he answered" note gives its quiet-line slot back after a few seconds. A note with UNDO stays
  // 30 s, and never clears while focus is inside it (WCAG 2.2.1); after that ASK AGAIN lives in MORE · Settings · TODAY.
  const noteRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setInterval(() => { if (!noteRef.current?.contains(document.activeElement)) setNotice(null); }, notice.undoOff ? 30_000 : 8_000);
    return () => window.clearInterval(t);
  }, [notice]);
  useReportPresence(line !== null || notice !== null, onPresence);
  async function run(action: () => Promise<unknown>, after: string, undoOff?: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null);
    try { await action(); setNotice({ text: after, ...(undoOff ? { undoOff } : {}) }); await load(); }
    catch (cause) { setError(describeError(cause, "That didn't save. Nothing was changed.")); await load(); }
    finally { working.current = false; setBusy(false); }
  }
  if (tucked || (!line && !notice)) return null;
  const answer = (a: LadderAnswerValue, open = false) => line && void run(async () => { await answerLadder(line, a); if (open) onOpenHabits?.(); }, thanks(a));
  const button = (label: string, a: LadderAnswerValue, open = false) => <button key={a} type="button" className="btn-secondary" disabled={busy} onClick={() => answer(a, open)}>{label}</button>;
  return <section className="habit-ladder" aria-label="Habit check-in" data-habit-ladder={line?.stage ?? "DONE"}>
    {error && <p role="alert">{error}</p>}
    {notice && <p ref={noteRef} role="status" className="habit-ladder__notice">{notice.text}
      {notice.undoOff && <> <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(async () => { askAgainAbout(notice.undoOff!); }, "Delta will ask about it again.")}>UNDO</button></>}</p>}
    {line && <>
      <p className="habit-ladder__text">{line.text}</p>
      {line.stage === "ASK" && <div className="habit-ladder__chips" role="group" aria-label="What got in the way?">
        {LADDER_REASONS.map((r) => <button key={r} type="button" className="chip" disabled={busy} onClick={() => answer(r)}>{LADDER_REASON_LABEL[r]}</button>)}
      </div>}
      <div className="habit-ladder__actions">
        {line.stage === "ASK" && button("NOT NOW", "LATER")}
        {line.stage === "NAME" && [button("THAT'S RIGHT", "RIGHT"), button("NOT RIGHT", "NOT_RIGHT"), ...(onOpenHabits ? [button("CHANGE THE PLAN", "CHANGE_PLAN", true)] : [])]}
        {line.stage === "CHALLENGE" && [button("START SMALLER", "START_SMALLER"), button("NOT RIGHT", "NOT_RIGHT"), button("NOT NOW", "LATER")]}
        {line.stage === "EXAMINE" && [...(onOpenHabits ? [button("CHANGE THE PLAN", "CHANGE_PLAN", true)] : []), button("KEEP IT AS IT IS", "KEEP")]}
      </div>
      <WhyTraceDisclosure why={line.why} />
      <button type="button" className="btn-secondary habit-ladder__off" disabled={busy}
        onClick={() => void run(() => stopAskingAbout(line.habitId), `Delta won't ask about ${line.habitName}. Turn it back on in MORE · Settings · TODAY.`, line.habitId)}>
        Stop asking about {line.habitName}
      </button>
    </>}
  </section>;
}
