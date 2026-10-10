import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { db } from "../../../persistence/db";
import { exportBackup, getDaysSinceLastBackup, shareBackup } from "../../../persistence/backup";
import { previewAnyRestore, applyAnyRestore, type RestorePreview } from "../../../persistence/restore";
import { getActiveDay, getDayCount, getEventCount, getRecommendationCount } from "../../../application/queries";
import { getAdvisoryNotes } from "../../../application/advisoryQueries";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { ENGINE_VERSION } from "../../../engine/evaluate";
import { APP_RELEASE, BUILD_COMMIT, BUILD_TIME } from "../../../app/buildInfo";
import { HistoryScreen } from "../history/HistoryScreen";
import { ReviewScreen } from "../review/ReviewScreen";
import { SearchScreen } from "../search/SearchScreen";
import type { SearchResult } from "../../../application/searchQueries";
import { WorkScheduleScreen } from "./WorkScheduleScreen";
import { IntentScreen, type IntentFocus } from "./IntentScreen";
import { JournalScreen } from "./JournalScreen";
import { ExerciseLibraryScreen } from "./ExerciseLibraryScreen";
import { CustomTemplateScreen } from "./CustomTemplateScreen";
import { NutritionTargetsSettings } from "./NutritionTargetsSettings";
import { AutoBackupSettings } from "./AutoBackupSettings";
import { TimeCapsuleSettings } from "./TimeCapsuleSettings";
import { WeeklyCheckInScreen } from "../weekly/WeeklyCheckInScreen";
import { LineIcon } from "../../icons/LineIcon";
import { CalendarCheck } from "lucide-react";
import { QuitHabitSettings } from "./QuitHabitSettings";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { WhyDisclosure } from "../../components/WhyDisclosure";
import { Icon } from "../../icons/Icon";
import "./operator.css";
import { OperatorHeader } from "../../components/OperatorHeader";
import {
  getCheckInReminderPreference,
  requestCheckInNotificationPermission,
  setCheckInReminderPreference,
  type CheckInReminderPreference,
} from "../../../application/checkInReminderQueries";
import { formatReminderHour } from "./moreCopy";
import { describeError } from "../../errorMessage";

const REMINDER_HOUR_OPTIONS = [6, 7, 8, 9, 12, 17, 18, 19, 20, 21, 22];

// FIELD ALPHA Phase 0 truth-hygiene fix: this was hardcoded at 4 (stale
// since the Drop 02a/schedulePatterns migration) while the live Dexie
// version below in Diagnostics had already moved on to 6 (captureItems,
// then missions/obligations) — the same screen was showing two different
// answers to "what schema is this?" Now reads the live value directly so
// it can't drift again.
const DATA_SCHEMA = db.verno;

export type MoreView = "MENU" | "HISTORY" | "REVIEW" | "WEEKLY" | "SEARCH" | "WORK_SCHEDULE" | "INTENT" | "JOURNAL" | "EXERCISE_LIBRARY" | "CUSTOM_TEMPLATES";

