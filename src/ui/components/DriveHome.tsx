import { useEffect, useRef, useState } from "react";
import { interpret } from "../../application/helper/freeHelper";
import { getSavedMeals } from "../../application/nutritionQueries";
import { getUnresolvedObligations } from "../../application/intentQueries";
import { getProjects } from "../../application/projectQueries";
import { getRoutines } from "../../application/routineCommands";
import { describeProposal, type AlfredProposal } from "../../application/alfred/alfredActions";
import { buildPlanningContext } from "../../application/alfred/personalContext";
import { confirmContextProposal } from "../../application/alfred/contextActions";
import { captureCommitFeedback } from "../feel/feedback";
import "./driveHome.css";

/**
 * DRIVE-HOME-001 (#373 item 6): hands-free logging on the way home, free and on the phone.
 * BEYOND listens, reads back what it understood, and saves only when he says "save" (or taps SAVE).
 * Words it can't log become a note card, so nothing he said is lost, and that too waits for "save".
 * No Alfred, no network, no cost. Speech uses the browser's own recognition and voice.
 */
type Recognition = { lang: string; interimResults: boolean; continuous?: boolean; start(): void; stop(): void; abort?(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}


export const SAVE_WORDS = /\b(yes|yep|yeah|save|save it|confirm|do it|correct)\b/;
export const SKIP_WORDS = /\b(no|nope|skip|cancel|wrong|scrap)\b/;
// Review of #381: exits are whole phrases, so "done with work" or "finished the garage" are logged, not exits.
export const DONE_WORDS = /^(?:ok(?:ay)? )?(?:that's all|that is all|that's it|i'm done|im done|all done|done|stop|nothing else|nothing|no thanks|goodbye|bye)(?: thanks| thank you)?$/;

type Phase = "starting" | "listening" | "confirm" | "saving" | "idle";

export function DriveHome({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [cards, setCards] = useState<AlfredProposal[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const alive = useRef(false);
  const pending = useRef<AlfredProposal[]>([]);
  const farewell = useRef(false); // let "Drive safe" finish after the screen closes
  const savedCount = useRef(0);
  const reprompted = useRef(false);
  const context = useRef<Awaited<ReturnType<typeof buildPlanningContext>> | null>(null);
  const dialog = useRef<HTMLDivElement>(null); // callbacks chain across renders, so this lives in a ref
  const supported = !!recognitionCtor();

  function say(text: string, then?: () => void) {
    setNote(text);
    if (!alive.current && !farewell.current) return; // closed: say nothing more
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") { then?.(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => { if (alive.current) then?.(); };
    u.onerror = () => { if (alive.current) then?.(); };
    speechSynthesis.speak(u);
  }

  function listen(mode: "log" | "confirm") {
    const Ctor = recognitionCtor();
    if (!Ctor || !alive.current) return;
    rec.current?.abort?.();
    const r = new Ctor(); r.lang = "en-US"; r.interimResults = false;
    let words = "", failed = false;
    r.onresult = (e) => { words = Array.from(e.results).map((res) => res[0]!.transcript).join(" "); setHeard(words); };
    // Review of #381: a recognition error (silence, mic denied) stops here; it never loops.
    r.onerror = () => { failed = true; if (alive.current) { setPhase("idle"); setNote(pending.current.length ? "Didn't catch that. Tap SAVE or SKIP." : "Didn't catch that. Tap TALK."); } };
    r.onend = () => { if (alive.current && !failed) void (mode === "log" ? understood(words) : answered(words)); };
    rec.current = r; setPhase(mode === "log" ? "listening" : "confirm"); r.start();
  }

  async function understood(words: string) {
    const said = words.trim();
    if (!said) { setPhase("idle"); return; }
    if (DONE_WORDS.test(said.toLowerCase().replace(/[.!?,]/g, "").trim())) { finish(); return; }
    const [meals, tasks, projects, routines] = await Promise.all([getSavedMeals(), getUnresolvedObligations(), getProjects(), getRoutines()]);
    const result = interpret(said, { now: new Date(), savedMeals: meals, openTasks: tasks, openProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED"), routines: routines.filter((r) => r.status === "ACTIVE") });
    const next: AlfredProposal[] = [...result.cards, ...(result.unknown.length ? [{ kind: "capture_note", text: `Drive home: ${result.unknown.join("; ")}` } as AlfredProposal] : [])];
    pending.current = next; setCards(next); context.current = await buildPlanningContext(false); reprompted.current = false;
    say(`I heard: ${next.map(describeProposal).join(". ")}. Say save, or skip.`, () => listen("confirm"));
  }

  async function answered(words: string) {
    const w = words.toLowerCase().trim();
    // Review of #381: silence re-prompts once, then waits quietly with SAVE/SKIP on screen.
    if (!w) { if (reprompted.current) { setPhase("idle"); setNote("Tap SAVE or SKIP when you're ready."); return; } reprompted.current = true; say("Say save, or skip.", () => listen("confirm")); return; }
    if (SAVE_WORDS.test(w) && !SKIP_WORDS.test(w)) { await saveAll(); return; }
    if (SKIP_WORDS.test(w)) { pending.current = []; setCards([]); say("Skipped. Anything else?", () => listen("log")); return; }
    if (DONE_WORDS.test(w.replace(/[.!?,]/g, ""))) { finish(); return; }
    say("Say save, or skip.", () => listen("confirm"));
  }

  async function saveAll() {
    const toSave = pending.current;
    if (!toSave.length) return;
    setPhase("saving");
    const acknowledge = captureCommitFeedback();
    const saved: string[] = [];
    try {
      // One context read when the cards were made, advanced by his own saves (as Alfred's sheet does),
      // so an outside change since the readback is still refused.
      let ctx = context.current ?? await buildPlanningContext(false);
      for (const card of toSave) {
        const done = await confirmContextProposal(card, ctx, false);
        ctx = { ...ctx, personalVersion: done.personalVersion, ...(done.recordVersion ? { recordVersion: done.recordVersion } : {}) };
        saved.push(describeProposal(card));
      }
      context.current = null;
      acknowledge("LIGHT");
      savedCount.current += saved.length; pending.current = []; setCards([]); setLog((all) => [...all, ...saved]); onSaved();
      say("Saved. Anything else?", () => listen("log"));
    } catch {
      savedCount.current += saved.length; setLog((all) => [...all, ...saved]); if (saved.length) onSaved();
      pending.current = toSave.slice(saved.length); setCards(pending.current);
      say("That one didn't save. It's still here. Tap SAVE to try again.");
      setPhase("idle");
    }
  }

  function finish() {
    farewell.current = true;
    say(savedCount.current ? "All set. Drive safe." : "Nothing saved. Drive safe.");
    close();
  }
  function close() {
    alive.current = false;
    rec.current?.abort?.(); rec.current = null;
    setPhase("idle"); setCards([]); pending.current = []; setHeard("");
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    queueMicrotask(() => dialog.current?.focus());
    alive.current = true; savedCount.current = 0; setLog([]); setCards([]); pending.current = []; setHeard("");
    if (supported) { setPhase("starting"); say("Ready. Tell me what to log.", () => listen("log")); }
    farewell.current = false;
    return () => { returnTo?.focus?.(); alive.current = false; rec.current?.abort?.(); if (!farewell.current && typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const busy = phase === "saving";
  return <div ref={dialog} tabIndex={-1} className="drive-home" role="dialog" aria-modal="true" aria-label="Drive home">
    <p className="drive-home__mode">DRIVE HOME · HANDS-FREE · FREE</p>
    {!supported ? <p className="drive-home__say">Voice isn't available in this browser. Use Alfred's box instead.</p> : <>
      <p className="drive-home__say" aria-live="polite">{phase === "listening" ? "Listening…" : phase === "confirm" ? "Say save, or skip." : phase === "saving" ? "Saving…" : note ?? "Ready."}</p>
      {heard && <p className="drive-home__heard">“{heard}”</p>}
      {cards.length > 0 && <ul className="drive-home__cards" aria-label="To save">{cards.map((c, n) => <li key={n}>{describeProposal(c)}</li>)}</ul>}
      <div className="drive-home__buttons">
        {cards.length > 0
          ? <>
            <button type="button" className="btn-primary drive-home__big" disabled={busy} onClick={() => void saveAll()}>SAVE</button>
            <button type="button" className="btn-secondary drive-home__big" disabled={busy} onClick={() => { pending.current = []; setCards([]); say("Skipped. Anything else?", () => listen("log")); }}>SKIP</button>
          </>
          : <button type="button" className="btn-primary drive-home__big" disabled={busy || phase === "listening"} onClick={() => listen("log")}>{phase === "listening" ? "LISTENING…" : "TALK"}</button>}
      </div>
    </>}
    {log.length > 0 && <p className="meta drive-home__log">Saved: {log.join(" · ")}</p>}
    <button type="button" className="btn-secondary drive-home__close" onClick={close}>DONE</button>
  </div>;
}
