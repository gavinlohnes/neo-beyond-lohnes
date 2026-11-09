import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, HardDriveDownload, MessageCircle, Search, Watch } from "lucide-react";
import { getSystemsOverview, type SystemsOverview } from "../../../application/systemsOverviewQueries";
import { readAlfredKey } from "../../components/AlfredSheet";
import "./systemsHome.css";

/**
 * MORE-HOME-001 (Gavin, 2026-11-09: "Redo more", in the YOUR LIFE style): MORE opens like YOUR LIFE —
 * the date, YOUR SYSTEMS., two actions, then one card per system saying how it is doing in a line with
 * one action, then a row per area that opens it. Everything below is unchanged; nothing is removed.
 * Status is only what was recorded: unknown reads as unknown, never as fine.
 */
export interface SystemsHomeArea { group: string; hint: string }

export function SystemsHome({ active, refreshKey, areas, busy, backupStatus, onBackUp, onSearch, onArea, onGarmin, onSchedule, onDriveSettings }: {
  active: boolean;
  refreshKey: number;
  areas: readonly SystemsHomeArea[];
  busy: boolean;
  backupStatus: string | null;
  onBackUp: () => void;
  onSearch: () => void;
  onArea: (group: string) => void;
  onGarmin: () => void;
  onSchedule: () => void;
  /** Opens Backup & recovery's automatic backups, where Drive's RECONNECT lives. */
  onDriveSettings: () => void;
}) {
  const [overview, setOverview] = useState<SystemsOverview | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getSystemsOverview().then((next) => { if (live) setOverview(next); }).catch(() => { if (live) setOverview("ERROR"); });
    return () => { live = false; };
  }, [active, refreshKey]);
  const now = new Date();
  const hasAlfredKey = Boolean(readAlfredKey());
  const facts = overview === "ERROR" ? null : overview;
  const drivePaused = facts?.backup.drive.on === true && facts.backup.drive.failure === "PAUSED";

  return (
    <div className="sys-home">
      <section className="sys-hero" aria-labelledby="sys-home-title">
        <p className="sys-eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h2 id="sys-home-title">YOUR SYSTEMS.</h2>
        <p className="sys-intro">Everything that keeps BEYOND running, in one place.</p>
        <div className="sys-hero-actions">
          <button type="button" className="sys-primary" disabled={busy} onClick={onBackUp}><HardDriveDownload size={20} aria-hidden="true" />Back up my data</button>
          <button type="button" onClick={onSearch}><Search size={20} aria-hidden="true" />Find anything</button>
        </div>
        {backupStatus && <p role="status" className="sys-caption">{backupStatus}</p>}
      </section>

      <nav className="sys-area-nav" aria-label="MORE areas">
        {areas.map((area) => (
          <button type="button" key={area.group} title={area.hint} onClick={() => onArea(area.group)}>
            <span>{area.group}</span><ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </nav>

      <section className="sys-section" aria-labelledby="sys-status-title">
        <p className="sys-eyebrow">HOW THINGS ARE</p>
        <h3 id="sys-status-title">Status</h3>
        <ul className="sys-cards">
          <li><StatusCard icon={<HardDriveDownload size={22} />} name="Backup" line={describeBackup(overview)} {...(drivePaused ? { action: { label: "Reconnect Drive", onClick: onDriveSettings } } : {})} /></li>
          <li><StatusCard icon={<Watch size={22} />} name="Garmin" line={describeGarmin(overview, now)} action={{ label: "Sync or import", onClick: onGarmin }} /></li>
          <li><StatusCard icon={<CalendarDays size={22} />} name="Work schedule" line={describeSchedule(overview)} action={{ label: "Open schedule", onClick: onSchedule }} /></li>
          <li><StatusCard icon={<MessageCircle size={22} />} name="Alfred" line={hasAlfredKey ? "Your Claude key is on this phone." : "No Claude key on this phone. BEYOND works without it."} /></li>
          {facts?.calendar.connected && <li><StatusCard icon={<CalendarDays size={22} />} name="Google Calendar" line={facts.calendar.lastSyncAt ? `Connected · synced ${since(Date.parse(facts.calendar.lastSyncAt), now)}.` : "Connected · not synced yet."} /></li>}
        </ul>
      </section>

    </div>
  );
}

function StatusCard({ icon, name, line, action }: { icon: React.ReactNode; name: string; line: string; action?: { label: string; onClick: () => void } }) {
  return (
    <article className="sys-card" aria-label={name}>
      <span className="sys-card__icon" aria-hidden="true">{icon}</span>
      <div>
        <h4>{name}</h4>
        <p>{line}</p>
        {action && <button type="button" onClick={action.onClick}>{action.label}<ArrowUpRight size={18} aria-hidden="true" /></button>}
      </div>
    </article>
  );
}

/** "2h ago", "3 days ago". */
export function since(at: number, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - at) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

type Overview = SystemsOverview | null | "ERROR";
const UNREAD = "Couldn't read status. Your records are unchanged.";

export function describeBackup(overview: Overview): string {
  if (overview === "ERROR") return UNREAD;
  if (!overview) return "Reading…";
  const { drive, daysSinceLastBackup } = overview.backup;
  if (drive.on) {
    if (drive.failure === "PAUSED") return "Google Drive · paused until you reconnect.";
    if (drive.lastSuccessAt) return `Google Drive, locked · last backup ${new Date(drive.lastSuccessAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${drive.failure === "FAILED" ? " · last attempt didn't finish" : ""}.`;
    return "Google Drive, locked · no backup yet.";
  }
  if (daysSinceLastBackup === null) return "No backup on record yet.";
  return daysSinceLastBackup === 0 ? "Last backup today." : `Last backup ${daysSinceLastBackup === 1 ? "1 day" : `${daysSinceLastBackup} days`} ago.`;
}

export function describeSchedule(overview: Overview): string {
  if (overview === "ERROR") return UNREAD;
  if (!overview) return "Reading…";
  if (overview.scheduleSaved === undefined) return "Couldn't read your schedule.";
  return overview.scheduleSaved ? "Your saved shifts decide work days and days off." : "Not saved yet. BEYOND won't decide your work days from a schedule until you save yours.";
}

export function describeGarmin(overview: Overview, now: Date): string {
  if (overview === "ERROR") return UNREAD;
  if (!overview) return "Reading…";
  if (overview.garminAsOf === undefined) return "Couldn't read Garmin data.";
  if (overview.garminAsOf === null) return "No Garmin data imported yet.";
  return `Last Garmin data from ${since(overview.garminAsOf, now)}.`;
}
