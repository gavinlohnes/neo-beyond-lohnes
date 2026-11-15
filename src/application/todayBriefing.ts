import { getTodayPicture, type TodayPicture } from "./todayPicture";
import { getActiveDay, getLatestRecommendation } from "./queries";
import { getMeasuredSnapshot, type MeasuredSnapshot } from "./measuredQueries";
import { sleepMinutes } from "../domain/health/measuredSeries";
import type { Recommendation } from "../domain/common/types";
import type { AheadReading } from "./ahead";

/**
 * BEYOND 4.0-d: the TODAY briefing preview. A read-only composition of existing
 * NOW / NEXT picture, the already-issued Engine recommendation, and Garmin's
 * last-night import. It never writes, never ranks a second recommendation, and
 * never replaces TODAY.
 */
export type BriefingOpen = "PLAN" | "BODY_SLEEP";

export interface BriefingNow {
  label: string;
  line: string;
  why: string[];
  guidance: { title: string; rationale: string } | null;
}

export interface BriefingHandled {
  id: string;
  line: string;
  detail: string;
  open: BriefingOpen;
}

export interface TodayBriefing {
  started: boolean;
  now: BriefingNow;
  next: AheadReading | null;
  handled: BriefingHandled[];
}

const hm = (n: number) => `${Math.floor(n / 60)}h ${String(Math.round(n % 60)).padStart(2, "0")}m`;

export function deriveHandled(measured: MeasuredSnapshot | null): BriefingHandled[] {
  const night = measured?.lastNight;
  if (!night) return [];
  return [{
    id: "garmin-sleep",
    line: `Garmin sleep synced: ${hm(sleepMinutes(night))}`,
    detail: "Imported from Garmin. Review it in BODY; nothing was applied as advice.",
    open: "BODY_SLEEP",
  }];
}

export function deriveTodayBriefing(
  picture: TodayPicture | null,
  recommendation: Recommendation | undefined,
  measured: MeasuredSnapshot | null,
): TodayBriefing {
  if (!picture) {
    return {
      started: false,
      now: {
        label: "TODAY",
        line: "Start your day on TODAY to open a briefing from your records.",
        why: ["No lived day is started yet. The briefing does not invent a state."],
        guidance: null,
      },
      next: null,
      handled: [],
    };
  }
  return {
    started: true,
    now: {
      label: picture.now?.label ?? "TODAY",
      line: picture.now?.line ?? "Today's work context isn't recorded and there's no saved schedule, so BEYOND doesn't guess.",
      why: picture.now?.why ?? ["Today can't be known from a record or a saved schedule."],
      guidance: recommendation ? { title: recommendation.title, rationale: recommendation.rationale } : null,
    },
    next: picture.next,
    handled: deriveHandled(measured),
  };
}

export async function getTodayBriefing(now = new Date()): Promise<TodayBriefing> {
  const day = await getActiveDay();
  const [picture, recommendation, measured] = await Promise.all([
    getTodayPicture(now),
    day ? getLatestRecommendation(day.id) : Promise.resolve(undefined),
    getMeasuredSnapshot(now.getTime()),
  ]);
  return deriveTodayBriefing(picture, recommendation, measured);
}
