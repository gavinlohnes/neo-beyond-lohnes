import { useEffect, useState } from "react";
import {
  DEFAULT_REVIEW_DAYS, REVIEW_LENGTHS, actualLine, closeWindowReview, getWindowReviewView, keepWindowPlan, moveWindowPlan,
  readWindowReviewPreference, startWindowReview, writeWindowReviewPreference, type ReviewChoice, type WindowReviewView,
} from "../../../application/eatingWindowReview";
import type { EatingWindowSettings } from "../../../domain/common/types";
import { WhyWindowSheet } from "./WhyWindowSheet";
import "./eatingWindow.css";

/**
 * GRAYSON-WINDOW-REVIEW-001 (C4.8c), inside BODY's Eating Window section once it's on: what he actually does by kind
 * of day (with one offer to move the plan), whether it's working for his goal (a 14- or 28-day Try, then the review),
 * and WHY A WINDOW. Nothing changes by itself; every change is his tap. Either block can be hidden and shown again.
 */
const SAVE_FAILED = "That didn't save. Nothing changed.";
const CHOICES: readonly { id: ReviewChoice; label: string }[] = [
  { id: "KEEP", label: "KEEP" }, { id: "ADJUST", label: "ADJUST" }, { id: "PAUSE", label: "PAUSE" }, { id: "END", label: "END" },
];

