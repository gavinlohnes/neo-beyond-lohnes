import type { StateCheckIn } from "../domain/common/types";
import type { Draft } from "../domain/intelligence/types";
import type { DaySummary } from "./dayLedger";

/**
 * CHECK-IN DRAFT (Drop 5, owner approval 2026-10-03: "Never auto-confirm.
 * Record whether each draft was confirmed unchanged or adjusted.").
 *
 * The draft is the operator's own latest answers, carried forward — the
 * most stable evidence BEYOND has about how they rate themselves. It never
 * guesses a value from other data (no "short sleep → lower energy" rule):
 * that would be interpretation feeding the Engine's capacity read, which
 * waits for separate sign-off. Instead the facts logged since then are
 * listed beside it, so the operator can adjust with them in view.
 *
 * Doctrine: "Learned shortcuts may … prefill … reversible choices only when
 * evidence is stable. They remain visible, correctable, and easy to
 * escape." A check-in older than CHECK_IN_DRAFT_MAX_AGE_HOURS is not stable
 * enough to carry forward, so there is no draft.
 */
export const CHECK_IN_DRAFT_MAX_AGE_HOURS = 36;

export type CheckInDraftValues = Pick<StateCheckIn, "energy" | "stress" | "mood" | "soreness" | "alcoholUrge">;

export interface CheckInDraft extends Draft<CheckInDraftValues> {
  /** Facts logged after that check-in, already in words; empty when nothing was. */
  since: string[];
}

function hoursAndMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * The draft for a new check-in, or undefined when there's no recent one.
 * `templateLabel` names a workout template for the "since then" line.
 */
export function draftCheckIn(
  latest: StateCheckIn | undefined,
  summaries: readonly DaySummary[],
  now: Date,
  templateLabel: (templateId: string) => string = (id) => id,
): CheckInDraft | undefined {
  if (!latest) return undefined;
  const at = new Date(latest.recordedAt).getTime();
  if (now.getTime() - at > CHECK_IN_DRAFT_MAX_AGE_HOURS * 3_600_000 || at > now.getTime()) return undefined;

  const after = (iso: string) => {
    const t = new Date(iso).getTime();
    return t > at && t <= now.getTime();
  };
  const sleepMinutes = summaries
    .flatMap((d) => d.sleep.primaryLogs ?? [])
    .filter((log) => after(log.at))
    .reduce((sum, log) => sum + log.minutes, 0);
  const workouts = summaries
    .flatMap((d) => d.workouts)
    .filter((w) => (w.status === "COMPLETED" || w.status === "PARTIAL") && after(w.startedAt));
  const urges = summaries.flatMap((d) => d.urges).filter((u) => after(u.at)).length;

  const since: string[] = [];
  if (sleepMinutes > 0) since.push(`main sleep ${hoursAndMinutes(sleepMinutes)}`);
  for (const w of workouts) {
    const prs = (w.prCount ?? 0) > 0 ? `, ${w.prCount} ${w.prCount === 1 ? "PR" : "PRs"}` : "";
    since.push(`lift ${templateLabel(w.templateId)}${w.status === "PARTIAL" ? " (partial)" : ""}${prs}`);
  }
  if (urges > 0) since.push(`${urges} ${urges === 1 ? "urge" : "urges"}`);

  return {
    value: {
      energy: latest.energy,
      stress: latest.stress,
      mood: latest.mood,
      soreness: latest.soreness,
      alcoholUrge: latest.alcoholUrge,
    },
    reason: `Your check-in ${clock(latest.recordedAt)}`,
    basis: [
      { key: "lastCheckInId", value: latest.id },
      { key: "lastCheckInAt", value: latest.recordedAt },
    ],
    since,
  };
}

/** CONFIRMED when the submitted values are exactly the draft's, ADJUSTED otherwise. */
export function checkInDraftDecision(draft: CheckInDraftValues, submitted: CheckInDraftValues): "CONFIRMED" | "ADJUSTED" {
  const keys: (keyof CheckInDraftValues)[] = ["energy", "stress", "mood", "soreness", "alcoholUrge"];
  return keys.every((k) => draft[k] === submitted[k]) ? "CONFIRMED" : "ADJUSTED";
}
