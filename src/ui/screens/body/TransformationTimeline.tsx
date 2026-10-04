import { useEffect, useMemo, useState } from "react";
import {
  getTimeline,
  TIMELINE_DAYS,
  type Timeline,
  type TimelineEvent,
  type TimelineEventKind,
} from "../../../application/timelineQueries";

const W = 300;
const H = 96;
const PAD = 6;
/** Markers closer than this share one tap target, so every one stays ≥ 44 px wide on a phone. */
const GROUP_FRACTION = 0.12;

const FILTERS: { kind: TimelineEventKind; label: string }[] = [
  { kind: "PR", label: "PRs" },
  { kind: "CLEAN_DAY_MILESTONE", label: "Clean days" },
  { kind: "WEIGHT_MILESTONE", label: "Weight" },
  { kind: "GOAL", label: "Goal" },
];

interface MarkerGroup {
  at: number;
  events: TimelineEvent[];
}

/**
 * BODY-TIMELINE-001 (owner brief 2026-10-04): the transformation timeline,
 * shown inside the BODYWEIGHT station. Weight over the last 90 days with
 * PRs, clean-day milestones, weight milestones and the goal date pinned on
 * it; a chip per kind filters it; tapping a marker shows its line. Read
 * only. Neutral ink; red appears only as the PR marker's outline, matching
 * the PR tag.
 */
export function TransformationTimeline() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [hidden, setHidden] = useState<Set<TimelineEventKind>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let current = true;
    void getTimeline().then((next) => {
      if (current) setTimeline(next);
    });
    return () => {
      current = false;
    };
  }, []);

  const view = useMemo(() => (timeline ? layout(timeline, hidden) : null), [timeline, hidden]);

  if (!timeline || !view) return <p className="meta">Loading…</p>;
  if (timeline.weighIns.length === 0) {
    return <p className="meta timeline-empty">Log a bodyweight to start your timeline.</p>;
  }

  function toggle(kind: TimelineEventKind) {
    setSelected(null);
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const selectedGroup = selected === null ? undefined : view.groups[selected];

  return (
    <div className="timeline">
      <div className="timeline__filters" role="group" aria-label="Show on the timeline">
        {FILTERS.map((f) => (
          <button
            key={f.kind}
            type="button"
            className={`chip${hidden.has(f.kind) ? "" : " chip--selected"}`}
            aria-pressed={!hidden.has(f.kind)}
            onClick={() => toggle(f.kind)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="timeline__plot">
        <svg
          role="img"
          aria-label={`Weight over the last ${TIMELINE_DAYS} days, from ${timeline.weighIns[0]!.weightLbs} to ${timeline.weighIns.at(-1)!.weightLbs} lb`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="timeline__svg"
        >
          {view.points.length > 1 && (
            <polyline
              points={view.points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
              fill="none"
              stroke="var(--text-2)"
              strokeWidth={1.7}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {view.points.length === 1 && <circle cx={view.points[0]![0]} cy={view.points[0]![1]} r={3} fill="var(--text-1)" />}
          {view.groups.map((g, i) => (
            <line
              key={i}
              x1={g.at * W}
              x2={g.at * W}
              y1={0}
              y2={H}
              stroke="var(--border-strong)"
              strokeDasharray={g.events.some((e) => e.kind === "GOAL") ? "3 3" : undefined}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="timeline__markers">
          {view.groups.map((g, i) => (
            <button
              key={i}
              type="button"
              className={`timeline__marker${selected === i ? " timeline__marker--selected" : ""}`}
              // Clamped so an edge marker stays inside the plot.
              style={{ left: `clamp(22px, ${(g.at * 100).toFixed(2)}%, calc(100% - 22px))` }}
              aria-label={g.events.map((e) => e.label).join("; ")}
              aria-expanded={selected === i}
              onClick={() => setSelected(selected === i ? null : i)}
            >
              <span aria-hidden="true" className={`timeline__glyph timeline__glyph--${glyphKind(g)}`} />
              {g.events.length > 1 && <span aria-hidden="true" className="timeline__count">{g.events.length}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="timeline__axis meta" aria-hidden="true">
        <span>{shortDate(timeline.windowStart)}</span>
        <span>Today</span>
      </div>
      {selectedGroup && (
        <div className="timeline__detail" role="status">
          {selectedGroup.events.map((e, i) => (
            <p key={i} className="meta" style={{ margin: 0 }}>
              {e.kind === "GOAL" ? e.label : `${shortDate(e.date)} · ${e.label}`}
            </p>
          ))}
        </div>
      )}
      {view.groups.length === 0 && <p className="meta" style={{ margin: "8px 0 0" }}>Nothing pinned in these {TIMELINE_DAYS} days yet.</p>}
    </div>
  );
}

function layout(timeline: Timeline, hidden: Set<TimelineEventKind>) {
  const start = new Date(timeline.windowStart).getTime();
  const end = new Date(timeline.windowEnd).getTime();
  const span = end - start || 1;
  const frac = (iso: string) => Math.min(1, Math.max(0, (new Date(iso).getTime() - start) / span));

  const weights = timeline.weighIns.map((w) => w.weightLbs);
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  const wSpan = hi - lo || 1;
  const points = timeline.weighIns.map(
    (w) => [PAD + frac(w.recordedAt) * (W - 2 * PAD), PAD + ((hi - w.weightLbs) / wSpan) * (H - 2 * PAD)] as const,
  );

  // Goal dates past today pin to the right edge.
  const groups: MarkerGroup[] = [];
  for (const event of timeline.events.filter((e) => !hidden.has(e.kind))) {
    const at = event.kind === "GOAL" ? 1 : frac(event.date);
    const last = groups.at(-1);
    if (last && Math.abs(at - last.at) < GROUP_FRACTION) last.events.push(event);
    else groups.push({ at, events: [event] });
  }
  return { points, groups };
}

function glyphKind(group: MarkerGroup): string {
  const kinds = new Set(group.events.map((e) => e.kind));
  if (kinds.has("PR")) return "pr";
  if (kinds.has("GOAL")) return "goal";
  if (kinds.has("CLEAN_DAY_MILESTONE")) return "clean";
  return "weight";
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