export function MoreScreen({
  onOpenCapture,
  initialView = "MENU",
  onOpenRecords,
  onOpenMeal,
}: {
  onOpenCapture?: () => void;
  /** Existing subviews can be opened by SYSTEM; the top-bar icon still opens SEARCH. */
  initialView?: MoreView;
  /** FIND-001: a LIFT or PR result opens TRAIN → RECORDS at that lift's curve. */
  onOpenRecords?: (exerciseId: string) => void;
  /** FIND-001: a MEAL result opens BODY's meal entry. */
  onOpenMeal?: () => void;
} = {}) {
  const [view, setViewState] = useState<MoreView>(initialView);
  const menuRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<{ trigger: HTMLElement | null; scrollY: number } | null>(null);
  const previousView = useRef(view);

  function setView(next: MoreView) {
    if (view === "MENU" && next !== "MENU") {
      originRef.current = { trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null, scrollY: window.scrollY };
    }
    setViewState(next);
  }

  useLayoutEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    if (view === "MENU") {
      const origin = originRef.current;
      const trigger = origin?.trigger;
      if (trigger?.isConnected && menuRef.current?.contains(trigger)) trigger.focus({ preventScroll: true });
      else menuRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
      window.scrollTo({ top: origin?.scrollY ?? 0, behavior: "instant" });
    } else {
      backRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [view]);
  // FIND-001: a NOTE or DAY result opens HISTORY with that day open.
  const [historyFocusDayId, setHistoryFocusDayId] = useState<string | null>(null);
  // Search-to-navigate (2026-09-02): set only by handleSelectSearchResult below, and cleared by
  // the ordinary "MISSIONS & OBLIGATIONS" menu entry point — see its onOpen below. This is what
  // lets IntentScreen open straight to a specific record from Search without a normal visit to
  // MORE's own menu ever reopening that same stale focus later.
  const [intentFocus, setIntentFocus] = useState<IntentFocus | null>(null);

  function handleSelectSearchResult(result: SearchResult) {
    // FIND-001: the new kinds open where they live.
    if ((result.domain === "LIFT" || result.domain === "PR") && result.exerciseId && onOpenRecords) {
      onOpenRecords(result.exerciseId);
      return;
    }
    if (result.domain === "MEAL" && onOpenMeal) {
      onOpenMeal();
      return;
    }
    if (result.domain === "JOURNAL") {
      setView("JOURNAL");
      return;
    }
    if (result.domain === "NOTE" || result.domain === "DAY") {
      setHistoryFocusDayId(result.dayId ?? null);
      setView("HISTORY");
      return;
    }
    if (result.domain === "CAPTURE") {
      // Capture has no dedicated browsing surface of its own — TODAY's inbox is the only place
      // it's triaged. Switching tabs is the honest amount of "navigate" available here; scrolling
      // to this exact item would be a false precision claim for a resolved/historical capture
      // that may not even be rendered in TODAY's current inbox.
      onOpenCapture?.();
      return;
    }
    setIntentFocus(
      result.domain === "MISSION" ? { kind: "MISSION", missionId: result.id } : { kind: "OBLIGATION", obligationId: result.id },
    );
    setView("INTENT");
  }
  const [days, setDays] = useState(0);
  const [events, setEvents] = useState(0);
  const [recommendations, setRecommendations] = useState(0);
  const [activeDayYes, setActiveDayYes] = useState(false);
  // Intelligence Spine — I2: informational only, DIAGNOSTIC-tier (same
  // TECHNICAL DETAIL treatment as days/events/recommendations below) —
  // never a claim, never actionable here. See advisoryQueries.ts and
  // .claude/rules/engine.md's advisory.ts entry for the one-way boundary
  // this stays behind.
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [readError, setReadError] = useState<string | null>(null);
  const [advisoryNotes, setAdvisoryNotes] = useState<AdvisoryNote[]>([]);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const readSequence = useRef(0);
  // DECLUTTER Drop 3: backup status lives here now, beside EXPORT BACKUP, instead of as a TODAY reminder.
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(() => getDaysSinceLastBackup());
  const disposedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // REMIND-001: loaded once from localStorage on mount (getCheckInReminderPreference
  // never throws, so no loading state is needed) — every change writes through
  // setCheckInReminderPreference immediately, matching this screen's other
  // immediate-action controls rather than a separate SAVE step.
  const [reminderPreference, setReminderPreference] = useState<CheckInReminderPreference>(() =>
    getCheckInReminderPreference(),
  );
  const [reminderPermissionDenied, setReminderPermissionDenied] = useState(false);

  useEffect(() => {
    disposedRef.current = false;
    void refresh().catch((error) => {
      if (disposedRef.current && isDatabaseClosedError(error)) return;
      console.error("MORE diagnostics refresh failed.", error);
    });
    return () => {
      disposedRef.current = true;
    };
  }, [view]);

  async function refresh() {
    const sequence = ++readSequence.current;
    setReadState("loading");
    setReadError(null);
    try {
      const [nextDays, nextEvents, nextRecommendations, activeDay, nextAdvisoryNotes] = await Promise.all([
        getDayCount(),
        getEventCount(),
        getRecommendationCount(),
        getActiveDay(),
        getAdvisoryNotes(),
      ]);
      if (disposedRef.current || sequence !== readSequence.current) return;
      setDays(nextDays);
      setEvents(nextEvents);
      setRecommendations(nextRecommendations);
      setActiveDayYes(activeDay !== undefined);
      setAdvisoryNotes(nextAdvisoryNotes);
      setReadState("ready");
    } catch (error) {
      if (disposedRef.current || sequence !== readSequence.current) return;
      setReadState("error");
      setReadError(describeError(error, "Could not read diagnostic information."));
    }
  }

  async function handleExportBackup() {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setArchiveStatus(null);
    try {
      await exportBackup();
      setArchiveStatus("Backup file downloaded. Keep it somewhere safe.");
    } catch (error) {
      setArchiveStatus(describeError(error, "Could not export backup. Try again."));
    } finally {
      setDaysSinceBackup(getDaysSinceLastBackup());
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  // REMIND-001: writes through immediately, matching this screen's other
  // immediate-action controls — no separate SAVE step for a preference
  // this small. Turning on requests permission first (a real, user-
  // initiated gesture, never automatic) — if denied, the preference
  // stays off and reminderPermissionDenied surfaces the plain reason.
  async function handleToggleReminder() {
    if (reminderPreference.enabled) {
      const next: CheckInReminderPreference = { ...reminderPreference, enabled: false };
      setCheckInReminderPreference(next);
      setReminderPreference(next);
      return;
    }
    const permission = await requestCheckInNotificationPermission();
    if (permission !== "granted") {
      setReminderPermissionDenied(true);
      return;
    }
    setReminderPermissionDenied(false);
    const next: CheckInReminderPreference = { ...reminderPreference, enabled: true };
    setCheckInReminderPreference(next);
    setReminderPreference(next);
  }

  function handleChangeReminderHour(hour: number) {
    const next: CheckInReminderPreference = { ...reminderPreference, reminderHour: hour };
    setCheckInReminderPreference(next);
    setReminderPreference(next);
  }

  async function handleFileChosen(file: File | undefined) {
    if (operationInFlight.current || !file) return;
    operationInFlight.current = true;
    setBusy(true);
    setStatus(null);
    try {
      const p = await previewAnyRestore(file);
      setPreview(p);
      setPendingFile(file);
    } catch (e) {
      setStatus(describeError(e, "Could not read file."));
      setPreview(null);
      setPendingFile(null);
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  /**
   * Restore safety (P0): before replacing anything, automatically export
   * the CURRENT data first — a real rollback file, not just a warning —
   * then apply the restore, then force a full page reload rather than
   * re-fetching each screen's own state individually. A replace-only
   * restore touches every table at once; a full reload is the only way
   * to guarantee every screen (not just whichever ones happen to be
   * mounted right now) reflects it, and matches how drastic the action
   * actually is. Errors are now caught and surfaced instead of leaving
   * an unhandled rejection with no feedback.
   */
  async function handleConfirmRestore() {
    if (operationInFlight.current || !pendingFile) return;
    operationInFlight.current = true;
    setBusy(true);
    setStatus("Backing up current data before restoring...");
    try {
      await exportBackup();
      setStatus("Restoring...");
      await applyAnyRestore(pendingFile);
      window.location.reload();
    } catch (e) {
      setStatus(`Restore failed: ${describeError(e, "the backup could not be applied.")}`);
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  function handleCancelRestore() {
    setPreview(null);
    setPendingFile(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleArchive() {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setArchiveStatus(null);
    try {
      const result = await shareBackup();
      setArchiveStatus(
        result.shared
          ? "Sent to your share menu — pick where it goes."
          : "No share menu on this device, so the backup file was downloaded instead.",
      );
    } catch (e) {
      setArchiveStatus(describeError(e, "Could not start archive."));
    } finally {
      setDaysSinceBackup(getDaysSinceLastBackup());
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="screen more-operator">
      {view !== "MENU" && (
        <div className={view === "WEEKLY" ? "more-destination hud-legacy" : "more-destination"}>
          <button ref={backRef} type="button" className="btn-secondary more-return" onClick={() => { setHistoryFocusDayId(null); setView("MENU"); }}>← BACK TO MORE</button>
          {view === "HISTORY" && <HistoryScreen focusDayId={historyFocusDayId} />}
          {view === "WEEKLY" && <WeeklyCheckInScreen />}
          {view === "REVIEW" && <ReviewScreen />}
          {view === "SEARCH" && <SearchScreen onSelectResult={handleSelectSearchResult} />}
          {view === "WORK_SCHEDULE" && <><OperatorHeader destination="more">MORE // WORK SCHEDULE</OperatorHeader><WorkScheduleScreen /></>}
          {view === "INTENT" && <><OperatorHeader destination="more">MORE // MISSIONS & OBLIGATIONS</OperatorHeader><IntentScreen key={intentFocus ? JSON.stringify(intentFocus) : "list"} {...(intentFocus ? { initialFocus: intentFocus } : {})} /></>}
          {view === "JOURNAL" && <><OperatorHeader destination="more">MORE // DECISION JOURNAL</OperatorHeader><JournalScreen /></>}
          {view === "EXERCISE_LIBRARY" && <><OperatorHeader destination="more">MORE // EXERCISE LIBRARY</OperatorHeader><ExerciseLibraryScreen /></>}
          {view === "CUSTOM_TEMPLATES" && <><OperatorHeader destination="more">MORE // CUSTOM PROGRAMS</OperatorHeader><CustomTemplateScreen /></>}
        </div>
      )}
      {/* Keep local settings/disclosures/drafts mounted while inspecting a destination. */}
      <div ref={menuRef} hidden={view !== "MENU"} className="more-control-center">
      {/* FIELD ALPHA Phase 4: identity zone quieted, same principle
          applied to TODAY/TRAIN/BODY — MORE is the SYSTEM surface, not a
          fifth destination competing for its own display title.
          SHELL-001: wrapped in .field-header, matching the identity
          treatment TODAY/TRAIN/BODY already carry — the same locked
          pilot "more" glyph MORE's own nav tab already uses, plus the
          closing structural rule, so all four destinations open the
          same way. No IA change: still the exact same MENU view, same
          heading text/class. */}
      <OperatorHeader destination="more" focusable>MORE // SYSTEM</OperatorHeader>
      <h2 className="more-title">Control center</h2>
      <p className="more-purpose">Your records, plans and system controls.</p>
      <div className="more-context">
        <p>LOCAL FIRST · OFFLINE FIRST</p>
        <a href="#safety-heading" onClick={(event) => {
          event.preventDefault();
          const heading = menuRef.current?.querySelector<HTMLElement>("#safety-heading");
          heading?.focus({ preventScroll: true });
          heading?.scrollIntoView({ block: "start", behavior: "instant" });
        }}>BACKUP & RECOVERY ↓</a>
      </div>

      {/* FIELD ALPHA Phase 4B: reorganized by functional meaning
          (OPERATIONS / RECORDS / SYSTEM) rather than historical screen
          order. OPERATIONS entries the operator navigates into
          (Missions & Obligations, Work Schedule, History) reuse
          CollapsibleRow — already established across TODAY/TRAIN as
          "a whole row is the disclosure control" — its onOpen callback
          doesn't care whether "opening" means an inline expand or a
          view-swap, so this is genuine reuse, not a forced fit. Backup/
          Archive/Restore are immediate actions, not navigation, so they
          use .equipment-row instead. */}
      <section className="operational-index-zone" aria-labelledby="records-heading">
      <h2 id="records-heading" className="section-label">Evidence</h2>
      <p className="more-section-purpose">Search recorded truth, inspect the day trail, or review patterns and decisions.</p>
      {/* Drop 7 (owner approval 2026-10-01): the weekly check-in leads Evidence. */}
      <CollapsibleRow
        name="WEEKLY CHECK-IN"
        icon={<LineIcon icon={CalendarCheck} />}
        onOpen={() => setView("WEEKLY")}
      />
      <CollapsibleRow
        name="HISTORY"
        icon={<Icon name="history" size={20} />}
        onOpen={() => setView("HISTORY")}
      />
      <CollapsibleRow
        name="REVIEW"
        icon={<Icon name="review" size={20} />}
        onOpen={() => setView("REVIEW")}
      />
      <CollapsibleRow
        name="SEARCH"
        icon={<Icon name="search" size={20} />}
        onOpen={() => setView("SEARCH")}
      />
        <CollapsibleRow
          name="DECISION JOURNAL"
          icon={<Icon name="decisionJournal" size={20} />}
          onOpen={() => setView("JOURNAL")}
        />
      </section>
      <section className="operational-index-zone" aria-labelledby="operations-heading">
        <h2 id="operations-heading" className="section-label">Direction</h2>
        <CollapsibleRow
          name="MISSIONS & OBLIGATIONS"
          icon={<Icon name="mission" size={20} />}
          onOpen={() => {
            setIntentFocus(null);
            setView("INTENT");
          }}
        />
        <CollapsibleRow
          name="WORK SCHEDULE"
          icon={<Icon name="schedule" size={20} />}
          onOpen={() => setView("WORK_SCHEDULE")}
        />
      </section>
      <section className="operational-index-zone" aria-labelledby="training-tools-heading">
        <h2 id="training-tools-heading" className="section-label">Training tools</h2>
        <CollapsibleRow
          name="EXERCISE LIBRARY"
          icon={<Icon name="exerciseLibrary" size={20} />}
          onOpen={() => setView("EXERCISE_LIBRARY")}
        />
        <CollapsibleRow
          name="CUSTOM PROGRAMS"
          icon={<Icon name="customPrograms" size={20} />}
          onOpen={() => setView("CUSTOM_TEMPLATES")}
        />
      </section>
      <section className="operational-index-zone" aria-labelledby="safety-heading">
        <h2 id="safety-heading" tabIndex={-1} className="section-label">Data safety</h2>
        <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="backup" size={20} />BACKUP
        </p>
        <p className="card-body" style={{ marginBottom: 8 }}>
          A file with everything on this device. Nothing leaves unless you share it.
        </p>
        {/* CLEANUP-003 (walk-through finding 12): one backup row — download here, or send it
            through the phone's share menu (the old ARCHIVE row's job). */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleExportBackup()}>
            EXPORT BACKUP
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleArchive()}>
            SHARE BACKUP
          </button>
        </div>
        <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>{describeLastBackup(daysSinceBackup)}</p>
        {archiveStatus && <p role="status" className="meta" style={{ marginTop: 8 }}>{archiveStatus}</p>}
        </div>

        <details className="more-inspection">
          <summary>Automatic backups & file check</summary>
          <AutoBackupSettings />
        </details>

      {/* Restore is the one genuinely dangerous, rare action on this
          screen — replaces everything on the device. Kept functionally
          identical (same auto-backup-first, preview-before-write
          contract) but visually flagged so it doesn't read as routine —
          a danger-colored left accent (not .eyebrow, which is reserved
          for screen identity/red-authority) instead of a red-bordered
          card, matching the "danger stays distinct from identity red"
          rule at a lower, less card-stack-like weight. */}
        <details className="equipment-row restore-disclosure">
          <summary className="restore-disclosure__summary">
            <span>
              <span className="tool-label restore-disclosure__label">RESTORE — REPLACES ALL DATA</span>
              <span className="meta restore-disclosure__description">Validate and preview a backup before replacing this device's current data.</span>
            </span>
            <span aria-hidden="true" className="disclosure-chevron">›</span>
          </summary>
          <div className="fade-in restore-disclosure__body">
            <p className="card-body" style={{ marginBottom: 12 }}>
              Replace-only restoration. Your current data is automatically backed up right before anything is
              replaced, so a mistaken restore is recoverable. BEYOND validates the file and shows a preview
              before any data can be replaced. Accepts this app's backup export or a historical BEYOND_BACKUP export.
            </p>
        <input
          ref={fileInputRef}
          type="file"
          className="restore-file-input"
          aria-label="Choose a backup file to restore"
          // Drop 01 acceptance correction (real-device retest, 2026-08-22):
          // no `accept` filter at all, deliberately. A prior attempt
          // listed several MIME variants plus ".json" and still failed on
          // a real Android device — Android's Storage Access Framework
          // filters candidates by whatever MIME type its DocumentsProvider
          // already recorded for that file at download time, which BEYOND
          // cannot reliably control or predict (it can vary by Chrome
          // version/OEM and has been observed not to match ANY specific
          // MIME string, including application/json, for a locally
          // generated blob download) — so no accept list is provably safe
          // against being filtered out on some device. The OS picker's
          // job is only to let the operator choose a candidate file;
          // previewAnyRestore/applyAnyRestore below still fully validate
          // its actual content and reject anything that isn't a
          // recognized BEYOND backup (INVALID_BACKUP_FILE), so accepting
          // every file at the picker level costs nothing in safety.
          disabled={busy}
          onChange={(e) => void handleFileChosen(e.target.files?.[0])}
        />
        {preview && (
            <div className="card card--warning restore-preview">
            <p className="card-title" style={{ fontSize: 16 }}>
              This will permanently replace everything currently on this device.
            </p>
            <p className="meta" style={{ marginTop: 8, marginBottom: 8 }}>
              {preview.format === "LEGACY"
                ? `From a historical backup — app ${preview.appVersion}, data schema ${preview.dataSchemaVersion}, exported ${new Date(preview.exportedAt).toLocaleString()}.`
                : `From this app's own backup — database "${preview.databaseName}" version ${preview.databaseVersion}.`}
            </p>
            <p className="meta" style={{ marginBottom: 4 }}>
              Right now on this device: {days} {days === 1 ? "day" : "days"}, {events} events, {recommendations} recommendations.
            </p>
            <p className="meta" style={{ marginBottom: 8 }}>
              In the backup you're about to restore:
            </p>
            {preview.tables.map((t) => (
              <p key={t.name} className="meta" style={{ paddingLeft: 8 }}>{t.name}: {t.rowCount} rows</p>
            ))}
            <p className="meta" style={{ marginTop: 8, marginBottom: 8 }}>
              A backup of what's currently here will be downloaded automatically before this replaces it.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => void handleConfirmRestore()}>
                CONFIRM REPLACE
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={handleCancelRestore}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        {status && <p role="status" className="meta" style={{ marginTop: 8 }}>{status}</p>}
          </div>
        </details>
      </section>

      {/* FIELD ALPHA Phase 4B/4H: RECORDS — historical/review-oriented,
          distinct from OPERATIONS above. History stays a clean single
          entry point per Phase 4H — no charts/trends/summaries added,
          none existed to preserve. */}


      {/* FIELD ALPHA Phase 4C: SYSTEM — BEYOND's own state, the first
          real proof of the SYSTEM STATE grammar outside TODAY/TRAIN's
          .status-strip. Reuses BODY's .instrument-cluster verbatim (a
          grid of independent glance-depth readings is exactly what this
          is) for the NORMAL-tier facts an operator would want at a
          glance; the raw counts and exact build timestamp are TECHNICAL
          DETAIL, not GLANCE content, so they move behind a <details> the
          same way TODAY's WHY panel already tucks away its own machinery
          — one tap from "what's the current state" to "what's actually
          in the database/build," never dumped as a permanent wall of
          numbers. No AVAILABLE ACTION or DEGRADED state is rendered here
          because none currently exists in the app (no update-check
          mechanism, no schema-incompatibility detector) — inventing one
          would be fabricated telemetry, which this checkpoint is
          explicitly forbidden from doing. The former "Data schema"/
          "Dexie" rows both showed the identical db.verno value on the
          same screen; collapsed into one SCHEMA reading.

          Factory Drop 02: APP/BUILD now come from src/app/buildInfo.ts,
          itself derived at build time from package.json's version and
          the actual git commit/timestamp (vite.config.ts's `define`) —
          not a second hand-typed literal. APP stays the deliberate,
          human-bumped release identity (see README's "Versions &
          lineage" for why its value is what it is); BUILD is the thing
          that actually answers "is this the current deployment," since a
          release number nobody remembers to bump can't. ENGINE is
          untouched — Engine architecture, out of scope this Drop, and
          already single-sourced from evaluate.ts's own exported
          constant. */}
      {/* DECLUTTER Drop 3 (owner ruling 2026-09-30): a Settings group.
          Nutrition Targets moved here from BODY; the SYSTEM readings moved
          inside Diagnostic detail so the main list stays short. */}
      <section className="operational-index-zone" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="section-label">Settings</h2>
      <NutritionTargetsSettings />
      <QuitHabitSettings />
      <details className="more-inspection"><summary>Time capsule</summary><TimeCapsuleSettings /></details>
      {/* REMIND-001: on-device only — no account, no push service. Fires
          from a live check the next time you open BEYOND after your
          chosen hour, if you haven't checked in yet that day; it cannot
          wake the app in the background, and says so plainly rather than
          implying always-on delivery. */}
      <section className="operational-index-zone" aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="section-label">Reminders</h2>
        <div className="equipment-row">
          <p className="tool-label" style={{ marginBottom: 4 }}>DAILY CHECK-IN REMINDER</p>
          <p className="card-body" style={{ marginBottom: 8 }}>
            {reminderPreference.enabled ? `On, after ${formatReminderHour(reminderPreference.reminderHour)}.` : "Off."}
          </p>
          {/* DECLUTTER Drop 2: replaces the cut section intro's key fact. */}
          <p className="meta" style={{ marginBottom: 8 }}>Checked when you open BEYOND, not a push notification.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* LAUNCH POLISH (owner approval 2026-10-01): MORE has no single
                primary action, so routine settings don't wear red. */}
            <button
              className="btn-secondary"
              onClick={() => void handleToggleReminder()}
            >
              {reminderPreference.enabled ? "TURN OFF" : "TURN ON"}
            </button>
            {reminderPreference.enabled && (
              <select
                aria-label="Reminder hour"
                value={reminderPreference.reminderHour}
                onChange={(e) => handleChangeReminderHour(Number(e.target.value))}
              >
                {REMINDER_HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {formatReminderHour(h)}
                  </option>
                ))}
              </select>
            )}
          </div>
          {reminderPermissionDenied && (
            <p className="meta" style={{ marginTop: 8 }}>
              Notification permission was denied. Enable notifications for BEYOND in your browser/device settings to
              use this.
            </p>
          )}
        </div>
      </section>


      {/* No machinery reveal here (2026-09-30, direct owner ruling): SYSTEM's
          diagnostics are plain technical readouts, so they expand inline
          only. TODAY/TRAIN's WHY disclosures keep the DEPTH-001 reveal. */}
      <WhyDisclosure summary="Diagnostic detail" reveal={false}>
        <div style={{ marginTop: 8 }}>
          <div className="instrument-cluster">
            <div>
              <p className="meta" style={{ margin: 0 }}>APP</p>
              <p className="status-value">{APP_RELEASE}</p>
            </div>
            <div>
              <p className="meta" style={{ margin: 0 }}>BUILD</p>
              <p className="status-value">{BUILD_COMMIT}</p>
            </div>
            <div>
              <p className="meta" style={{ margin: 0 }}>ENGINE</p>
              <p className="status-value">{ENGINE_VERSION}</p>
            </div>
            <div>
              <p className="meta" style={{ margin: 0 }}>SCHEMA</p>
              <p className="status-value">{String(DATA_SCHEMA)}</p>
            </div>
            <div>
              <p className="meta" style={{ margin: 0 }}>ACTIVE DAY</p>
              <p className="status-value">{readState === "ready" ? (activeDayYes ? "YES" : "NO") : "UNKNOWN"}</p>
            </div>
          </div>
          <DiagRow label="Built" value={BUILD_TIME} />
          {readState === "loading" && <p role="status">Reading diagnostic information…</p>}
          {readState === "error" && <div><p role="alert">{readError} These readings are unavailable.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY READINGS</button></div>}
          {readState === "ready" && <>
          <DiagRow label="Days" value={String(days)} />
          <DiagRow label="Events" value={String(events)} />
          <DiagRow label="Recommendations" value={String(recommendations)} />
          {/* Intelligence Spine — I2 (controlled consumption proof,
              approved 2026-08-22): same TECHNICAL DETAIL tier as the raw
              counts above — a real, already-computed derived count, never
              fabricated telemetry (see this section's own doc comment
              above on that doctrine). Purely informational: no button, no
              accept/decline, nothing resembling a Recommendation. Safe
              when zero — indistinguishable in weight from every other
              reading here. */}
          <DiagRow label="Advisory notes" value={String(advisoryNotes.length)} />
          {advisoryNotes.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {advisoryNotes.map((note) => (
                <p key={note.id} className="meta" style={{ margin: "2px 0" }}>{note.message}</p>
              ))}
            </div>
          )}
          </>}
        </div>
      </WhyDisclosure>
      </section>
      </div>
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span className="card-body" style={{ margin: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function describeLastBackup(days: number | null): string {
  if (days === null) return "No backup on record yet.";
  if (days === 0) return "Last backup: today.";
  if (days === 1) return "Last backup: yesterday.";
  return `Last backup: ${days} days ago.`;
}

function isDatabaseClosedError(error: unknown): error is Error {
  return error instanceof Error && error.name === "DatabaseClosedError";
}
