import { useEffect, useState } from "react";
import { describeBootStatus, getBootStatus } from "../../application/bootQueries";

/**
 * BOOT-001 (owner brief 2026-10-05): the cold-launch boot sequence, right
 * after Android's own black splash. About one second: the existing app icon
 * (owner ruling 2026-10-05: the mark is allowed on the icon and this screen
 * only, used as-is — the PNG itself, never redrawn), a 1px line drawing
 * across, "BEYOND" typing in, three status lines ticking in, then a cut to
 * whatever the app opened underneath (TODAY, a resumed workout, a
 * shortcut's destination). The app's own startup runs underneath unchanged.
 *
 * Once per page load (cold launch): a resume from the background never
 * remounts the app, so it never replays. Tap anywhere skips. With reduced
 * motion it never shows.
 */
export const BOOT_TOTAL_MS = 1050;
const TYPE_START_MS = 380;
const TYPE_STEP_MS = 40;
const STATUS_START_MS = 640;
const STATUS_STEP_MS = 90;
const WORD = "BEYOND";

/**
 * When this page load's sequence started (null: not yet), and whether it was
 * skipped. Module-level, so a remount (StrictMode, a re-render of the root)
 * carries on the same sequence instead of replaying or dropping it.
 */
let startedAt: number | null = null;
let skipped = false;

/** Tests only: lets a fresh render play the sequence again. */
export function resetBootSequenceForTests(): void {
  startedAt = null;
  skipped = false;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stillPlaying(): boolean {
  if (skipped || prefersReducedMotion()) return false;
  return startedAt === null || performance.now() - startedAt < BOOT_TOTAL_MS;
}

export function BootSequence() {
  const [show, setShow] = useState(stillPlaying);
  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!show) return;
    if (startedAt === null) startedAt = performance.now();
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
      <img className="boot__mark" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={96} height={96} />
      <span className="boot__line" aria-hidden="true" />
      <p className="boot__word">{elapsed >= TYPE_START_MS ? WORD.slice(0, typed) : ""}</p>
      <div className="boot__status">
        {lines.slice(0, shownLines).map((line) => (
          <p key={line} className="boot__status-line">{line}</p>
        ))}
      </div>
    </div>
  );
}
