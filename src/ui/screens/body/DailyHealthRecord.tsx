import { HoldButton } from "../../components/HoldButton";
import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LineIcon } from "../../icons/LineIcon";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import type { BodyweightEntry, ProteinEntry, SleepEntry } from "../../../application/queries";
import type { NutritionEntry } from "../../../application/nutritionQueries";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { Readout, ReadoutGrid } from "../../components/ReadoutGrid";
import { TickNumber } from "../../feel/TickNumber";
import { formatDuration } from "./bodyScreenCopy";

import type { HealthRecord } from "../../../application/healthRecordQueries";
import type { InsightMetric } from "../../../application/bodyInsightsQueries";
export type { HealthRecord } from "../../../application/healthRecordQueries";
import type { ReactNode } from "react";
import "./connectedHealth.css";

/** A direct evidence entry point, separate from the generic read-only Readout component. */
export function HealthMeasure({ label, value, detail, metric, onExplore }: {
  label: string; value: ReactNode; detail?: ReactNode; metric: InsightMetric;
  onExplore?: ((metric: InsightMetric) => void) | undefined;
}) {
  const valueId = useId();
  if (!onExplore) return <Readout label={label} value={value} detail={detail} />;
  return <button type="button" className="readout health-metric" onClick={() => onExplore(metric)} aria-label={`${label.toLowerCase()} history`} aria-describedby={valueId}>
    <span className="tool-label">{label}</span><span id={valueId} className="readout__value" style={{ display: "block" }}>{value}</span>
    {detail && <span className="meta readout__detail" style={{ display: "block" }}>{detail}</span>}
  </button>;
}

