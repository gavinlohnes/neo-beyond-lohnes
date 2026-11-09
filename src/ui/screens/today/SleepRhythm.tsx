import { RHYTHM_MIN_NIGHTS, RHYTHM_WINDOW_DAYS, type RhythmGroup, type RhythmNight, type SleepRhythm } from "../../../application/sleepRhythmQueries";
import { hoursMinutes } from "../health/healthFormat";

/**
 * SLEEP-RHYTHM-001: on the sleep page, when you slept over the last four weeks — one row per night on a
 * 24-hour strip, work days solid and days off outlined — and, in words, your usual sleep on each kind of
 * day and how far the clock moves between them. Describes only; never a score, streak or advice.
 */
export function SleepRhythmSection({ rhythm }: { rhythm: SleepRhythm }) {
  const { nights, groups, offMinusWork, axisStart } = rhythm;
  if (nights.length === 0) return null;
  const ticks = [0, 6, 12, 18, 24].map((h) => ({ at: h / 24, label: hourLabel(axisStart + h * 60) }));
  return (
    <section className="sleep-rhythm" aria-labelledby="sleep-rhythm-title">
      <p id="sleep-rhythm-title" className="tool-label">RHYTHM · LAST {RHYTHM_WINDOW_DAYS / 7} WEEKS</p>
      {groups.map((g) => <p key={g.kind} className="card-body sleep-rhythm__line">{describeGroup(g)}</p>)}
      {offMinusWork !== null && Math.abs(offMinusWork) >= 30 && <p className="card-body sleep-rhythm__line">{describeShift(offMinusWork)}</p>}
      {groups.length < 2 && <p className="meta">{describeMissing(groups, nights)}</p>}
      <div className="sleep-rhythm__chart" role="img" aria-label={`When you slept, ${nights.length} measured ${nights.length === 1 ? "night" : "nights"}, newest first`}>
        {nights.map((n) => (
          <div key={n.livedDayStart} className="sleep-rhythm__row" data-kind={n.kind}>
            <span className="sleep-rhythm__day" aria-hidden="true">{dayLabel(n)}</span>
            <span className="sleep-rhythm__track" aria-hidden="true">
              {segments(n, axisStart).map(([left, width], i) => <i key={i} style={{ left: `${left * 100}%`, width: `${Math.max(width * 100, 0.8)}%` }} />)}
            </span>
          </div>
        ))}
        <div className="sleep-rhythm__axis" aria-hidden="true">
          <span className="sleep-rhythm__day" />
          <span className="sleep-rhythm__ticks">{ticks.map((t) => <b key={t.at} style={{ left: `${t.at * 100}%` }}>{t.label}</b>)}</span>
        </div>
      </div>
      <p className="meta sleep-rhythm__legend"><i data-kind="WORK" /> work day <i data-kind="OFF" /> day off <i data-kind="UNKNOWN" /> not set</p>
      <p className="meta">Each row is the longest Garmin sleep of a BEYOND day (naps left out). Nights Garmin didn't measure aren't shown. Nothing here changes advice.</p>
    </section>
  );
}

/** "8:10 am", from minutes after midnight. */
export function clock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440, h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "6 am", "12 pm": chart axis labels on the hour. */
function hourLabel(minutes: number): string {
  const h = Math.floor((((minutes % 1440) + 1440) % 1440) / 60);
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
}

export function describeGroup(g: RhythmGroup): string {
  const who = g.kind === "WORK" ? "Work days" : "Days off";
  return `${who}: asleep around ${clock(g.start)}, up around ${clock(g.end)} · usually within ${hoursMinutes(Math.max(g.spread, 5))} · ${g.nights} nights.`;
}

/** The clock change between work days and days off, framed as time zones so its size is easy to feel. */
export function describeShift(offMinusWork: number): string {
  const size = hoursMinutes(Math.abs(offMinusWork)), zones = Math.round(Math.abs(offMinusWork) / 60);
  const zoneText = zones >= 2 ? ` — about the same clock change as crossing ${zones} time zones, each way` : "";
  return `On days off your sleep sits ${size} ${offMinusWork > 0 ? "later" : "earlier"} than on work days${zoneText}.`;
}

function describeMissing(groups: readonly RhythmGroup[], nights: readonly RhythmNight[]): string {
  const have = new Set(groups.map((g) => g.kind));
  const missing = (["WORK", "OFF"] as const).filter((k) => !have.has(k)).map((k) => (k === "WORK" ? "work days" : "days off"));
  const unset = nights.filter((n) => n.kind === "UNKNOWN").length;
  return `Not enough measured nights on ${missing.join(" or ")} yet (needs ${RHYTHM_MIN_NIGHTS}).${unset ? ` ${unset} ${unset === 1 ? "night is" : "nights are"} on days with no work or off set.` : ""}`;
}

function dayLabel(n: RhythmNight): string {
  // The lived day begins at 16:30; label it by the calendar day it mostly covers (the next morning).
  const d = new Date(Date.parse(n.livedDayStart) + 12 * 3_600_000);
  return `${d.toLocaleDateString("en-US", { weekday: "narrow" })} ${d.getDate()}`;
}

/** A night's bar as [left, width] fractions of the axis, split in two if it crosses the axis edge. */
export function segments(n: RhythmNight, axisStart: number): [number, number][] {
  const from = (((n.start - axisStart) % 1440) + 1440) % 1440;
  const span = (((n.end - n.start) % 1440) + 1440) % 1440;
  if (from + span <= 1440) return [[from / 1440, span / 1440]];
  return [[from / 1440, (1440 - from) / 1440], [0, (from + span - 1440) / 1440]];
}
