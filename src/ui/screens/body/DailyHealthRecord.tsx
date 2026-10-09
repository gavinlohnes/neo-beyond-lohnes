import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LineIcon } from "../../icons/LineIcon";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import type { BodyweightEntry, ProteinEntry, SleepEntry } from "../../../application/queries";
import type { NutritionEntry } from "../../../application/nutritionQueries";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { TickNumber } from "../../feel/TickNumber";
import { formatDuration } from "./bodyScreenCopy";

export type HealthRecord =
  | { kind: "WATER"; entry: HydrationEntry }
  | { kind: "SLEEP"; entry: SleepEntry }
  | { kind: "WEIGHT"; entry: BodyweightEntry }
  | { kind: "PROTEIN"; entry: ProteinEntry }
  | { kind: "MEAL"; entry: NutritionEntry };

export function HealthOverview({ day, calories, protein, water, sleep, weight, mealEntries, calorieCopy, proteinCopy }: {
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
      <p className="meta health-day">
        {day ? `Day started ${new Date(day.startedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Your day begins with your first record."}
      </p>
      <div className="health-nutrition">
        <div><p className="tool-label">CALORIES</p><p className="health-number"><TickNumber value={calories} /><span> kcal</span></p><p className="meta">{calorieCopy}</p></div>
        <div><p className="tool-label">PROTEIN</p><p className="health-number"><TickNumber value={protein} /><span> g</span></p><p className="meta">{proteinCopy}</p></div>
      </div>
      <div className="health-readings">
        <div><p className="tool-label">WATER</p><p className="health-reading">{water} oz</p></div>
        <div><p className="tool-label">LAST WEIGHT</p><p className="health-reading">{lastWeight ? `${lastWeight.weightLbs} lbs` : "Not logged"}</p><p className="meta">{lastWeight ? new Date(lastWeight.recordedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Whenever it suits you"}</p></div>
        <div><p className="tool-label">MAIN SLEEP</p><p className="health-reading">{main ? formatDuration(main.effectiveDurationMinutes) : "Not logged"}</p>{mains > 1 && <p className="meta">Latest of {mains} main-sleep records</p>}</div>
        <div><p className="tool-label">NAPS</p><p className="health-reading">{naps.length ? formatDuration(naps.reduce((total, entry) => total + entry.effectiveDurationMinutes, 0)) : "Not logged"}</p>{naps.length > 1 && <p className="meta">{naps.length} naps recorded</p>}</div>
      </div>
      <FieldDisclosure summary={`${detailsOpen ? "HIDE" : "SHOW"} NUTRITION DETAILS`} open={detailsOpen} onToggle={setDetailsOpen}>
        <p className="meta">Carbs: {mealEntries.reduce((sum, entry) => sum + entry.effectiveCarbsG, 0)} g · Fat: {mealEntries.reduce((sum, entry) => sum + entry.effectiveFatG, 0)} g from recorded meals.</p>
        <p className="meta">Fiber is not recorded in the current meal data.</p>
      </FieldDisclosure>
    </section>
  );
}

function describeRecord(record: HealthRecord): string {
  switch (record.kind) {
    case "WATER": return `Water · ${record.entry.effectiveAmountOz} oz`;
    case "SLEEP": return `${record.entry.kind === "PRIMARY" ? "Main sleep" : "Nap"} · ${formatDuration(record.entry.effectiveDurationMinutes)}`;
    case "WEIGHT": return `Bodyweight · ${record.entry.effectiveWeightLbs} lbs`;
    case "PROTEIN": return `Protein · ${record.entry.effectiveGrams} g`;
    case "MEAL": return record.entry.name;
  }
}

/** Presentation of existing effective records only; never a second event store or audit trail. */
export function DailyHealthRecord({ water, sleep, weight, protein, meals, disabled, onInspect }: {
  water: readonly HydrationEntry[];
  sleep: readonly SleepEntry[];
  weight: readonly BodyweightEntry[];
  protein: readonly ProteinEntry[];
  meals: readonly NutritionEntry[];
  disabled: boolean;
  onInspect: (record: HealthRecord) => void;
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
      {(allOpen ? records : records.slice(0, 5)).map((record) => (
        <button className="health-record-row" key={record.entry.rootEventId} disabled={disabled}
          aria-label={`Inspect ${describeRecord(record)}`} onClick={() => onInspect(record)}>
          <span><span className="health-record-name">{describeRecord(record)}</span>
            {record.kind === "MEAL" && <span className="meta">{record.entry.effectiveCalories} kcal · {record.entry.effectiveProteinG} g protein</span>}
            <span className="meta">{new Date(record.entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{record.entry.correctionCount ? ` · corrected ${record.entry.correctionCount}x` : ""}</span>
          </span><LineIcon icon={ArrowUpRight} />
        </button>
      ))}
      {records.length > 5 && <button className="btn-secondary" onClick={() => setAllOpen(!allOpen)}>{allOpen ? "SHOW RECENT ENTRIES" : `SHOW ALL ${records.length} ENTRIES`}</button>}
    </section>
  );
}
