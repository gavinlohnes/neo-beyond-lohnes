import { useState } from "react";
import { respondToLearning } from "../../application/learningCommands";
import { evidenceOf, type LifecycleItem } from "../../application/learningLifecycle";
import { LEARNING_STATE_LABELS, NARROW_LABELS, NARROW_PRESETS, type LearningAction, type NarrowPreset } from "../../domain/learningLifecycle";
import { describeError } from "../errorMessage";
import { WhyTraceDisclosure } from "./WhyTrace";
import "./learningAnswer.css";

const MEASURE: Record<string, string> = { NEXT_SLEEP: "sleep the next day", NEXT_ENERGY: "next day's energy", NEXT_MOOD: "next day's mood", TRAINED: "days with a workout" };
const LEAN: Record<string, string> = { MORE: "more", LESS: "less", SAME: "about the same" };

/** What his answer says now, in his terms. */
export function describeState(item: LifecycleItem): string {
  const label = LEARNING_STATE_LABELS[item.state];
  if (item.by === "EVIDENCE" && item.state === "CONTESTED") return `${label}: you kept this, but newer records point the other way.`;
  if (item.by === "EVIDENCE" && item.state === "OUTDATED") return `${label}: you kept this, but there's been no fresh evidence for 8 weeks.`;
  if (item.state === "CONTEXT_SPECIFIC" && item.verdict?.context) {
    const c = item.verdict.context;
    return `${label}: ${[c.preset ? NARROW_LABELS[c.preset].toLowerCase() : "", c.words ?? ""].filter(Boolean).join(" — ")}.`;
  }
  return `${label}.`;
}

/**
 * GRAYSON C6.1/C6.2: his answer to one of Delta's learnings. KEEP · NARROW · NOT TRUE · DROP, and UNDO for the answer
 * in force. Nothing is assumed from silence. Every tap is one LEARNING_RESPONDED; nothing else changes.
 */
export function LearningAnswer({ item, statement, onAnswered, via }: { item: LifecycleItem; statement: string; onAnswered: () => void; via?: "WEEKLY" | undefined }) {
  const [narrowing, setNarrowing] = useState(false);
  const [preset, setPreset] = useState<NarrowPreset | null>(null);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const learning = item.learning;
  if (!learning || learning.kind === "UNUSUAL" || learning.kind === "EXPERIMENT") return null;
  const evidence = evidenceOf(learning);
  const answerable = !item.verdict || item.by === "EVIDENCE";
  const send = async (action: LearningAction) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await respondToLearning({ learningId: item.learningId, action, statement, evidence, context: action === "NARROW" ? { preset: preset ?? undefined, words } : undefined, expectedHeadId: item.headId, via });
      setNarrowing(false); setPreset(null); setWords(""); onAnswered();
    } catch (cause) { setError(describeError(cause, "That answer couldn't be saved. Nothing was changed.")); } finally { setBusy(false); }
  };
  const facts = [
    { label: "Behind it", value: `${evidence.days} ${learning.kind === "SLEEP_WINDOW" ? "measured nights" : "tagged days"}` },
    ...(evidence.measure ? [{ label: "Compared", value: `${MEASURE[evidence.measure] ?? evidence.measure}: ${LEAN[evidence.direction ?? "SAME"]} on tagged days` }] : []),
    ...(item.verdict ? [{ label: "Your answer", value: `${new Date(item.verdict.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${item.verdict.action === "NOT_TRUE" ? "not true" : item.verdict.action.toLowerCase()}` }] : []),
  ];
  return (
    <div className="learning-answer" data-learning-state={item.state}>
      <p className="learning-answer__state">{describeState(item)}</p>
      <WhyTraceDisclosure why={{ rule: learning.kind === "TAG" ? "A #tag pattern: tagged days compared with other noted days. A pattern, not proof of a cause." : "Your usual sleep window from measured nights.", facts }} />
      {answerable && !narrowing && (
        <div className="learning-answer__actions" role="group" aria-label="Your answer">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void send("KEEP")}>KEEP</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setNarrowing(true)}>NARROW</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void send("NOT_TRUE")}>NOT TRUE</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void send("DROP")}>DROP</button>
        </div>
      )}
      {narrowing && (
        <div className="learning-answer__narrow" role="group" aria-labelledby={`narrow-${item.learningId}`}>
          <p className="learning-answer__state" id={`narrow-${item.learningId}`}>Only when?</p>
          <div className="learning-answer__presets">
            {NARROW_PRESETS.map((p) => <button key={p} type="button" className="btn-secondary" aria-pressed={preset === p} onClick={() => setPreset(preset === p ? null : p)}>{NARROW_LABELS[p]}</button>)}
          </div>
          <label className="field">In your words (optional)<input className="input" maxLength={140} value={words} onChange={(e) => setWords(e.target.value)} /></label>
          <div className="learning-answer__actions">
            <button type="button" className="btn-secondary" disabled={busy || (!preset && !words.trim())} onClick={() => void send("NARROW")}>SAVE</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setNarrowing(false); setError(null); }}>CANCEL</button>
          </div>
        </div>
      )}
      {item.verdict && !narrowing && <button type="button" className="btn-secondary learning-answer__undo" disabled={busy} onClick={() => void send("UNDO")}>UNDO MY ANSWER</button>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
