import { useEffect, useRef, useState } from "react";
import { getWeightAnswers, type WeightAnswers } from "../../../application/weightAnswerQueries";
import { SWING_FLOOR_PAIRS } from "../../../engine/weightAnswers";
import type { ReviewOverview } from "../../../engine/reviewOverview";
import { describeError } from "../../errorMessage";
import "./weightDetails.css";

const signed = (n: number, digits: number) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
const day = (at: Date) => at.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const METHOD = [
  "Rate: the latest 7-day mean minus the previous 7-day mean is a change per week; as a percentage it is divided by the previous mean. It needs the same weigh-in floor as the comparison above.",
  `Usual swing: for consecutive lived days that both have a weigh-in, the absolute difference between their daily means; the median of those differences. It needs ${SWING_FLOOR_PAIRS} pairs. A daily change smaller than this is within your usual swing.`,
  "Goal date: the existing DATA projection — a straight line fitted to the last 28 days of weigh-ins, shown only when it moves toward your goal. It is arithmetic on past records, not a prediction you are held to.",
  "Timing: for shift work a weigh-in means after your main sleep, before eating. This counts weigh-ins logged after that lived day's main-sleep log; it cannot verify eating. Mixed timing makes day-to-day swings larger.",
].join(" ");

/** REVIEW-001: rate, usual swing, goal date and weigh-in timing under "Is my weight going down?". */
export function WeightDetails({ active, overview }: { active: boolean; overview: ReviewOverview }) {
  const [data, setData] = useState<WeightAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  useEffect(() => {
    if (!active) return;
    const request = ++version.current; let alive = true;
    setError(null);
    void getWeightAnswers(overview).then((next) => { if (alive && request === version.current) setData(next); })
      .catch((failure: unknown) => { if (alive) setError(describeError(failure, "Could not read the weight details.")); });
    return () => { alive = false; };
  }, [active, overview]);

  if (error) return <p role="alert">{error} The comparison above is unaffected.</p>;
  if (!data) return <p className="meta" role="status">Reading weight details…</p>;
  const { rate, swing, timing, goal, goalWeightLbs } = data;
  const goalLine = goalWeightLbs === undefined
    ? "No goal weight set. Set one in MORE → Nutrition targets."
    : goal.kind === "REACHED" ? `At or past your goal of ${goalWeightLbs} lb.`
      : goal.kind === "DATE" ? `Goal ${goalWeightLbs} lb: about ${day(goal.date)} at the last 28 days' pace.`
        : `Goal ${goalWeightLbs} lb: no projection. The recent trend isn't moving toward it, or there are too few weigh-ins.`;

  return (
    <dl className="review-weight-details">
      <dt>Rate</dt>
      <dd>{rate ? `${signed(rate.lbPerWeek, 1)} lb per week · ${signed(rate.percentPerWeek, 2)}% of bodyweight per week` : "Building up · same weigh-in floor as the comparison"}</dd>
      <dt>Usual swing</dt>
      <dd>{swing.median === undefined ? `Building up · needs ${SWING_FLOOR_PAIRS} pairs of consecutive weighed days (${swing.pairs})` : `±${swing.median.toFixed(1)} lb day to day · median of ${swing.pairs} consecutive-day pairs`}</dd>
      <dt>Goal</dt>
      <dd>{goalLine}</dd>
      <dt>Timing</dt>
      <dd>{timing.weighIns === 0 ? "No weigh-ins in this window." : `${timing.afterSleep} of ${timing.weighIns} weigh-ins logged after that day's main-sleep log`}</dd>
      <dt className="visually-hidden">Method</dt>
      <dd className="review-weight-details__method"><details><summary>How these are calculated</summary><p className="card-body">{METHOD}</p></details></dd>
    </dl>
  );
}
