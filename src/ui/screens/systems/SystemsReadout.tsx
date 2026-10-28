import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSystemsReadout, SESSIONS_WINDOW_DAYS, type SystemsReadout as Readout } from "../../../application/systemsReadoutQueries";
import { getCustomTemplates } from "../../../application/customTemplateQueries";
import { getModePin } from "../../../application/modePinQueries";
import { getBackupPrompt } from "../../../application/autoBackupQueries";
import { Signal } from "../../components/Signal";
import type { InsightMetric } from "../../../application/bodyInsightsQueries";
import type { WorkoutTemplateId } from "../../../domain/workout/types";
import type { CustomWorkoutTemplate } from "../../../domain/workout/customTemplate";
import { OperatorHeader } from "../../components/OperatorHeader";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { useOnline } from "../../hooks/useOnline";
import { describeError } from "../../errorMessage";
import { readBootPhase } from "../today/bootMode";
import { MODE_NAMES, type ShiftClockPhase } from "../today/shiftClock";
import { describeStatusFact } from "../today/statusCopy";
import { describeReason } from "../today/capacityCopy";
import { templateLabel } from "../train/trainCopy";
import {
  clockTime,
  describeBackupAge,
  describeDaysAgo,
  describeStatusLevel,
  describeWorkContextSource,
  describeWorkContextValue,
  formatFuelReading,
  formatSleepReading,
} from "./systemsCopy";
import { Cave, type CaveOpen } from "./CaveVitals";
import type { CaveVitalId } from "../../../application/caveVitals";
import "./systems.css";

/** SUIT-ALIVE S3/S4: the last cave request handled, across mounts, so each opens the cave once. */
let lastCaveRequest = 0;

/**
 * SUIT-001: the SYSTEMS readout. Read only, from existing queries. BODY rows
 * open the existing metric history; everything else is a plain reading.
 * SUIT-ALIVE S2: sleep, protein, water and the check-in open the cave in place
 * (one reading in depth); bodyweight still opens its history directly, and the
 * cave links to full history.
 * SUIT-ALIVE S3/S4: TODAY's comms and route lines open the cave through `caveRequest`.
 */
