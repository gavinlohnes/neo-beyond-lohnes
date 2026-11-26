/**
 * GRAYSON-LIGHTER-NIGHT-001 (Gavin, 2026-11-26): the lighter-last-night card, pure. Which parts apply, the lines, and
 * the folded line once he's taken it. No I/O. It decides nothing about what the Engine recommends and changes nothing.
 */
export interface LighterNightSwitches { on: boolean; lift: boolean; food: boolean; home: boolean }
export interface LighterHomeJob { title: string; dueTonight: boolean }

export interface LighterNightInput {
  /** The lived day's life moment (application/lifeTransition.ts). */
  moment: string | null;
  /** Tonight's place and length in the run, from the saved schedule; undefined when the run's edge isn't in sight. */
  run: { position: number; length: number | undefined } | null;
  /** He's awake (the lived day has started) and the shift hasn't started yet. */
  beforeShift: boolean;
  minimumDay: boolean;
  switches: LighterNightSwitches;
  dismissed: boolean;
  /** The energy forecast for tonight's place in the run; `mean` is undefined below the floor. */
  energy: { mean: number | undefined; days: number; basis: "SAME_LENGTH" | "ANY_LENGTH" } | null;
  /** The mean floor the forecast uses (RUN_MEAN_FLOOR). */
  floor: number;
  /** Tonight's SHORT lift, when a lift is planned and its SHORT form exists. */
  lift: { name: string; minutes: number | undefined } | null;
  /** Fits now is on and he has work-night usuals. */
  food: boolean;
  /** Home jobs planned for tonight, and his first day off ("Mon"). */
  home: { jobs: readonly LighterHomeJob[]; toLabel: string } | null;
  /** What he took on this lived day, part by part. */
  taken: { lift?: string | undefined; food?: boolean | undefined; home?: { titles: readonly string[]; toLabel: string } | undefined };
}

export type LighterNightView =
  | { kind: "OFFER"; why: string; lines: { lift?: string; food?: string; home?: string } }
  | { kind: "TAKEN"; folded: string; parts: { lift?: string; food?: string; home?: string } };

const NAMED = 3;

function list(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** "Last night of 3. On past 3-night runs your energy on this night ran 2.6 of 5 (6 nights)." Never says he's tired. */
export function lighterNightWhy(run: LighterNightInput["run"], energy: LighterNightInput["energy"], floor: number): string {
  const length = run?.length;
  const head = length !== undefined ? `Last night of ${length}.` : "Last night of the run.";
  if (!energy || energy.mean === undefined || energy.days < floor) return head;
  const mean = energy.mean.toFixed(1);
  const nights = `${energy.days} night${energy.days === 1 ? "" : "s"}`;
  return energy.basis === "SAME_LENGTH" && length !== undefined
    ? `${head} On past ${length}-night runs your energy on this night ran ${mean} of 5 (${nights}).`
    : `${head} On past runs your energy on night ${run?.position ?? length} ran ${mean} of 5 (${nights}).`;
}

export function liftLine(lift: { name: string; minutes: number | undefined }): string {
  return `Lift: ${lift.name}${lift.minutes !== undefined ? ` (about ${lift.minutes} min)` : ""}`;
}

export const FOOD_LINE = "Food: your work-night usuals first";

/** "Home: Filter change moves to Mon, your first day off". Up to three named, then "and N more"; all of them move. */
export function homeLine(jobs: readonly LighterHomeJob[], toLabel: string): string {
  const named = jobs.slice(0, NAMED).map((j) => (j.dueTonight ? `${j.title} (due tonight, still due)` : j.title));
  const rest = jobs.length - named.length;
  const names = rest > 0 ? `${named.join(", ")} and ${rest} more` : list(named);
  return `Home: ${names} ${jobs.length === 1 ? "moves" : "move"} to ${toLabel}, your first day off`;
}

/** "Lighter night: SHORT B · your usuals · Filter change Mon." */
export function foldedLine(taken: LighterNightInput["taken"]): string {
  const parts: string[] = [];
  if (taken.lift) parts.push(taken.lift);
  if (taken.food) parts.push("your usuals");
  if (taken.home && taken.home.titles.length > 0) {
    const more = taken.home.titles.length - 1;
    parts.push(`${taken.home.titles[0]}${more > 0 ? ` +${more}` : ""} ${taken.home.toLabel}`);
  }
  return `Lighter night: ${parts.join(" · ")}.`;
}

const stripTitle = (t: string) => t.replace(/^Home: /, "");

export function lighterNight(input: LighterNightInput): LighterNightView | null {
  const { switches, taken } = input;
  if (!switches.on) return null;
  if (input.moment !== "LAST_SHIFT" || !input.run || input.run.position < 2) return null;
  const anyTaken = !!taken.lift || !!taken.food || !!(taken.home && taken.home.titles.length);
  if (anyTaken) {
    const parts: { lift?: string; food?: string; home?: string } = {};
    if (taken.lift) parts.lift = `Lift: ${taken.lift}`;
    if (taken.food) parts.food = "Food: your usuals first";
    if (taken.home && taken.home.titles.length) parts.home = `Home: ${list(taken.home.titles.map(stripTitle))} on ${taken.home.toLabel}`;
    return { kind: "TAKEN", folded: foldedLine({ ...taken, ...(taken.home ? { home: { ...taken.home, titles: taken.home.titles.map(stripTitle) } } : {}) }), parts };
  }
  // The offer: before the shift, never on a Minimum Day, never after NOT TONIGHT. What he took keeps its UNDO either way.
  if (!input.beforeShift || input.minimumDay || input.dismissed) return null;
  const lines: { lift?: string; food?: string; home?: string } = {};
  if (switches.lift && input.lift) lines.lift = liftLine(input.lift);
  if (switches.food && input.food) lines.food = FOOD_LINE;
  if (switches.home && input.home && input.home.jobs.length > 0) {
    lines.home = homeLine(input.home.jobs.map((j) => ({ ...j, title: stripTitle(j.title) })), input.home.toLabel);
  }
  if (!lines.lift && !lines.food && !lines.home) return null;
  return { kind: "OFFER", why: lighterNightWhy(input.run, input.energy, input.floor), lines };
}
