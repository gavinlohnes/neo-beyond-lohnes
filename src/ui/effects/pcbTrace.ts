/**
 * DEPTH-001 (direct owner review of four rendered mockup passes,
 * 2026-09-16): pure, deterministic generator for the "exposed machinery"
 * reveal's PCB-style trace network — Manhattan-routed lines biased toward
 * one hub point, with via-dots at the bends. Same seeded PRNG technique
 * used throughout this repo's design lineage (the BEYOND Launch Vision
 * prototype's own circuit-trace demo). Pure math, no DOM, no I/O — safe
 * to unit test directly and reusable from a plain function or a portal-
 * rendered component alike.
 *
 * Final look is flat/unglowing red matched to real circuit-board
 * photography, per direct owner correction — an earlier reviewed pass
 * used an SVG blur+merge glow and was rejected ("not like it is in the
 * mockup"). Colors are applied by the caller (PCBTraceOverlay.tsx), not
 * this module — this file only produces geometry.
 */

function mulberry32(seed: number): () => number {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TraceSegment = readonly [x1: number, y1: number, x2: number, y2: number];
export type TraceDot = readonly [x: number, y: number];

export interface TraceNetwork {
  segments: TraceSegment[];
  dots: TraceDot[];
}

/** Fixed per the reviewed mockup's density — not a tunable parameter, this generates one specific look. */
const ORIGIN_COUNT = 30;
const MAX_STEPS_PER_ORIGIN = 16;

function routeToward(
  rng: () => number,
  startX: number,
  startY: number,
  hubX: number,
  hubY: number,
  segments: TraceSegment[],
  dots: TraceDot[],
): void {
  let curX = startX;
  let curY = startY;
  for (let i = 0; i < MAX_STEPS_PER_ORIGIN; i++) {
    const dx = hubX - curX;
    const dy = hubY - curY;
    const dist = Math.hypot(dx, dy);
    if (dist < 16) break;

    let horizontal = Math.abs(dx) > Math.abs(dy);
    if (rng() < 0.22) horizontal = !horizontal;

    const stepLen = Math.min(10 + rng() * 24, Math.max(6, horizontal ? Math.abs(dx) : Math.abs(dy)));
    let nextX = curX;
    let nextY = curY;
    if (horizontal) nextX = curX + Math.sign(dx || 1) * stepLen;
    else nextY = curY + Math.sign(dy || 1) * stepLen;

    segments.push([curX, curY, nextX, nextY]);
    if (rng() < 0.55) dots.push([nextX, nextY]);

    if (i > 1 && rng() < 0.14) {
      const branchLen = 8 + rng() * 18;
      const branchHorizontal = rng() < 0.5;
      const branchX = branchHorizontal ? nextX + (rng() < 0.5 ? branchLen : -branchLen) : nextX;
      const branchY = branchHorizontal ? nextY : nextY + (rng() < 0.5 ? branchLen : -branchLen);
      segments.push([nextX, nextY, branchX, branchY]);
    }

    curX = nextX;
    curY = nextY;
  }
}

/**
 * Generates a trace network for a `width`×`height` viewport. `hubXRatio`/
 * `hubYRatio` (0-1) place the convergence point every origin routes
 * toward — the reveal's "the machinery feeds the card" effect from the
 * reviewed mockup. Deterministic: the same arguments always produce the
 * same network, so callers control freshness by varying `seed` (e.g.
 * `Date.now()` per open) rather than this function reaching for its own
 * entropy source.
 */
export function generateTraceNetwork(
  width: number,
  height: number,
  seed: number,
  hubXRatio: number,
  hubYRatio: number,
): TraceNetwork {
  const rng = mulberry32(seed);
  const hubX = width * hubXRatio;
  const hubY = height * hubYRatio;
  const segments: TraceSegment[] = [];
  const dots: TraceDot[] = [];

  for (let i = 0; i < ORIGIN_COUNT; i++) {
    const edge = Math.floor(rng() * 4);
    let startX: number;
    let startY: number;
    if (edge === 0) { startX = rng() * width; startY = 0; }
    else if (edge === 1) { startX = width; startY = rng() * height; }
    else if (edge === 2) { startX = rng() * width; startY = height; }
    else { startX = 0; startY = rng() * height; }
    routeToward(rng, startX, startY, hubX, hubY, segments, dots);
  }

  return { segments, dots };
}
