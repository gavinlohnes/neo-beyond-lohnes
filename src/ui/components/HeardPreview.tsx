import { useRef, useState, type ReactNode } from "react";
import { describeProposal, type AlfredProposal } from "../../application/alfred/alfredActions";
import { confirmProposals, type ProposalContext } from "../../application/alfred/contextActions";
import { captureCommitFeedback } from "../feel/feedback";
import { describeError } from "../errorMessage";
import "../speech/talk.css";

/**
 * GRAYSON-DICTATE-001: "I heard": one row per card in plain words, each with REMOVE; SAVE ALL confirms them in order
 * on the context read when the preview was made, advanced by his own saves (confirmProposals, as Drive Home does).
 * A card that fails stays here with the rest unsaved; the ones that saved are listed. Nothing saves without SAVE ALL.
 */
export function HeardPreview({ cards: initial, context, prepare, busy, onBusy, onSaved, onChangeWords, onKeepOne, extra }: {
  cards: AlfredProposal[];
  context: ProposalContext;
  /** Last touches right before saving (the meal sheet's WHEN). */
  prepare?: (cards: AlfredProposal[]) => Promise<AlfredProposal[]>;
  busy?: boolean;
  onBusy?: (busy: boolean) => void;
  /** All saved: how many. */
  onSaved: (count: number) => void;
  onChangeWords: () => void;
  /** KEEP AS ONE NOTE (quick capture only). */
  onKeepOne?: () => void;
  extra?: ReactNode;
}) {
  const [cards, setCards] = useState(initial);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ctx = useRef(context);
  const lock = useRef(false);
  const off = busy || saving;
  async function saveAll() {
    if (lock.current || !cards.length) return;
    lock.current = true; setSaving(true); onBusy?.(true); setError(null);
    const acknowledge = captureCommitFeedback();
    try {
      const ready = prepare ? await prepare(cards) : cards;
      const done = await confirmProposals(ready, ctx.current, false);
      const now = cards.slice(0, done.saved).map(describeProposal);
      ctx.current = done.context;
      if (now.length) setSaved((all) => [...all, ...now]);
      if (!done.error) { acknowledge("LIGHT"); onSaved(saved.length + done.saved); return; }
      if (done.error instanceof Error && done.error.message === "CONTEXT_CHANGED") { setCards(cards.slice(done.saved)); setError("Things changed since I heard that. Tap TALK and say it again."); return; }
      setCards(cards.slice(done.saved));
      setError(describeError(done.error, "That one didn't save. It's still here; the rest aren't saved yet."));
    } catch (e) { setError(describeError(e, "Couldn't save. Nothing more was saved.")); }
    finally { lock.current = false; setSaving(false); onBusy?.(false); }
  }
  return <section className="heard" aria-label="I heard">
    <p className="tool-label heard__title">I heard</p>
    {cards.length > 0 && <ul className="heard__rows">
      {cards.map((card, i) => <li className="heard__row" key={`${i}-${describeProposal(card)}`}>
        <span>{describeProposal(card)}</span>
        <button type="button" className="btn-secondary" disabled={off} aria-label={`REMOVE ${describeProposal(card)}`} onClick={() => setCards((all) => all.filter((_, n) => n !== i))}>REMOVE</button>
      </li>)}
    </ul>}
    {extra}
    {saved.length > 0 && <p className="meta heard__line">Saved: {saved.join(" · ")}</p>}
    {error && <p role="alert" className="heard__line">{error}</p>}
    <div className="heard__buttons">
      <button type="button" className="btn-primary" disabled={off || !cards.length} onClick={() => void saveAll()}>SAVE ALL</button>
      <button type="button" className="btn-secondary" disabled={off} onClick={onChangeWords}>CHANGE WORDS</button>
      {onKeepOne && <button type="button" className="btn-secondary" disabled={off} onClick={onKeepOne}>KEEP AS ONE NOTE</button>}
    </div>
  </section>;
}
