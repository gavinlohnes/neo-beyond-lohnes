import { useEffect, useState } from "react";
import { TickNumber } from "../../feel/TickNumber";

/** One visual pass per reading/lived day. The accessible value is always real. */
export function DecryptNumber({ value, dayId, reading }: { value: number; dayId: string; reading: string }) {
  const [scrambled, setScrambled] = useState<string | null>(null);
  useEffect(() => {
    const key = `beyond:decrypt:${reading}`;
    try {
      if (sessionStorage.getItem(key) === dayId) return;
      sessionStorage.setItem(key, dayId);
    } catch { /* Unavailable storage must never block the real reading. */ }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const draw = () => setScrambled(String(value).replace(/\d/g, () => String(Math.floor(Math.random() * 10))));
    draw();
    const interval = setInterval(draw, 60);
    const finish = () => { clearInterval(interval); setScrambled(null); };
    const timer = setTimeout(finish, 480);
    const changed = () => { if (motion.matches) finish(); };
    motion.addEventListener("change", changed);
    return () => { clearInterval(interval); clearTimeout(timer); motion.removeEventListener("change", changed); setScrambled(null); };
  }, [dayId, reading]);
  return scrambled === null ? <TickNumber value={value} /> : <span><span className="visually-hidden">{value}</span><span aria-hidden="true">{scrambled}</span></span>;
}
