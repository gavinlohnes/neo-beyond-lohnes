import { useEffect, useRef, useState } from "react";
import { buildAlfredContext } from "../../application/alfred/alfredContext";
import { readAlfredKey } from "./AlfredSheet";
import { addSpend, automaticAlfredOn, capReached } from "../../application/alfred/alfredSpend";
import "./alfred.css";

/**
 * ALFRED-003 #1 (owner go "go cheap + 1 and 2"): Alfred's brief at the top of TODAY — a few sentences
 * from the records about what matters now and next. Tap to talk. Written by the everyday model and kept
 * on this phone; rewritten when the records change (at most every 10 minutes) or after 3 hours. Without
 * a Claude key there is no brief and nothing here.
 */
const STORE = "beyond.alfredBrief";
const MIN_GAP_MS = 10 * 60_000;
const MAX_AGE_MS = 3 * 60 * 60_000;
interface Stored { text: string; at: string; sig: string }

function readStored(): Stored | null {
  try { const raw = localStorage.getItem(STORE); return raw ? JSON.parse(raw) as Stored : null; } catch { return null; }
}
function writeStored(value: Stored) { try { localStorage.setItem(STORE, JSON.stringify(value)); } catch { /* not kept */ } }

/** The records without the clock line, hashed: a new minute alone doesn't rewrite the brief. */
export function briefSignature(context: string): string {
  const body = context.split("\n").filter((line) => !line.startsWith("NOW:")).join("\n");
  let h = 5381;
  for (let i = 0; i < body.length; i++) h = ((h << 5) + h + body.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Whether a brief written at `at` for `sig` should be rewritten now. */
export function briefIsDue(stored: Stored | null, sig: string, now: number): boolean {
  if (!stored) return true;
  const age = now - new Date(stored.at).getTime();
  if (!(age >= 0)) return true;
  return age >= MAX_AGE_MS || (stored.sig !== sig && age >= MIN_GAP_MS);
}

const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function AlfredBrief({ active, refreshKey, onOpen }: { active: boolean; refreshKey: string | number; onOpen: () => void }) {
  // ALFRED-COST-001: with automatic Alfred off there is no brief at all, not an old one.
  const [brief, setBrief] = useState<Stored | null>(() => (readAlfredKey() && automaticAlfredOn() ? readStored() : null));
  const [hasKey, setHasKey] = useState(() => !!readAlfredKey() && automaticAlfredOn());
  const [reading, setReading] = useState(false);
  const [tick, setTick] = useState(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // A quiet re-check every 10 minutes while TODAY is on screen.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), MIN_GAP_MS);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    const key = automaticAlfredOn() ? readAlfredKey() : null;
    setHasKey(!!key);
    if (!key) setBrief(null);
    if (!active || !key || inFlight.current) return;
    inFlight.current = true;
    void (async () => {
      try {
        const context = await buildAlfredContext();
        const sig = briefSignature(context);
        const stored = readStored();
        if (mounted.current) setBrief(stored);
        if (!briefIsDue(stored, sig, Date.now()) || (typeof navigator !== "undefined" && navigator.onLine === false) || capReached()) return;
        if (mounted.current) setReading(true);
        const { writeAlfredBrief } = await import("../../application/alfred/alfredClient");
        const { text, costUsd } = await writeAlfredBrief(key, context);
        addSpend(costUsd);
        if (!text) return;
        const next = { text, at: new Date().toISOString(), sig };
        writeStored(next);
        if (mounted.current) setBrief(next);
      } catch {
        // No signal or no answer: the last brief (if any) stays, with its time.
      } finally {
        inFlight.current = false;
        if (mounted.current) setReading(false);
      }
    })();
  }, [active, refreshKey, tick]);

  if (!hasKey || (!brief && !reading)) return null;
  return <section className="alfred-brief" aria-label="Alfred's brief">
    <button type="button" className="alfred-brief__open" onClick={onOpen}>
      <span className="alfred-brief__who">ALFRED{brief ? ` · ${hhmm(brief.at)}` : ""}{reading ? " · reading…" : ""}</span>
      {brief ? <span className="alfred-brief__text">{brief.text}</span> : <span className="alfred-brief__text">Reading your records…</span>}
      <span className="alfred-brief__talk">TAP TO TALK</span>
    </button>
  </section>;
}
