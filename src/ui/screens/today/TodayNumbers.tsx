import type { ReactNode } from "react";
import type { MeasuredSnapshot } from "../../../application/measuredQueries";
import { minuteOfDay, paceReading, type PaceHistories, type PaceReading } from "../../../application/pace";
import { sleepMinutes as measuredSleepMinutes } from "../../../domain/health/measuredSeries";
import { DecryptNumber } from "./DecryptNumber";
import { SyncGarminLink, describeGarminAsOf, measuredClock, type MeasuredMetric } from "./MeasuredSheet";
import { unusualAria, unusualTileLabel } from "./unusualCopy";

/**
 * BEYOND 4.0-a (Gavin, 2026-11-15; TodayScreen split, no visible change): TODAY's AT A GLANCE numbers, moved out of
 * TodayScreen.tsx as they were. Display only: every value arrives as a prop and every tap goes back to TODAY, which
 * keeps its in-flight guard and decides what opens.
 */
export interface TodayNumbersProps {
  measured: MeasuredSnapshot | null;
  operationsOnly: boolean;
  minimumDayProteinG: number;
  proteinTargetG: number | undefined;
  minimumDayHydrateOz: number;
  /** GRAYSON C4.6: his own daily water target; undefined shows no target. */
  waterTargetOz?: number | undefined;
  waterLogCount: number;
  latestWeightLbs: number | undefined;
  lastMainSleepMinutes: number | null;
  lastMainSleepFromGarmin: boolean;
  paceHistories: PaceHistories | null;
  now: Date;
  dayId: string | undefined;
  busy: boolean;
  fuelLine: string;
  /** Whether the logged tiles can open their records (TODAY's onOpenHealthEvidence is wired). */
  recordsAvailable: boolean;
  onOpenTile: (metric: "water" | "protein" | "weight" | "sleep") => void;
  onOpenMeasured: (metric: MeasuredMetric | null) => void;
  onOpenBody?: (() => void) | undefined;
  /** GRAYSON-LOG-NUDGE-001: the quiet line under the tiles at a usual meal time, or null. */
  logNudge?: { text: string; onTell: () => void; onNotNow: () => void } | null | undefined;
}

