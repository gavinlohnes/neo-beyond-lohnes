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

export const DRIVE_HOME_EVENT = "beyond:drive-home";
export function openDriveHome() { window.dispatchEvent(new Event(DRIVE_HOME_EVENT)); }

export const SAVE_WORDS = /\b(yes|yep|yeah|save|save it|confirm|do it|correct)\b/;
export const SKIP_WORDS = /\b(no|nope|skip|cancel|wrong|scrap)\b/;
export const DONE_WORDS = /\b(done|stop|that's all|that is all|finished|nothing else|nothing|goodbye|bye)\b/;

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
  const savedCount = useRef(0); // callbacks chain across renders, so this lives in a ref
  const supported = !!recognitionCtor();

  function say(text: string, then?: () => void) {
    setNote(text);
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
    let words = "";
    r.onresult = (e) => { words = Array.from(e.results).map((res) => res[0]!.transcript).join(" "); setHeard(words); };
    r.onerror = () => { if (alive.current) setPhase("idle"); };
    r.onend = () => { if (alive.current) void (mode === "log" ? understood(words) : answered(words)); };
    rec.current = r; setPhase(mode === "log" ? "listening" : "confirm"); r.start();
  }

  async function understood(words: string) {
    const said = words.trim();
    if (!said) { setPhase("idle"); return; }
    if (DONE_WORDS.test(said.toLowerCase()) && said.split(/\s+/).length <= 4) { finish(); return; }
    const [meals, tasks, projects, routines] = await Promise.all([getSavedMeals(), getUnresolvedObligations(), getProjects(), getRoutines()]);
    const result = interpret(said, { now: new Date(), savedMeals: meals, openTasks: tasks, openProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED"), routines: routines.filter((r) => r.status === "ACTIVE") });
    const next: AlfredProposal[] = [...result.cards, ...(result.unknown.length ? [{ kind: "capture_note", text: `Drive home: ${result.unknown.join("; ")}` } as AlfredProposal] : [])];
    pending.current = next; setCards(next);
    say(`I heard: ${next.map(describeProposal).join(". ")}. Say save, or skip.`, () => listen("confirm"));
  }

  async function answered(words: string) {
    const w = words.toLowerCase();
    if (SAVE_WORDS.test(w) && !SKIP_WORDS.test(w)) { await saveAll(); return; }
    if (SKIP_WORDS.test(w)) { pending.current = []; setCards([]); say("Skipped. Anything else?", () => listen("log")); return; }
    if (DONE_WORDS.test(w)) { finish(); return; }
    say("Say save, or skip.", () => listen("confirm"));
  }

  async function saveAll() {
    const toSave = pending.current;
    if (!toSave.length) return;
    setPhase("saving");
    const acknowledge = captureCommitFeedback();
    const saved: string[] = [];
    try {
      for (const card of toSave) {
        const ctx = await buildPlanningContext(false);
        await confirmContextProposal(card, ctx, false);
        saved.push(describeProposal(card));
      }
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
    alive.current = true; savedCount.current = 0; setLog([]); setCards([]); pending.current = []; setHeard("");
    if (supported) { setPhase("starting"); say("Ready. Tell me what to log.", () => listen("log")); }
    farewell.current = false;
    return () => { alive.current = false; rec.current?.abort?.(); if (!farewell.current && typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const busy = phase === "saving";
  return <div className="drive-home" role="dialog" aria-modal="true" aria-label="Drive home">
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
