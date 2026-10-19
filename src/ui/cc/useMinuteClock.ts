import { useEffect, useState } from "react";

/** POLISH-002: the header clock. Local HH:MM, updated on the minute. */
export function formatClock(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

export function useMinuteClock(): string {
  const [text, setText] = useState(() => formatClock(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setText(formatClock(now));
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return text;
}