export function TodayNumbers({ measured, operationsOnly, minimumDayProteinG, proteinTargetG, minimumDayHydrateOz, waterTargetOz, waterLogCount, latestWeightLbs,
  lastMainSleepMinutes, lastMainSleepFromGarmin, paceHistories, now, dayId, busy, fuelLine, recordsAvailable, onOpenTile, onOpenMeasured, onOpenBody, logNudge }: TodayNumbersProps) {
  const day = dayId === undefined ? undefined : { id: dayId };
  const pct = proteinTargetG ? Math.min(100, Math.round((minimumDayProteinG / proteinTargetG) * 100)) : null;
  const sleep = lastMainSleepMinutes === null ? null : `${Math.floor(lastMainSleepMinutes / 60)}:${String(Math.round(lastMainSleepMinutes % 60)).padStart(2, "0")}`;
  // GARMIN-004: with Garmin data, STEPS and RESTING HR join the numbers and SLEEP shows your usual.
  const garminTiles = !operationsOnly && !!measured?.any;
  const stepsToday = measured?.steps.at(-1)?.value ?? null;
  // GARMIN-005: eaten (logged meals) next to burned (Garmin) once any calorie data has arrived.
  const calorieTile = garminTiles && !!measured?.anyCalories;
  const eatenToday = measured?.eaten.at(-1)?.value ?? null, burnedToday = measured?.burned.at(-1)?.value ?? null;
  const garminStale = calorieTile && measured!.caloriesAsOf !== null && measured!.readAt - measured!.caloriesAsOf > 12 * 3600_000;
  // Garmin publishes resting heart rate once a day, so the tile shows the latest from today or yesterday.
  const restingToday = measured?.resting.at(-1)?.value ?? measured?.resting.at(-2)?.value ?? null;
  const garminSleepMinutes = measured?.lastNight ? measuredSleepMinutes(measured.lastNight) : null;
  const visibleSleep = sleep ?? (garminSleepMinutes === null ? null : measuredClock(garminSleepMinutes));
  const sleepSource = sleep ? (lastMainSleepFromGarmin ? "GARMIN" : "LOGGED") : garminSleepMinutes !== null ? "GARMIN" : "NOT LOGGED";
  // SUIT-ALIVE S5, dark cockpit: a reading inside your normal dims; one behind your usual pace stays lit, in amber words.
  const minute = paceHistories ? minuteOfDay(paceHistories.dayStart, now) : 0;
  const proteinPace = paceHistories ? paceReading("protein", minimumDayProteinG, paceHistories.protein, minute) : null;
  const waterPace = paceHistories ? paceReading("water", minimumDayHydrateOz, paceHistories.water, minute) : null;
  const behind = (p: PaceReading | null) => p?.verdict === "BELOW";
  const steady = (p: PaceReading | null) => p?.verdict === "INSIDE" || p?.verdict === "ABOVE";
  const paceWords = (p: PaceReading | null) => p?.verdict === "BELOW" ? ", behind your usual pace" : steady(p) ? ", on or ahead of your usual pace" : "";
  const tile = (metric: "water" | "protein" | "weight" | "sleep", label: string, value: ReactNode, below: ReactNode, spoken: string, isSteady = false) =>
    <button type="button" className={isSteady ? "cc-steady" : undefined} disabled={busy || !recordsAvailable} aria-label={`${spoken}, explore records`} onClick={() => onOpenTile(metric)}>
      <span className="cc-flab">{label}</span><span className="cc-num">{value}</span>{below}
    </button>;
  return (
    <>
      <div className="cc-lbl cc-numbers-head">
        <h2><span className="cc-slashes" aria-hidden="true">/// </span>AT A GLANCE</h2>
        <span className="cc-numbers-actions">
          {garminTiles && <SyncGarminLink />}
          {onOpenBody && <button type="button" className="cc-see-all" disabled={busy} onClick={() => onOpenBody()}>SEE ALL</button>}
        </span>
      </div>
      <div className={`cc-fuel${garminTiles ? " cc-fuel--six" : ""}${calorieTile ? " cc-fuel--calories" : ""}`} role="group" aria-label={fuelLine}>
        {tile("protein", "PROTEIN", <><b>{minimumDayProteinG === 0 ? "—" : <DecryptNumber value={Math.round(minimumDayProteinG)} dayId={day?.id ?? "unstarted"} reading="protein" />}</b><small>{minimumDayProteinG === 0 ? "" : proteinTargetG !== undefined ? `/${proteinTargetG}g` : "g"}</small></>,
          // FIELD-AUTHORITY-001: a tile states facts; how the target is set lives in its history.
          // DENSITY-001: nothing logged reads "—" / NOT LOGGED like WATER, WEIGHT and SLEEP, never "—/182g".
          behind(proteinPace) ? <span className="cc-flab cc-flab--unusual">BEHIND PACE</span> : minimumDayProteinG === 0 ? <span className="cc-flab">NOT LOGGED</span> : pct === null ? <span className="cc-flab">NO TARGET</span> : <span className="cc-bar"><i style={{ width: `${pct}%` }} /></span>,
          `Protein ${minimumDayProteinG}${proteinTargetG !== undefined ? ` / ${proteinTargetG}` : ""} g${paceWords(proteinPace)}`, steady(proteinPace))}
        {calorieTile && <button type="button" className="cc-fuel-wide" disabled={busy}
          aria-label={`Calories eaten ${eatenToday === null ? "not logged" : eatenToday.toLocaleString("en-US")}, burned ${burnedToday === null ? "not measured" : `${burnedToday.toLocaleString("en-US")} so far`}, open calories`} onClick={() => onOpenMeasured("calories")}>
          <span className="cc-flab">CALORIES</span><span className="cc-num"><b>{eatenToday === null ? "—" : Math.round(eatenToday).toLocaleString("en-US")}</b><small>eaten</small></span>
          <span className="cc-flab">{burnedToday === null ? "BURNED —" : `BURNED ${burnedToday.toLocaleString("en-US")}`}</span>
        </button>}
        {/* LIFE-PATTERN-001: nothing logged reads "—" / NOT LOGGED, as WEIGHT and SLEEP already do, never a bare 0. */}
        {/* GRAYSON C4.6: with his own target, "48 / 100 oz" and TARGET MET once reached; pace words are unchanged. */}
        {tile("water", "WATER", waterLogCount === 0 ? <b>—</b> : <><b><DecryptNumber value={minimumDayHydrateOz} dayId={day?.id ?? "unstarted"} reading="water" /></b><small>{waterTargetOz !== undefined ? ` / ${waterTargetOz} oz` : "oz"}</small></>,
          behind(waterPace) ? <span className="cc-flab cc-flab--unusual">BEHIND PACE</span> : <span className="cc-flab">{waterLogCount === 0 ? "NOT LOGGED" : waterTargetOz !== undefined && minimumDayHydrateOz >= waterTargetOz ? "TARGET MET" : waterLogCount === 1 ? "1 LOG" : `${waterLogCount} LOGS`}</span>,
          `Water ${minimumDayHydrateOz}${waterTargetOz !== undefined ? ` of ${waterTargetOz}` : ""} oz${paceWords(waterPace)}`, steady(waterPace))}
        {tile("weight", "WEIGHT", <b>{latestWeightLbs === undefined ? "—" : latestWeightLbs.toFixed(1)}</b>,
          <span className="cc-flab">{latestWeightLbs === undefined ? "NOT LOGGED" : "LATEST"}</span>, latestWeightLbs === undefined ? "Weight not logged" : `Weight ${latestWeightLbs} lb`)}
        {garminTiles ? <button type="button" data-source={sleepSource === "GARMIN" ? "garmin" : undefined} className={measured!.usual.sleep.value !== null && !measured!.unusual.sleep && visibleSleep ? "cc-steady" : undefined} disabled={busy} aria-label={`${visibleSleep ? `Sleep ${visibleSleep}, ${sleepSource.toLowerCase()}` : "Sleep not logged or measured"}${measured!.usual.sleep.value !== null ? `, usual ${measuredClock(measured!.usual.sleep.value)}` : ""}${measured!.unusual.sleep ? unusualAria(measured!.unusual.sleep) : ""}, open sleep`} onClick={() => onOpenMeasured("sleep")}>
          <span className="cc-flab">SLEEP</span><span className="cc-num"><b>{visibleSleep ?? "—"}</b></span><span className={`cc-flab${measured!.unusual.sleep ? " cc-flab--unusual" : ""}`}>{measured!.unusual.sleep ? unusualTileLabel(measured!.unusual.sleep) : sleepSource}</span>
        </button> : tile("sleep", "SLEEP", <b>{sleep ?? "—"}</b>, <span className="cc-flab">{sleep ? "LAST MAIN" : "NOT LOGGED"}</span>,
          sleep ? `Main sleep ${sleep}` : "Main sleep not logged")}
        {garminTiles && <>
          <button type="button" data-source={stepsToday !== null ? "garmin" : undefined} className={[calorieTile ? "cc-fuel-wide" : "", measured!.usual.steps.value !== null && !measured!.unusual.steps && stepsToday !== null ? "cc-steady" : ""].filter(Boolean).join(" ") || undefined} disabled={busy} aria-label={`Steps ${stepsToday === null ? "not measured today" : stepsToday.toLocaleString("en-US")}${measured!.usual.steps.value !== null ? `, usual ${measured!.usual.steps.value.toLocaleString("en-US")}` : ""}${measured!.unusual.steps ? unusualAria(measured!.unusual.steps) : ""}, open steps`} onClick={() => onOpenMeasured("steps")}>
            <span className="cc-flab">STEPS</span><span className="cc-num"><b>{stepsToday === null ? "—" : stepsToday.toLocaleString("en-US")}</b></span>
            <span className={`cc-flab${measured!.unusual.steps ? " cc-flab--unusual" : ""}`}>{measured!.unusual.steps ? unusualTileLabel(measured!.unusual.steps) : measured!.usual.steps.value !== null ? `USUAL ${measured!.usual.steps.value.toLocaleString("en-US")}` : stepsToday === null ? "NOT MEASURED" : "GARMIN"}</span>
          </button>
          <button type="button" data-source={restingToday !== null ? "garmin" : undefined} className={measured!.usual.resting.value !== null && !measured!.unusual.resting && restingToday !== null ? "cc-steady" : undefined} disabled={busy} aria-label={`Resting heart rate ${restingToday === null ? "not measured" : `${restingToday} bpm`}${measured!.usual.resting.value !== null ? `, usual ${measured!.usual.resting.value}` : ""}${measured!.unusual.resting ? unusualAria(measured!.unusual.resting) : ""}, open resting heart rate`} onClick={() => onOpenMeasured("resting")}>
            <span className="cc-flab">RESTING HR</span><span className="cc-num"><b>{restingToday ?? "—"}</b>{restingToday !== null && <small>bpm</small>}</span>
            <span className={`cc-flab${measured!.unusual.resting ? " cc-flab--unusual" : ""}`}>{measured!.unusual.resting ? unusualTileLabel(measured!.unusual.resting) : measured!.usual.resting.value !== null ? `USUAL ${measured!.usual.resting.value}` : restingToday === null ? "NOT MEASURED" : "GARMIN"}</span>
          </button>
        </>}
      </div>
      {/* GRAYSON-LOG-NUDGE-001: one muted line, no red, no count; TELL DELTA opens Delta with "I ate " and sends nothing. */}
      {logNudge && <div className="cc-log-nudge" role="group" aria-label="Logging nudge">
        <p className="meta">{logNudge.text}</p>
        <span className="cc-log-nudge-actions">
          <button type="button" disabled={busy} onClick={logNudge.onTell}>TELL DELTA</button>
          <button type="button" disabled={busy} onClick={logNudge.onNotNow}>NOT NOW</button>
        </span>
      </div>}
      {/* FIELD-AUTHORITY-001: TONIGHT-001's "a weigh-in sets the target" moves out of the tile. */}
      {pct === null && latestWeightLbs === undefined && <p className="meta cc-numbers-note">A weigh-in sets the protein target.</p>}
      {/* GARMIN-005: Garmin numbers only move when the helper sends; say so when they are old. */}
      {garminStale && <p className="meta cc-numbers-note">{describeGarminAsOf(measured!.caloriesAsOf!, measured!.readAt).replace(/\.$/, "")}. Send from the helper to update.</p>}
    </>
  );
}