export function EatingWindowReview({ refreshKey, onSettings, onAdjust }: {
  refreshKey: string;
  /** The settings after his change (MOVE, PAUSE, END), so the setup above shows them. */
  onSettings: (settings: EatingWindowSettings) => void;
  /** ADJUST: open the setup's own fields with his current values. */
  onAdjust: () => void;
}) {
  const [view, setView] = useState<WindowReviewView | null | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [length, setLength] = useState<number>(DEFAULT_REVIEW_DAYS);
  const [lesson, setLesson] = useState("");
  const [why, setWhy] = useState(false);
  const [pref, setPref] = useState(readWindowReviewPreference);

  useEffect(() => {
    let live = true;
    void getWindowReviewView().then((v) => { if (live) setView(v); }, () => { if (live) setView(null); });
    return () => { live = false; };
  }, [refreshKey, tick]);

  const act = async (work: () => Promise<void>, done: string | null) => {
    setBusy(true); setError(null); setNotice(null);
    try { await work(); setNotice(done); setTick((n) => n + 1); }
    catch { setError(SAVE_FAILED); }
    finally { setBusy(false); }
  };
  const setHidden = (key: "hideActual" | "hideReview", hidden: boolean) => {
    const next = { ...readWindowReviewPreference(), [key]: hidden };
    writeWindowReviewPreference(next); setPref(next);
  };
  const whyButton = <button type="button" className="btn-secondary" onClick={() => setWhy(true)}>WHY A WINDOW</button>;
  if (!view) return null;

  const { settings, actual, offer, review } = view;
  return (
    <div className="window-review">
      {pref.hideActual
        ? <button type="button" className="btn-secondary window-review__show" onClick={() => setHidden("hideActual", false)}>SHOW WHAT YOU ACTUALLY DO</button>
        : <section className="window-review__block" aria-label="What you actually do">
            <p className="tool-label">WHAT YOU ACTUALLY DO · LAST 14 DAYS</p>
            <p className="meta">From your marks first, then your logged meals. A day with neither stays unknown.</p>
            {actual.every((s) => s.days === 0) && <p className="window-review__text">No finished days with a known kind yet.</p>}
            {actual.filter((s) => s.days > 0).map((s) => {
              const line = actualLine(s);
              return <div key={s.kind} className="window-review__kind">
                <p className="meta-strong">{line.title}</p>
                <p className="window-review__text">{line.text}</p>
                {line.counts && <p className="meta">{line.counts}{line.estimate ? " From your meals; may be incomplete." : ""}</p>}
              </div>;
            })}
            {offer && <div className="window-review__offer" role="group" aria-label="Move the plan">
              <p className="window-review__text">{offer.line}</p>
              <div className="eating-setup__presets">
                <button type="button" className="btn-secondary" disabled={busy}
                  onClick={() => void act(async () => { onSettings(await moveWindowPlan(settings, offer)); }, `Plan moved: ${offer.to} on ${offer.kind === "WORK" ? "work days" : offer.kind === "RECOVERY" ? "recovery days" : "days off"}.`)}>MOVE</button>
                <button type="button" className="btn-secondary" disabled={busy}
                  onClick={() => { keepWindowPlan(offer.kind); setNotice("Kept your plan. GRAYSON won't ask about this for 14 days."); setTick((n) => n + 1); }}>KEEP</button>
              </div>
            </div>}
            <button type="button" className="btn-secondary window-review__hide" onClick={() => setHidden("hideActual", true)}>HIDE THIS</button>
          </section>}

      {pref.hideReview
        ? <button type="button" className="btn-secondary window-review__show" onClick={() => setHidden("hideReview", false)}>SHOW HOW IT'S GOING</button>
        : <section className="window-review__block" aria-label="How it's going">
            <p className="tool-label">HOW IT'S GOING</p>
            {review.kind === "NONE" && <>
              <p className="window-review__text">See whether the window is helping your goal: weight trend, protein and strength, then sleep and energy.</p>
              <div className="eating-setup__presets" role="group" aria-label="How long to check">
                {REVIEW_LENGTHS.map((n) => <button key={n} type="button" className="btn-secondary" aria-pressed={length === n} onClick={() => setLength(n)}>{n} DAYS</button>)}
              </div>
              <button type="button" className="btn-secondary" disabled={busy}
                onClick={() => void act(async () => { await startWindowReview(settings, length); }, `Checking how it's going for ${length} days. Nothing changes meanwhile.`)}>CHECK HOW IT'S GOING</button>
            </>}
            {review.kind === "RUNNING" && <p className="window-review__text">Checking how it's going: day {review.day} of {review.of}. The review comes at the end.</p>}
            {review.kind === "DUE" && <>
              <p className="meta">After {review.days} days. During the check and before it, with the days behind each. Patterns, not proof.</p>
              <dl className="window-review__lines">
                {review.review.lines.map((l, i) => <div key={i}><dt className="meta-strong">{l.label}</dt><dd>{l.text}</dd></div>)}
              </dl>
              {review.review.guardrails.length > 0 && <ul className="window-review__guards" aria-label="Worth a look">
                {review.review.guardrails.map((g) => <li key={g}>{g}</li>)}
              </ul>}
              <label className="window-review__field">
                <span className="meta">One thing you learned (optional)</span>
                <input type="text" className="input" value={lesson} maxLength={200} disabled={busy} onChange={(e) => setLesson(e.target.value)} />
              </label>
              <div className="eating-setup__presets" role="group" aria-label="What next">
                {CHOICES.map(({ id, label }) => <button key={id} type="button" className="btn-secondary" disabled={busy}
                  onClick={() => void act(async () => {
                    await closeWindowReview(review.id, id, settings, lesson);
                    setLesson("");
                    if (id === "PAUSE" || id === "END") onSettings({ ...settings, enabled: false });
                    if (id === "ADJUST") onAdjust();
                  }, id === "KEEP" ? "Kept. It's in your journal." : id === "ADJUST" ? "Saved in your journal. Change the window above." : id === "PAUSE" ? "Paused. Your settings are kept." : "Ended. Your settings are kept.")}>{label}</button>)}
              </div>
              <p className="meta">KEEP leaves the window as it is. ADJUST opens the setup. PAUSE and END turn it off and keep your settings.</p>
            </>}
            <button type="button" className="btn-secondary window-review__hide" onClick={() => setHidden("hideReview", true)}>HIDE THIS</button>
          </section>}

      {notice && <p className="meta" role="status">{notice}</p>}
      {error && <p className="meta" role="alert">{error}</p>}
      {whyButton}
      {why && <WhyWindowSheet onClose={() => setWhy(false)} />}
    </div>
  );
}
