import { ConfirmBanner } from "../../components/ConfirmBanner";
import { formatDuration } from "../body/bodyScreenCopy";

/**
 * TODAY-SPLIT-002 slice 2 (Gavin, 2026-11-19, "3C"): TODAY's "recorded" confirmations, moved out of TodayScreen
 * unchanged. TODAY still owns when each appears and clears; this only draws the ones it is given.
 */
export function TodayToasts({ waterOz, mealMessage, sleepMinutes, proteinG }: {
  waterOz?: number | undefined; mealMessage?: string | undefined; sleepMinutes?: number | undefined; proteinG?: number | undefined;
}) {
  if (waterOz === undefined && mealMessage === undefined && sleepMinutes === undefined && proteinG === undefined) return null;
  return <div className="redesign-toast" role="status">
    {waterOz !== undefined && <ConfirmBanner message={`${waterOz} oz recorded.`} />}
    {mealMessage !== undefined && <ConfirmBanner message={mealMessage} />}
    {sleepMinutes !== undefined && <ConfirmBanner message={`Main sleep logged · ${formatDuration(sleepMinutes)}`} />}
    {proteinG !== undefined && <ConfirmBanner message={`${proteinG} g protein recorded.`} />}
  </div>;
}
