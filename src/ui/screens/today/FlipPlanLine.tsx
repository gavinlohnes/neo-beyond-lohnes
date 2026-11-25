import "./lifeState.css";

/**
 * GRAYSON-FLIP-PLAN-001 (Gavin, 2026-11-25: "Quiet line"): the rotation flip's one short line among TODAY's quiet
 * lines (FLIP_PLAN), so the day's next action never moves. Muted, 16 px, never red; the tap opens ROUTE at the card.
 */
export function FlipPlanLine({ line, onOpen }: { line: string; onOpen?: (() => void) | undefined }) {
  return onOpen
    ? <button type="button" className="today-flip-line" data-flip-line onClick={onOpen} aria-label={`${line} Open the flip plan in ROUTE`}>{line}</button>
    : <p className="today-flip-line" data-flip-line>{line}</p>;
}
