import type { SetProposal } from "../../../application/trainGuidance";

/**
 * GRAYSON-TRAIN-GUIDED-001 / FINISH-3: Delta's two live-workout panels, shared by the workout view and Gym mode so
 * both say exactly the same thing. Quiet unless there's a proposal; the pain control is always one tap away.
 */
export function DeltaProposal({ proposal, why, busy, onAnswer, onToggleWhy }: {
  proposal: SetProposal | null; why: boolean; busy: boolean; onAnswer: (use: boolean) => void; onToggleWhy: () => void;
}) {
  if (!proposal) return null;
  return <div className="train-delta" role="group" aria-label="Delta's suggestion">
    <p className="train-delta__line"><span className="train-delta__who">DELTA</span> {proposal.line}</p>
    <div className="train-delta__acts">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onAnswer(true)}>USE {proposal.to} LB</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onAnswer(false)}>KEEP {proposal.from} LB</button>
      <button type="button" className="train-delta__why" aria-expanded={why} onClick={onToggleWhy}>WHY?</button>
    </div>
    {why && <ul className="train-delta__whylist">{proposal.why.map((w) => <li key={w} className="meta">{w}</li>)}</ul>}
  </div>;
}

export function DeltaPain({ exerciseName, open, busy, onOpen, onStop, onCancel }: {
  exerciseName: string; open: boolean; busy: boolean; onOpen: () => void; onStop: (skipRest: boolean) => void; onCancel: () => void;
}) {
  if (!open) return <button type="button" className="train-delta__pain" onClick={onOpen}>PAIN OR SOMETHING WRONG</button>;
  return <div className="train-delta train-delta--stop" role="group" aria-label="Stop this movement">
    <p className="train-delta__line"><span className="train-delta__who">DELTA</span> {exerciseName} is stopped. No diagnosis here: if pain is sharp, or doesn't ease with rest, get it checked before training it again.</p>
    <div className="train-delta__acts">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onStop(true)}>SKIP ITS REMAINING SETS</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onStop(false)}>JUST NOTE IT</button>
      <button type="button" className="train-delta__why" onClick={onCancel}>IT'S FINE, CONTINUE</button>
    </div>
  </div>;
}
