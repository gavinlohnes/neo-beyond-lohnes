import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RibbonDay } from "../../../engine/ribbon";
import { describeRibbonDate, describeRibbonDay, describeRibbonSummary } from "./weeklyCopy";

/**
 * THE RIBBON (2026-10-03): the last 28 lived days, one column each, one row
 * per fact. A picture of what was logged — facts only, no score, no colour
 * judgement. Every mark is neutral ink: red is reserved for meaning
 * elsewhere, and identity comes from each row's label, never colour.
 *
 * Rows with nothing in them for the whole 28 days are left out. A day with
 * no record at all is an empty column. Tapping a day (or focusing it) shows
 * that day in words underneath; each day is a real button whose accessible
 * name is that same sentence, so the strip is fully readable without sight.
 */

const LABEL_WIDTH = 76;
const SLEEP_MAX_MINUTES = 12 * 60;

interface RowSpec {
  key: string;
  label: string;
  height: number;
  has: (day: RibbonDay) => boolean;
  mark: (day: RibbonDay, x: number, w: number, h: number) => ReactNode;
}

function rows(proteinTargetG: number | undefined): RowSpec[] {
  return [
    {
      key: "shift",
      label: "Shift",
      height: 12,
      has: (d) => d.worked,
      mark: (d, x, w, h) => (d.worked ? <rect x={x} y={2} width={w} height={h - 4} rx={2} fill="var(--text-3-strong)" /> : null),
    },
    {
      key: "sleep",
      label: "Sleep",
      height: 36,
      has: (d) => d.mainSleepMinutes !== undefined,
      mark: (d, x, w, h) => {
        if (d.mainSleepMinutes === undefined) return null;
        const barH = Math.max(2, (Math.min(d.mainSleepMinutes, SLEEP_MAX_MINUTES) / SLEEP_MAX_MINUTES) * (h - 2));
        return <rect x={x} y={h - barH} width={w} height={barH} rx={2} fill="var(--text-2)" />;
      },
    },
    {
      key: "lift",
      label: "Lift",
      height: 22,
      has: (d) => d.lift !== undefined,
      mark: (d, x, w, h) => {
        if (!d.lift) return null;
        const size = Math.min(8, w);
        const cx = x + w / 2;
        return (
          <>
            {d.lift.prCount > 0 && <circle cx={cx} cy={4} r={2.5} fill="var(--text-1)" />}
            <rect
              x={cx - size / 2}
              y={h - size - 2}
              width={size}
              height={size}
              rx={1}
              fill={d.lift.status === "COMPLETED" ? "var(--text-1)" : "none"}
              stroke="var(--text-1)"
              strokeWidth={1.5}
            />
          </>
        );
      },
    },
    {
      key: "protein",
      label: "Protein",
      height: 14,
      has: (d) => d.proteinG !== undefined,
      mark: (d, x, w, h) => {
        if (d.proteinG === undefined) return null;
        const reached = proteinTargetG === undefined || d.proteinG >= proteinTargetG;
        return (
          <circle
            cx={x + w / 2}
            cy={h / 2}
            r={Math.min(3.5, w / 2)}
            fill={reached ? "var(--text-1)" : "none"}
            stroke="var(--text-1)"
            strokeWidth={1.5}
          />
        );
      },
    },
    {
      key: "urges",
      label: "Urges",
      height: 22,
      has: (d) => d.urges > 0,
      mark: (d, x, w) =>
        Array.from({ length: Math.min(3, d.urges) }, (_, i) => (
          <circle key={i} cx={x + w / 2} cy={18 - i * 7} r={Math.min(2.5, w / 2)} fill="var(--text-2)" />
        )),
    },
    {
      key: "clean",
      label: "Clean",
      height: 12,
      has: (d) => d.cleanDay,
      mark: (d, x, w, h) => {
        if (!d.cleanDay) return null;
        const size = Math.min(6, w);
        return <rect x={x + (w - size) / 2} y={(h - size) / 2} width={size} height={size} fill="var(--text-2)" />;
      },
    },
  ];
}

export function Ribbon({
  days,
  templateLabels,
  proteinTargetG,
}: {
  days: RibbonDay[];
  templateLabels: Record<string, string>;
  proteinTargetG?: number | undefined;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  // Drawn in real pixels (measured), so dots stay round and squares square at any phone width.
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState(0);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setStripWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const visibleRows = rows(proteinTargetG).filter((row) => days.some(row.has));

  if (!days.some((d) => d.hasRecord)) {
    return <p className="meta">Not enough data yet — nothing logged in the last {days.length} days.</p>;
  }

  const colW = stripWidth / days.length;
  // A surface gap between neighbouring columns, so adjacent days never merge into one block.
  const gap = Math.max(2, colW * 0.22);
  const markW = colW - gap;
  const totalHeight = visibleRows.reduce((sum, row) => sum + row.height + 6, 0);
  const selectedDay = selected !== null ? days[selected] : undefined;

  return (
    <div>
      <div role="img" aria-label={describeRibbonSummary(days)} style={{ position: "relative" }}>
        {visibleRows.map((row) => (
          <div key={row.key} data-ribbon-row={row.key} style={{ display: "grid", gridTemplateColumns: `${LABEL_WIDTH}px 1fr`, alignItems: "end", marginBottom: 6 }}>
            <span className="meta" style={{ margin: 0, lineHeight: `${row.height}px`, fontSize: 16 }} aria-hidden="true">
              {row.label}
            </span>
            <svg aria-hidden="true" width="100%" height={row.height} style={{ display: "block", overflow: "visible" }}>
              {selected !== null && (
                <rect x={selected * colW} y={0} width={colW} height={row.height} fill="var(--surface-2)" />
              )}
              {stripWidth > 0 &&
                days.map((day, i) => (
                  <g key={day.livedDayStart} data-ribbon-mark={row.has(day) ? row.key : undefined}>
                    {row.mark(day, i * colW + gap / 2, markW, row.height)}
                  </g>
                ))}
            </svg>
          </div>
        ))}
        {/* One button per day over its column: the tap target (bigger than any mark) and the
            keyboard / screen-reader path to the same per-day sentence. */}
        <div ref={stripRef} style={{ position: "absolute", top: 0, bottom: 0, left: LABEL_WIDTH, right: 0, display: "flex" }}>
          {days.map((day, i) => (
            <button
              key={day.livedDayStart}
              type="button"
              aria-label={describeRibbonDay(day, templateLabels)}
              aria-pressed={selected === i}
              onClick={() => setSelected((current) => (current === i ? null : i))}
              style={{ flex: 1, minWidth: 0, height: totalHeight, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginLeft: LABEL_WIDTH }}>
        <span className="meta" style={{ fontSize: 16 }}>{describeRibbonDate(days[0]!.livedDayStart)}</span>
        <span className="meta" style={{ fontSize: 16 }}>Today</span>
      </div>
      <p className="meta" aria-live="polite" style={{ marginTop: 8, minHeight: 24 }}>
        {selectedDay ? describeRibbonDay(selectedDay, templateLabels) : "Tap a day to see it."}
      </p>
      {proteinTargetG !== undefined && visibleRows.some((r) => r.key === "protein") && (
        <p className="meta" style={{ margin: 0 }}>Protein: filled at {proteinTargetG} g or more (today's target), open below it.</p>
      )}
    </div>
  );
}