export function SystemsReadout({ active, refreshKey = 0, onOpenMetric, caveRequest }: {
  active: boolean;
  /** Bumped after a write made while the readout stays shown (stealth). */
  refreshKey?: number;
  /** Opens DATA's existing history for that metric; absent, the rows are plain readings. */
  onOpenMetric?: ((metric: InsightMetric) => void) | undefined;
  /** A new key opens the cave on that view; each key opens it once. */
  caveRequest?: { key: number; tab: "tonight" | "route" | "brief" } | undefined;
}) {
  const online = useOnline();
  const [state, setState] = useState<{ readout: Readout; mode: ShiftClockPhase | null; pinned: boolean; templates: CustomWorkoutTemplate[]; now: Date; backupDue: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const [cave, setCave] = useState<CaveOpen | null>(() => caveRequest && caveRequest.key > lastCaveRequest ? { tab: caveRequest.tab } : null);
  // The readout re-renders when the cave closes, so focus returns to the row by what it opened, not by element.
  const returnTo = useRef<CaveVitalId | null>(null);
  function openCave(id: CaveVitalId) { returnTo.current = id; setCave({ tab: "vitals", vital: id }); }
  useEffect(() => {
    if (!caveRequest || caveRequest.key <= lastCaveRequest) return;
    lastCaveRequest = caveRequest.key;
    returnTo.current = null;
    setCave({ tab: caveRequest.tab });
  }, [caveRequest]);
  useEffect(() => {
    if (cave || !returnTo.current) return;
    document.querySelector<HTMLElement>(`[data-cave="${returnTo.current}"]`)?.focus({ preventScroll: true });
    returnTo.current = null;
  }, [cave]);

  async function refresh() {
    const request = ++sequence.current;
    const now = new Date();
    try {
      const [readout, mode, templates] = await Promise.all([getSystemsReadout(now), readBootPhase(now), getCustomTemplates({ includeArchived: true })]);
      if (request !== sequence.current) return;
      const pinned = !!readout.day && getModePin(readout.day.id, readout.day.startedAt, now) !== null;
      setState({ readout, mode, pinned, templates, now, backupDue: getBackupPrompt(now)?.kind === "BACKUP_DUE" });
      setError(null);
    } catch (e) {
      if (request !== sequence.current) return;
      setError(describeError(e, "Could not read the systems."));
    }
  }
  useEffect(() => { if (active) void refresh(); }, [active, refreshKey]);
  useDayRolloverRefresh(refresh);

  // TRAIN's own wording: "Template A", or a custom program's name.
  const label = (id: string) => `Template ${state ? templateLabel(id as WorkoutTemplateId, state.templates) : id}`;

  if (cave) return <Cave key={`${cave.tab}:${cave.vital ?? ""}:${lastCaveRequest}`} initial={cave} onBack={() => setCave(null)} onOpenMetric={onOpenMetric} />;

  return (
    <section className="systems" aria-labelledby="systems-title">
      <OperatorHeader destination="command" headingId="systems-title">MORE // SYSTEMS</OperatorHeader>
      <p className="systems__purpose">Readings only. No scores. You draw the conclusions.</p>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
      {!state && !error && <p className="meta" role="status">Reading…</p>}
      {state && (() => {
        const { readout: r, now } = state;
        const noDay = "No day started";
        return <>
          <Group title="BODY">
            <MetricRow metric="sleep" label="Last main sleep" onOpen={() => openCave("sleep")} action="Open in the cave" cave="sleep"
              value={r.lastMainSleep ? formatSleepReading(r.lastMainSleep.minutes) : "Not logged"}
              detail={r.lastMainSleep ? (r.lastMainSleep.fromGarmin ? `Garmin · woke ${clockTime(r.lastMainSleep.occurredAt)}` : `Logged ${clockTime(r.lastMainSleep.recordedAt)}`) : "Nothing in the last 36 hours."} />
            <MetricRow metric="protein" label="Protein" onOpen={() => openCave("protein")} action="Open in the cave" cave="protein"
              value={r.proteinG === null ? noDay : formatFuelReading(r.proteinG, r.proteinTargetG)}
              detail={r.proteinG !== null && r.proteinTargetG === undefined ? "No target set." : ""} />
            <MetricRow metric="water" label="Water" onOpen={() => openCave("water")} action="Open in the cave" cave="water" value={r.waterOz === null ? noDay : `${r.waterOz} oz`} />
            <MetricRow metric="weight" label="Bodyweight" onOpen={onOpenMetric} value={r.bodyweightLbs === undefined ? "Not logged" : `${r.bodyweightLbs} lb`} />
          </Group>
          <Group title="TRAINING">
            <Reading label={`Sessions, last ${SESSIONS_WINDOW_DAYS} days`} value={String(r.sessionsInWindow)} />
            <Reading label="Last session" value={r.lastSession ? describeDaysAgo(r.lastSession.at, now) : "None yet"}
              detail={r.lastSession ? `${label(r.lastSession.templateId)}${r.lastSession.status === "PARTIAL" ? " · partial" : ""}` : ""} />
            <Reading label="Next in rotation" value={r.nextTemplateId ? label(r.nextTemplateId) : "Not available"} />
          </Group>
          <Group title="STATE">
            <MetricRow metric="sleep" label="Check-in" onOpen={() => openCave("energy")} action="Open energy in the cave" cave="energy" value={r.checkIn ? r.checkIn.capacity : "Not done"}
              detail={r.checkIn ? [clockTime(r.checkIn.recordedAt), ...r.checkIn.reasonCodes.map(describeReason)].join(" · ") : r.day ? "No check-in today." : noDay} />
            <Reading label="System status" value={describeStatusLevel(r.status.level)} tone={r.status.level === "AMBER" || r.status.level === "RED" ? "warn" : undefined}
              detail={r.status.level === "NO_READ" ? "Log sleep or check in." : r.status.facts.map(describeStatusFact).join(", ")}>
              {r.statusRedWithNoAction && <p className="systems__note">Status reports recorded signals. “No action required” is separate guidance, not an all-clear about your sleep.</p>}
              <p className="systems__note">GREEN, AMBER or RED from last main sleep, today’s check-in and hard sessions in the last 4 days. It never changes BEYOND’s advice.</p>
            </Reading>
            <Reading label="Work context" value={r.day ? describeWorkContextValue(r.day.workContext) : noDay} detail={describeWorkContextSource(r.workContextSource)} />
            <Reading label="Mode" value={state.mode ? MODE_NAMES[state.mode] : "Not set"}
              detail={state.pinned ? "Pinned until 16:30" : state.mode ? "Per schedule" : "Answer the work question and the mode follows."} />
          </Group>
          <Group title="DEVICE">
            <Reading label="Connection" value={online ? "Online" : <Signal data-signal="offline">Offline</Signal>} tone={online ? undefined : "warn"} detail={online ? "" : "Offline. Logging still saves on this phone."} />
            <Reading label="Last backup" value={state.backupDue ? <Signal data-signal="backup">{describeBackupAge(r.daysSinceLastBackup)}</Signal> : describeBackupAge(r.daysSinceLastBackup)}
              tone={state.backupDue ? "warn" : undefined} detail={state.backupDue ? "Backup due. Export or share one from MORE." : "Export or share a backup from MORE."} />
            <Reading label="Records" value="On this phone" detail="No account. Nothing leaves unless you share a backup." />
          </Group>
        </>;
      })()}
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `systems-${title.toLowerCase()}`;
  return <section className="systems__group" aria-labelledby={id}><h2 id={id} className="section-label">{title}</h2>{children}</section>;
}

function Reading({ label, value, detail, tone, children }: { label: string; value: ReactNode; detail?: string; tone?: "warn" | undefined; children?: ReactNode }) {
  return <div className="systems__row">
    <span className="systems__text"><span className="systems__label">{label}</span>{detail && <span className="systems__detail">{detail}</span>}{children}</span>
    <span className={`systems__value${tone ? ` systems__value--${tone}` : ""}`}>{value}</span>
  </div>;
}

function MetricRow({ metric, label, value, detail, onOpen, action = "Open history", cave }: { metric: InsightMetric; label: string; value: string; detail?: string; onOpen?: ((metric: InsightMetric) => void) | undefined; action?: string; cave?: CaveVitalId }) {
  if (!onOpen) return <Reading label={label} value={value} {...(detail ? { detail } : {})} />;
  return <button type="button" className="systems__row systems__row--link" data-cave={cave} aria-label={`${label}: ${value}${detail ? `. ${detail.replace(/\.$/, "")}` : ""}. ${action}`} onClick={() => onOpen(metric)}>
    <span className="systems__text"><span className="systems__label">{label}</span>{detail && <span className="systems__detail">{detail}</span>}</span>
    <span className="systems__value">{value}</span>
    <span aria-hidden="true" className="systems__go">›</span>
  </button>;
}
