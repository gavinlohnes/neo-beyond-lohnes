import { useEffect, useRef, useState } from "react";
import { describeComms, getCaveTonight } from "../../../application/caveTonight";
import "../systems/systems.css";

/**
 * SUIT-ALIVE S3 (owner approval 2026-10-28, "go S3"): TODAY's comms line, closing the mode hero, so it
 * is not one of the phase rows. It reports how you sit against your own normal — never
 * the call, which stays on the NEXT card — and opens the cave on TONIGHT. Read only; hidden on error.
 */
export function CommsLine({ refreshKey, onOpen }: { refreshKey: string; onOpen: () => void }) {
  const [line, setLine] = useState<{ text: string; off: boolean } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    getCaveTonight()
      .then((t) => { if (request === sequence.current) setLine({ text: describeComms(t), off: t.off.length > 0 }); })
      .catch(() => { if (request === sequence.current) setLine(null); });
  }, [refreshKey]);
  if (!line) return null;
  return (
    <button type="button" className={`comms-line${line.off ? " comms-line--off" : ""}`} aria-label={`Comms: ${line.text} Open tonight in the cave`} onClick={onOpen}>
      <span className="comms-line__head" aria-hidden="true"><span className="comms-line__key">COMMS</span><span className="comms-line__go">TONIGHT ›</span></span>
      <span className="comms-line__text" aria-hidden="true">{line.text}</span>
    </button>
  );
}
