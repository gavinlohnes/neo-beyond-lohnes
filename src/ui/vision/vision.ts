import { useEffect, useState } from "react";

/**
 * SUIT-ALIVE S8 (owner rulings 2026-10-28): vision is presentation only. NORMAL, THERMAL (off-normal
 * readings glow, the rest stays dark) and NIGHT (a dim warm palette that keeps AA contrast). AUTO, the
 * default, turns NIGHT on by itself from midnight while the screen is ON SHIFT — Gavin: "Night vision
 * is fine to be automatic." The choice stays on this phone (like stealth); it is not an event and not
 * in backups. Cloak is never automatic: "I will turn it on when I'm ready."
 */
export type VisionPref = "AUTO" | "NORMAL" | "THERMAL" | "NIGHT";
export type Vision = "NORMAL" | "THERMAL" | "NIGHT";
export const VISION_PREFS: readonly VisionPref[] = ["AUTO", "NORMAL", "THERMAL", "NIGHT"];
const KEY = "beyond.vision";
const EVENT = "beyond-vision";

export function readVisionPref(): VisionPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "NORMAL" || v === "THERMAL" || v === "NIGHT" ? v : "AUTO";
  } catch { return "AUTO"; }
}

export function setVisionPref(pref: VisionPref): void {
  try { if (pref === "AUTO") localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch { /* the choice still applies until reload */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pref }));
}

/** Pure: AUTO is NIGHT from 00:00 until noon while the mode is ON SHIFT, NORMAL otherwise. */
export function effectiveVision(pref: VisionPref, mode: string | undefined, now: Date): Vision {
  if (pref !== "AUTO") return pref;
  return mode === "SCHEDULED_SHIFT" && now.getHours() < 12 ? "NIGHT" : "NORMAL";
}

/** The preference and what it means right now, kept current across the app. */
export function useVision(): { pref: VisionPref; vision: Vision } {
  const [pref, setPref] = useState<VisionPref>(readVisionPref);
  const [mode, setMode] = useState<string | undefined>(() => document.documentElement.dataset.suitMode);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const onPref = (e: Event) => setPref((e as CustomEvent<VisionPref>).detail);
    const onMode = () => setMode(document.documentElement.dataset.suitMode);
    window.addEventListener(EVENT, onPref);
    window.addEventListener("beyond-mode", onMode);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { window.removeEventListener(EVENT, onPref); window.removeEventListener("beyond-mode", onMode); window.clearInterval(timer); };
  }, []);
  return { pref, vision: effectiveVision(pref, mode, now) };
}