export function HealthOverview({ day, calories, protein, water, sleep, weight, mealEntries, calorieCopy, proteinCopy, onExplore }: {
  onExplore?: ((metric: InsightMetric) => void) | undefined;
  day: BeyondDay | null;
  calories: number;
  protein: number;
  water: number;
  sleep: readonly SleepEntry[];
  weight: readonly WeighIn[];
  mealEntries: readonly NutritionEntry[];
  calorieCopy: string;
  proteinCopy: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const main = sleep.filter((entry) => entry.kind === "PRIMARY").at(-1);
  const mains = sleep.filter((entry) => entry.kind === "PRIMARY").length;
  const naps = sleep.filter((entry) => entry.kind === "SUPPLEMENTAL");
  const lastWeight = weight.at(-1);
  return (
    <section className="health-overview" aria-label="Your daily health record">
      {/* UX-COHESION-001: the lived-day boundary is internal; only say something when no day exists yet. */}
      {!day && <p className="meta health-day">Your day begins with your first record.</p>}
      <ReadoutGrid emphasis="primary" className="health-nutrition">
        <HealthMeasure metric="calories" onExplore={onExplore} label="CALORIES" value={<><TickNumber value={calories} /><span> kcal</span></>} detail={calorieCopy} />
        <HealthMeasure metric="protein" onExplore={onExplore} label="PROTEIN" value={<><TickNumber value={protein} /><span> g</span></>} detail={proteinCopy} />
      </ReadoutGrid>
      <ReadoutGrid className="health-readings">
        <HealthMeasure metric="water" onExplore={onExplore} label="WATER" value={`${water} oz`} />
        <HealthMeasure metric="weight" onExplore={onExplore} label="LAST WEIGHT" value={lastWeight ? `${lastWeight.weightLbs} lbs` : "Not logged"}
          detail={lastWeight ? new Date(lastWeight.recordedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : undefined} />
        <HealthMeasure metric="sleep" onExplore={onExplore} label="MAIN SLEEP" value={main ? formatDuration(main.effectiveDurationMinutes) : "Not logged"}
          detail={mains > 1 ? `Latest of ${mains} main-sleep records` : main?.fromGarmin ? "Garmin" : undefined} />
        {/* UX-COHESION-001: naps appear when there are naps, not as a standing "Not logged". */}
        {naps.length > 0 && <Readout label="NAPS" value={formatDuration(naps.reduce((total, entry) => total + entry.effectiveDurationMinutes, 0))}
          detail={naps.length > 1 ? `${naps.length} naps recorded` : undefined} />}
      </ReadoutGrid>
      <FieldDisclosure summary={`${detailsOpen ? "HIDE" : "SHOW"} NUTRITION DETAILS`} open={detailsOpen} onToggle={setDetailsOpen}>
        <p className="meta">Carbs: {mealEntries.reduce((sum, entry) => sum + entry.effectiveCarbsG, 0)} g · Fat: {mealEntries.reduce((sum, entry) => sum + entry.effectiveFatG, 0)} g from recorded meals.</p>
        <p className="meta">Fiber is not recorded in the current meal data.</p>
      </FieldDisclosure>
    </section>
  );
}

export function describeRecord(record: HealthRecord): string {
  switch (record.kind) {
    case "WATER": return `Water · ${record.entry.effectiveAmountOz} oz`;
    case "SLEEP": return `${record.entry.kind === "PRIMARY" ? "Main sleep" : "Nap"} · ${formatDuration(record.entry.effectiveDurationMinutes)}`;
    case "WEIGHT": return `Bodyweight · ${record.entry.effectiveWeightLbs} lbs`;
    case "PROTEIN": return `Protein · ${record.entry.effectiveGrams} g`;
    case "MEAL": return record.entry.name;
  }
}

/** Presentation of existing effective records only; never a second event store or audit trail. */
export function DailyHealthRecord({ water, sleep, weight, protein, meals, disabled, onInspect, holdToInspect = false }: {
  water: readonly HydrationEntry[];
  sleep: readonly SleepEntry[];
  weight: readonly BodyweightEntry[];
  protein: readonly ProteinEntry[];
  meals: readonly NutritionEntry[];
  disabled: boolean;
  onInspect: (record: HealthRecord) => void;
  holdToInspect?: boolean;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const records: HealthRecord[] = [
    ...water.map((entry): HealthRecord => ({ kind: "WATER", entry })),
    ...sleep.map((entry): HealthRecord => ({ kind: "SLEEP", entry })),
    ...weight.map((entry): HealthRecord => ({ kind: "WEIGHT", entry })),
    ...protein.map((entry): HealthRecord => ({ kind: "PROTEIN", entry })),
    ...meals.map((entry): HealthRecord => ({ kind: "MEAL", entry })),
  ];
  records.sort((a, b) => b.entry.recordedAt.localeCompare(a.entry.recordedAt) || a.entry.rootEventId.localeCompare(b.entry.rootEventId));
  return (
    <section className="health-record" aria-label="Recorded this day">
      <div className="health-section-heading"><h2 className="section-label">Recorded this day</h2><span className="meta">{records.length} {records.length === 1 ? "entry" : "entries"}</span></div>
      {records.length === 0 && <p className="meta">Nothing recorded yet. Record what is useful to you.</p>}
      {(allOpen ? records : records.slice(0, 5)).map((record) => holdToInspect ? <HoldButton key={record.entry.rootEventId} className="health-record-row" disabled={disabled} hint="Hold to open correction or deletion. Nothing changes until you confirm." onConfirm={() => onInspect(record)}>{describeRecord(record)} · {new Date(record.entry.recordedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</HoldButton> : (
        <button className="health-record-row" key={record.entry.rootEventId} disabled={disabled}
          aria-label={`Open ${describeRecord(record)}`} onClick={() => onInspect(record)}>
          <span><span className="health-record-name">{describeRecord(record)}</span>
            {record.kind === "MEAL" && <span className="meta">{record.entry.effectiveCalories} kcal · {record.entry.effectiveProteinG} g protein</span>}
            <span className="meta">{new Date(record.entry.recordedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}{record.entry.correctionCount ? ` · corrected ${record.entry.correctionCount}x` : ""}</span>
          </span><LineIcon icon={ArrowUpRight} />
        </button>
      ))}
      {records.length > 5 && <button className="btn-secondary" onClick={() => setAllOpen(!allOpen)}>{allOpen ? "SHOW RECENT ENTRIES" : `SHOW ALL ${records.length} ENTRIES`}</button>}
    </section>
  );
}
