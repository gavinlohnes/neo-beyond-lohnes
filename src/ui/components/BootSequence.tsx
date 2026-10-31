import { useEffect, useState } from "react";
import { readBootMode } from "../screens/today/bootMode";
import { MODE_NAMES, type ShiftClockPhase } from "../screens/today/shiftClock";
import { describeBootStatus, getBootStatus } from "../../application/bootQueries";
import { Emblem } from "./Emblem";

/**
 * BOOT-001 (owner brief 2026-10-05): the cold-launch boot sequence, right
 * after Android's own black splash. About 2.6 seconds (BOOT-BRIEF-001; was one): the existing app icon
 * (owner ruling 2026-10-05: the mark is allowed on the icon and this screen
 * only, used as-is — the PNG itself, never redrawn), a 1px line drawing
 * across, "BEYOND" typing in, the startup brief ticking in, then a cut to
 * whatever the app opened underneath (TODAY, a resumed workout, a
 * shortcut's destination). The app's own startup runs underneath unchanged.
 * SUIT-ALIVE-001 (owner ruling 2026-10-28): the mark is now the original red bat, opening from its
 * center; the app icon itself is unchanged.
 *
 * Once per page load (cold launch): a resume from the background never
 * remounts the app, so it never replays. Tap anywhere skips. With reduced
 * motion it never shows.
 *
 * BOOT-ONCE-001 (owner 2026-10-31: "having it pop up every time I open it or refresh it is too
 * much"): once per lived day — the first launch after 16:30 — remembered on this phone.
 */
// BOOT-BRIEF-001 (owner choice 2026-10-30, option A): about 2.6 s, long enough to read the brief; a
// tap still skips. Was 1050 ms, which the owner couldn't read.
export const BOOT_TOTAL_MS = 2600;
const TYPE_START_MS = 380;
const TYPE_STEP_MS = 40;
const STATUS_START_MS = 640;
const STATUS_STEP_MS = 120;
const HINT_MS = 1100;
const WORD = "BEYOND";

/**
 * When this page load's sequence started (null: not yet), and whether it was
 * skipped. Module-level, so a remount (StrictMode, a re-render of the root)
 * carries on the same sequence instead of replaying or dropping it.
 */
let startedAt: number | null = null;
let skipped = false;

const SHOWN = "beyond.bootShownFor";
/** The lived day a moment belongs to (16:30 → 16:30), as the local date it starts on. */
export function livedDayKey(now: Date): string {
  const start = new Date(now);
  if (now.getHours() * 60 + now.getMinutes() < 16 * 60 + 30) start.setDate(start.getDate() - 1);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}
let shownToday: boolean | null = null;
function alreadyShownToday(): boolean {
  if (shownToday === null) {
    try { shownToday = localStorage.getItem(SHOWN) === livedDayKey(new Date()); } catch { shownToday = false; }
  }
  return shownToday;
}

/** Tests only: lets a fresh render play the sequence again (a new page load; `keepDay` keeps today's mark). */
export function resetBootSequenceForTests(keepDay = false): void {
  startedAt = null;
  skipped = false;
  shownToday = null;
  if (!keepDay) try { localStorage.removeItem(SHOWN); } catch { /* none */ }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stillPlaying(): boolean {
  if (skipped || prefersReducedMotion()) return false;
  if (startedAt === null && alreadyShownToday()) return false;
  return startedAt === null || performance.now() - startedAt < BOOT_TOTAL_MS;
}

export function BootSequence() {
  const [show, setShow] = useState(stillPlaying);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const phase = document.documentElement.dataset.suitMode as ShiftClockPhase | undefined;
      setMode(phase && phase in MODE_NAMES ? MODE_NAMES[phase] : "Mode: not set");
    };
    let current = true;
    void readBootMode().then((value) => { if (current) setMode(value); }).catch(() => {});
    window.addEventListener("beyond-mode", read);
    return () => { current = false; window.removeEventListener("beyond-mode", read); };
  }, []);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!show) return;
    if (startedAt === null) {
      startedAt = performance.now();
      try { localStorage.setItem(SHOWN, livedDayKey(new Date())); } catch { /* shows again next launch */ }
    }
    const begun = startedAt;
    let current = true;
    void getBootStatus()
      .then((status) => {
        if (current) setLines(describeBootStatus(status));
      })
      .catch(() => {});
    let frame = requestAnimationFrame(function step() {
      const ms = performance.now() - begun;
      if (skipped || ms >= BOOT_TOTAL_MS) {
        setShow(false);
        return;
      }
      setElapsed(ms);
      frame = requestAnimationFrame(step);
    });
    return () => {
      current = false;
      cancelAnimationFrame(frame);
    };
  }, [show]);

  function skip() {
    skipped = true;
    setShow(false);
  }

  if (!show) return null;
  const typed = Math.max(0, Math.min(WORD.length, Math.floor((elapsed - TYPE_START_MS) / TYPE_STEP_MS) + 1));
  const shownLines = Math.max(0, Math.min(lines.length, Math.floor((elapsed - STATUS_START_MS) / STATUS_STEP_MS) + 1));
  return (
    <div className="boot" role="status" aria-label="BEYOND starting — tap to skip" onPointerDown={skip} onClick={skip}>
      <Emblem size={128} className="boot__mark" />
      <span className="boot__line" aria-hidden="true" />
      <p className="boot__word">{elapsed >= TYPE_START_MS ? WORD.slice(0, typed) : ""}</p>
      <div className="boot__status">
        {elapsed >= STATUS_START_MS && mode && <p className="boot__status-line">{mode}</p>}
        {lines.slice(0, shownLines).map((line) => (
          <p key={line} className="boot__status-line">{line}</p>
        ))}
      </div>
      {elapsed >= HINT_MS && <p className="boot__hint" aria-hidden="true">TAP TO CONTINUE</p>}
    </div>
  );
}
