import { useRef, type ReactNode } from "react";
import type { QuietLineId } from "./attentionPolicy";
import "./todayQuietLines.css";

/**
 * GRAYSON-TODAY-CALM-001 (C9.6): TODAY's quiet lines that live in one place, right under the numbers, in his order.
 * Each line keeps its own words, button and behaviour; it only renders here. Lines that read their own data stay
 * mounted while tucked (they hide themselves), so TODAY always knows what is waiting. When some are tucked, one quiet
 * "N MORE" button (the real count, including lines that live elsewhere, like ROUTINE and DRIVE HOME) opens them in place.
 */
export function TodayQuietLines({ lines, tuckedCount, onMore }: {
  /** In his order. `node` is already told whether it is tucked. */
  lines: readonly { id: QuietLineId; node: ReactNode }[];
  /** How many lines are waiting behind "N MORE"; 0 hides the button. */
  tuckedCount: number;
  onMore: () => void;
}) {
  const block = useRef<HTMLDivElement>(null);
  return <div ref={block} className="today-quiet-lines" aria-label="Quiet lines" role="group" tabIndex={-1}>
    {lines.map((line) => <div key={line.id} className="today-quiet-line" data-quiet-line={line.id}>{line.node}</div>)}
    {tuckedCount > 0 && <button type="button" className="btn-secondary today-quiet-more" aria-label={`${tuckedCount} more quiet ${tuckedCount === 1 ? "line" : "lines"}`}
      onClick={() => { onMore(); requestAnimationFrame(() => block.current?.focus()); }}>{tuckedCount} MORE</button>}
  </div>;
}

/** GRAYSON-LOG-NUDGE-001, moved here unchanged by TODAY-CALM-001: one muted line, no red, no count; TELL DELTA opens
 * Delta with "I ate " and sends nothing. */
export function LogNudgeLine({ nudge, busy }: { nudge: { text: string; onTell: () => void; onNotNow: () => void }; busy: boolean }) {
  return <div className="cc-log-nudge" role="group" aria-label="Logging nudge">
    <p className="meta">{nudge.text}</p>
    <span className="cc-log-nudge-actions">
      <button type="button" disabled={busy} onClick={nudge.onTell}>TELL DELTA</button>
      <button type="button" disabled={busy} onClick={nudge.onNotNow}>NOT NOW</button>
    </span>
  </div>;
}
