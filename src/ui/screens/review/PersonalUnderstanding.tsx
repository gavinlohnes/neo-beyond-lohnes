import { useEffect, useRef, useState } from "react";
import { getPersonalUnderstanding, type PersonalUnderstanding as Understanding } from "../../../application/personalUnderstandingQueries";
import { describeBaselines } from "../weekly/weeklyCopy";
import { describePosition, positionName } from "./rotationCopy";
import { describeError } from "../../errorMessage";
import "./personalUnderstanding.css";

export type UnderstandingSource = { kind: "MISSION" | "JOURNAL"; id: string } | { kind: "TARGETS" | "SCHEDULE" };
type Props = { active: boolean; onOpenHistory?: ((id: string) => void) | undefined; onOpenSource?: ((source: UnderstandingSource) => void) | undefined };
const date = (at: string | Date) => new Date(at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const amount = (measure: string, value: number) => measure === "MAIN_SLEEP" ? `${Math.floor(value / 60)}h ${Math.round(value % 60)}m` : `${Math.round(value)} ${measure === "WATER" ? "oz" : "g"}`;
const measureName = (measure: string) => measure === "MAIN_SLEEP" ? "Main sleep" : measure === "WATER" ? "Water" : "Protein";

/** Optional Inspect depth. All knowledge is derived; nothing here records or infers a preference. */
export function PersonalUnderstanding({ active, onOpenHistory, onOpenSource }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"Choices" | "Patterns" | "Lessons">("Choices");
  const [data, setData] = useState<Understanding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(5);
  const [placeKey, setPlaceKey] = useState("");
  const sequence = useRef(0);
  useEffect(() => {
    if (!active || !open) return;
    let alive = true;
    const request = ++sequence.current;
    setData(null); setError(null); setReading(true);
    void getPersonalUnderstanding().then((next) => {
      if (alive && request === sequence.current) setData(next);
    }).catch((cause: unknown) => {
      if (alive && request === sequence.current) setError(describeError(cause, "Could not read personal understanding."));
    }).finally(() => { if (alive && request === sequence.current) setReading(false); });
    return () => { alive = false; sequence.current++; };
  }, [active, open, retry]);
  function sourceButton(source: UnderstandingSource, label: string) {
    return onOpenSource && <button type="button" className="btn-secondary" onClick={() => onOpenSource(source)}>{label}</button>;
  }
  const place = data?.positions.find((position) => `${position.context}-${position.position}` === placeKey) ?? data?.positions[0];
  return <section aria-label="Personal understanding"><details className="personal-understanding" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span>PERSONAL UNDERSTANDING</span><span className="meta">Your choices, patterns & lessons</span></summary>
    {open && <div className="understanding-body">
      <p className="card-body">What you have chosen, what your records show, and what you have learned. This is a view of your records, not a judgment about who you are.</p>
      <div className="understanding-navigation" role="group" aria-label="Personal understanding views">
        {(["Choices", "Patterns", "Lessons"] as const).map((name) => <button type="button" className="btn-secondary" key={name} aria-pressed={view === name} onClick={() => { setView(name); setLimit(5); }}>{name}</button>)}
      </div>
      {reading && <p role="status">Connecting your recorded context…</p>}
      {error && <div><p role="alert">{error} Your knowledge is unavailable, not empty. No records were changed.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY PERSONAL UNDERSTANDING</button></div>}
      {data && !reading && !error && <>
        <p className="meta">Read on {date(data.readAt)} · on this device · nothing here changes your plan</p>
        {view === "Choices" && <section aria-label="Your recorded choices">
          <h2 className="tool-label">WHAT MATTERS TO YOU</h2>
          <p className="meta">Active Missions you recorded. Their order is not a priority ranking.</p>
          {data.missions.length === 0 && <p>No active Mission is recorded. BEYOND will not guess your priorities.</p>}
          {data.missions.slice(0, limit).map((mission) => <article key={mission.id} className="understanding-item">
            <h3>{mission.title}</h3>{mission.description && <p className="understanding-words">{mission.description}</p>}
            <p className="meta">Source: Mission · {mission.source === "USER" ? "your entry" : mission.source.toLowerCase()} · updated {date(mission.updatedAt)}</p>
            {sourceButton({ kind: "MISSION", id: mission.id }, "OPEN MISSION")}
            {mission.relatedLessons.length > 0 && <details><summary>Related written lessons ({mission.relatedLessons.length})</summary>
              <p className="meta">Matched by words in this Mission and your reviewed decisions, not a confirmed relationship or advice.</p>
              {mission.relatedLessons.map((lesson) => <div key={lesson.id}><p className="understanding-words"><strong>{lesson.title}</strong> · {lesson.lesson}</p><p className="meta">Reviewed {date(lesson.reviewedAt ?? lesson.updatedAt)}</p>{sourceButton({ kind: "JOURNAL", id: lesson.id }, "OPEN MATCHED DECISION")}</div>)}
            </details>}
          </article>)}
          {data.missions.length > limit && <button className="btn-secondary" type="button" onClick={() => setLimit((n) => n + 5)}>SHOW MORE MISSIONS</button>}
          <h2 className="tool-label">TARGETS YOU SET</h2>
          <p className="meta">These are selected targets, not your usual behavior or automatic judgments.</p>
          {!data.targets.length && <p>No optional targets are set. Defaults are not presented as personal choices.</p>}
          {data.targets.map((target) => <p key={target.key}>{target.label}: <strong>{target.value} {target.unit}</strong><br /><span className="meta">Source: Targets · settings updated {date(target.updatedAt)}</span></p>)}
          {sourceButton({ kind: "TARGETS" }, "REVIEW OR CHANGE TARGETS")}
          <h2 className="tool-label">YOUR CHOSEN WEEKLY FOCUS</h2>
          {data.focus?.focus ? <details><summary>Read your saved focus</summary><p className="understanding-words">{data.focus.focus.text}</p><p className="meta">Source: saved weekly review · week starting {date(data.focus.weekStart)} · recorded {date(data.focus.recordedAt)}</p><p>Change it in Review’s existing Carry forward controls. It is not a new task.</p></details> : <p>No focus is saved for the latest completed review week. There is nothing to catch up on.</p>}
          <h2 className="tool-label">SCHEDULE CONTEXT</h2>
          <p>{data.schedule.weeks.length}-week configured rotation · shift {String(data.schedule.shiftStartHour).padStart(2, "0")}:00–{String(data.schedule.shiftEndHour).padStart(2, "0")}:00</p>
          <p>The configured rotation supplies forecasts. Recorded work/day-off context supplies the historical comparisons; a forecast does not rewrite the past.</p>
          <p className="meta">Source: Work Schedule · {Date.parse(data.schedule.updatedAt) === 0 ? "default configuration; not a confirmed preference" : `configuration updated ${date(data.schedule.updatedAt)}`}</p>
          {sourceButton({ kind: "SCHEDULE" }, "REVIEW WORK SCHEDULE")}
        </section>}
        {view === "Patterns" && <section aria-label="Patterns from your records">
          <h2 className="tool-label">YOUR USUAL, NOT A TARGET</h2>
          <p>Your last 7 finished BEYOND days compared with the 56 days before them. Work days and days off stay separate. A usual range is not a health recommendation.</p>
          {data.baselines.map(({ reading, baseline, recent }) => <details className="understanding-item" key={`${reading.measure}-${reading.dayKind}`}>
            <summary>{measureName(reading.measure)} · {reading.dayKind === "WORK" ? "work days" : "days off"}<span className="meta">{reading.kind === "LEARNING" ? `Still learning · ${reading.have} of ${reading.need} qualifying days` : reading.kind === "NOT_THIS_WEEK" ? `Usual ${amount(reading.measure, reading.low)}–${amount(reading.measure, reading.high)} · too few recent days to compare` : describeBaselines([reading])[0]?.headline}</span></summary>
            <p>Source: recorded {measureName(reading.measure).toLowerCase()}. Missing or partial logging is not zero. {measureName(reading.measure) === "Main sleep" ? "Naps are excluded." : reading.measure === "PROTEIN" ? "A qualifying day needs at least two food entries." : "A qualifying day needs two water entries or one of at least 40 oz."}</p>
            <p className="meta">Recent window: {date(data.periodWindow.from)} → {date(data.periodWindow.to)} (end excluded). Baseline: {date(data.baselineWindow.from)} → {date(data.baselineWindow.to)} (end excluded).</p>
            <EvidenceList title={`Recent qualifying days (${recent.length})`} points={recent.map((p) => ({ at: p.livedDayStart, ids: p.dayIds, text: amount(reading.measure, p.value) }))} onOpenHistory={onOpenHistory} />
            <EvidenceList title={`Baseline qualifying days (${baseline.length})`} points={baseline.map((p) => ({ at: p.livedDayStart, ids: p.dayIds, text: amount(reading.measure, p.value) }))} onOpenHistory={onOpenHistory} />
          </details>)}
          <h2 className="tool-label">WHEN YOU HAVE BEEN HERE BEFORE</h2>
          <p>Explore the same position in previous work runs or stretches off, across the last 56 finished days. These are patterns, never causes or predictions.</p>
          {!place && <p>Not enough recorded rotation context yet. Mark work days and days off as you use BEYOND; no extra checklist is needed.</p>}
          {place && <>
            <label className="meta" htmlFor="understanding-position">Choose a comparable situation</label>
            <select className="input" id="understanding-position" value={`${place.context}-${place.position}`} onChange={(event) => setPlaceKey(event.target.value)}>
              {data.positions.map((position) => <option key={`${position.context}-${position.position}`} value={`${position.context}-${position.position}`}>{positionName(position)}</option>)}
            </select>
            <p>{positionName(place)} · {describePosition(place)}</p>
            <p className="meta">{place.rows.length} comparable recorded positions. Unknown context and the run clipped by the history boundary are excluded. The sleep and energy averages each need 3 measured days.</p>
            <EvidenceList key={`${place.context}-${place.position}`} title="Inspect comparable days" points={place.rows.map((row) => ({ at: row.start, ids: row.dayIds, text: `sleep ${row.sleepHours === undefined ? "not recorded" : amount("MAIN_SLEEP", row.sleepHours * 60)} · energy ${row.energy ?? "not recorded"} · ${row.sessions} counted training sessions` }))} onOpenHistory={onOpenHistory} />
          </>}
        </section>}
        {view === "Lessons" && <section aria-label="Your written lessons">
          <h2 className="tool-label">WHAT YOU HAVE LEARNED</h2>
          <p>Your own reviewed reflections, across all recorded dates. BEYOND has not inferred a lesson or assumed it still applies.</p>
          {!data.lessons.length && <p>No written lessons yet. You can add one when you review a real decision; there is no obligation to journal.</p>}
          {data.lessons.slice(0, limit).map((entry) => <details className="understanding-item" key={entry.id}>
            <summary><span>{entry.title}</span><span className="meta">Reviewed {date(entry.reviewedAt ?? entry.updatedAt)} · your written lesson</span></summary>
            <p className="understanding-words"><strong>Lesson:</strong> {entry.lesson}</p>
            <p className="understanding-words"><strong>Decision:</strong> {entry.decision}</p>
            <p className="understanding-words"><strong>Expected:</strong> {entry.expectation || "Not recorded"}</p>
            <p className="understanding-words"><strong>Outcome:</strong> {entry.outcome}</p>
            <p className="meta">Source: Decision Journal · updated {date(entry.updatedAt)}</p>
            {sourceButton({ kind: "JOURNAL", id: entry.id }, "OPEN ORIGINAL DECISION")}
          </details>)}
          {data.lessons.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE LESSONS</button>}
        </section>}
      </>}
    </div>}
  </details></section>;
}

function EvidenceList({ title, points, onOpenHistory }: { title: string; points: { at: string; ids: string[]; text: string }[]; onOpenHistory: Props["onOpenHistory"] }) {
  const [limit, setLimit] = useState(5);
  return <details className="understanding-evidence"><summary>{title}</summary>
    {!points.length && <p>No qualifying records in this window.</p>}
    {points.slice(0, limit).map((point) => <div className="understanding-item" key={point.at}>
      <p>{date(point.at)} · {point.text}</p>
      {point.ids.map((id, index) => onOpenHistory && <button type="button" className="btn-secondary" key={id} onClick={() => onOpenHistory(id)}>OPEN DAY RECORDS{point.ids.length > 1 ? ` · segment ${index + 1}` : ""}</button>)}
    </div>)}
    {points.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE RECORDS</button>}
  </details>;
}
