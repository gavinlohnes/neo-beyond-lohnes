import { RecordSheets } from "../ui/components/RecordSheets";
import type { RecordCorrectionRequest, RecordSheetTarget } from "../ui/recordSheets";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { HealthEvidenceRequest, HealthHistoryDestination } from "../application/healthRecordQueries";
import type { InsightMetric } from "../application/bodyInsightsQueries";
import { readBootPhase } from "../ui/screens/today/bootMode";
import { TodayScreen } from "../ui/screens/today/TodayScreen";
import { TrainScreen, type TrainDestination } from "../ui/screens/train/TrainScreen";
import { BodyScreen } from "../ui/screens/body/BodyScreen";
import { MoreScreen, type MoreView } from "../ui/screens/more/MoreScreen";
import type { WholePictureDestination } from "../ui/screens/review/WholePicture";
import { Icon, type IconName } from "../ui/icons/Icon";
import { RootErrorBoundary } from "../ui/components/RootErrorBoundary";
import { CcIcon } from "../ui/cc/ccIcons";
import { HeaderSearchContext, EmblemContext, StealthToggleContext } from "../ui/components/OperatorHeader";
import { StealthOverlay } from "../ui/components/StealthOverlay";
import { getStealth, setStealth } from "../application/stealthQueries";
import { BackupDueLine } from "../ui/components/BackupDueLine";
import { NotesSweep } from "../ui/components/NotesSweep";
import { TimeCapsuleOpened } from "../ui/components/TimeCapsuleOpened";
import { ReportReadyLine } from "../ui/components/ReportReadyLine";
import { getActiveWorkoutSession, getPerformedSets } from "../application/trainQueries";
import { maybeSendCheckInReminder } from "../application/checkInReminderQueries";
import { performDueDayRollover, subscribeToDayRollover } from "../application/commands";
import { nextRolloverBoundaryAfter, workoutHoldsRollover } from "../engine/dayRollover";
import { getNextDayRolloverCheckAt } from "../application/dayRolloverQueries";
import { parseShortcut, type BodyFocus } from "../ui/shortcuts";
import { positionPrimaryDestination, positionRevealedSurface } from "../ui/navigationPosition";
import { VisionMode } from "../ui/vision/VisionMode";
import type { CaveRequest, CaveTab } from "../ui/screens/systems/CaveVitals";
import type { CaveVitalId } from "../application/caveVitals";
import { SessionDraftProvider, useHasSessionDrafts } from "../ui/sessionDrafts";
import type { IntentFocus } from "../ui/screens/more/IntentScreen";
import type { SystemDestination } from "../ui/systemCatalog";

/**
 * Product Experience Sprint, P1 (navigation authority reconciliation):
 * the Decision Register locks primary navigation to these four
 * destinations. HISTORY is not deleted — its screen, queries, copy
 * helpers, and tests are all untouched — it's reachable from MORE
 * instead of competing for a fifth primary tab slot.
 */
type Tab = "TODAY" | "TRAIN" | "BODY" | "COMMAND";

// Overdrive Phase 14: MORE now has its own icon ("more" — three small
// diamonds, additive to the six locked pilot icons, not a redesign of
// any of them) — see Icon.tsx. All four primary destinations have a
// real glyph now, so this is a complete Record, not Partial.
// POLISH-002: the prototype's tab glyphs.
// NAV-001 slice 2: presentation labels only; retained keys preserve history/shortcut compatibility.
const TAB_LABEL: Record<Tab, string> = { TODAY: "TODAY", TRAIN: "TRAIN", BODY: "DATA", COMMAND: "MORE" };

const CC_TAB_ICON: Record<Tab, () => React.ReactNode> = {
  TODAY: CcIcon.today,
  TRAIN: CcIcon.train,
  BODY: CcIcon.body,
  COMMAND: CcIcon.command,
};

/**
 * Harvest Checkpoint 0 (PWA update safety): registerType is "prompt" and
 * injectRegister is null (vite.config.ts) — nothing auto-reloads an open
 * tab. This hook is the ONLY thing that registers the service worker now,
 * and needRefresh only flips true once a new version has finished
 * installing in the background; the user decides when (if ever) to apply
 * it. Deliberately no UI for offlineReady — that's not an interruption
 * risk and the checkpoint doesn't ask for that toast.
 */
function AppUpdateBanner() {
  const hasDrafts = useHasSessionDrafts();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({});

  if (!needRefresh) return null;

  return (
    <div
      className="card card--action fade-in"
      style={{
        position: "fixed",
        left: "var(--gutter)",
        right: "var(--gutter)",
        // Harvest Checkpoint 7 (phone hardening): index.html sets
        // viewport-fit=cover for edge-to-edge display, which requires
        // respecting env(safe-area-inset-*) wherever content sits near a
        // screen edge — otherwise a device with a home-indicator/gesture
        // inset (bottom) renders this UNDER it. calc() with an env()
        // fallback is a no-op (adds 0px) on any device without one.
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        zIndex: 50,
        marginBottom: 0,
        maxWidth: 480 - 24,
        marginInline: "auto",
      }}
    >
      {/* SHELL-001: .eyebrow is reserved for a screen's own IDENTITY
          (locked, Suit Layer 01) — this is a system notification, not an
          identity label, so it uses the same neutral .tool-label every
          other utility surface's own header does. */}
      <p className="tool-label" style={{ marginBottom: 4 }}>SYSTEM UPDATE READY</p>
      <p className="card-body" style={{ marginBottom: 12 }}>
        A newer version of BEYOND is available. Saved records are kept. Updating reloads the app; finish any unsaved input first.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => { if (!hasDrafts || window.confirm("Updating reloads BEYOND and clears unfinished input. Update now?")) void updateServiceWorker(true); }}>
          UPDATE NOW
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setNeedRefresh(false)}>
          LATER
        </button>
      </div>
    </div>
  );
}

/** Fire just after the boundary, so the rollover check sees it as elapsed. */
const ROLLOVER_TIMER_MARGIN_MS = 1000;

/** CAVE-DATA D1: counts cave requests across App mounts, so DATA opens each one once. */
let caveRequests = 0;

export function App() {
  return <SessionDraftProvider><VisionMode /><AppWorkspaces /></SessionDraftProvider>;
}

function AppWorkspaces() {
  // Drop 7: a home-screen shortcut (?go=…) opens BODY at the right control.
  // Read once, then dropped from the URL so a reload doesn't repeat it.
  const [shortcut] = useState(() => parseShortcut(window.location.search));
  // GARMIN-002 SEND TO BEYOND: the service worker parks shared Health Bridge files and opens ?share=health.
  const [sharedHealth] = useState(() => new URLSearchParams(window.location.search).get("share") === "health");
  // SHORTCUTS-001: START WORKOUT opens TRAIN; the others open BODY.
  const [tab, setTab] = useState<Tab>(() => (sharedHealth ? "COMMAND" : shortcut === "workout" ? "TRAIN" : "TODAY"));
  const tabRef = useRef(tab);
  tabRef.current = tab;
  // Screen instances are session-local. Hiding a destination never discards its forms.
  const [visited, setVisited] = useState(() => new Set<Tab>([tab]));
  // A direct TRAIN/BODY launch has no TODAY yet to publish the effective suit.
  // Read the same phase/pin without writing any domain state. Once TODAY mounts,
  // its live state owns the tokens; an obsolete startup read cannot overwrite it.
  const todayVisited = visited.has("TODAY");
  useEffect(() => {
    if (todayVisited) return;
    let current = true;
    let generation = 0;
    async function refreshSuit() {
      const request = ++generation;
      try {
        const phase = await readBootPhase();
        if (current && request === generation) document.documentElement.dataset.suitMode = phase ?? "UNSET";
      } catch { /* Keep operation available if the optional presentation read fails. */ }
    }
    const firstBoundary = nextRolloverBoundaryAfter(new Date());
    void refreshSuit();
    const timer = window.setInterval(() => void refreshSuit(), 60_000);
    // A direct shortcut can keep TODAY unmounted while a workout defers rollover.
    let boundaryTimer: ReturnType<typeof setTimeout>;
    function armBoundary(boundary = nextRolloverBoundaryAfter(new Date())) {
      boundaryTimer = setTimeout(() => {
        // An early callback must keep the same deadline, not skip to tomorrow.
        if (Date.now() < boundary.getTime()) { armBoundary(boundary); return; }
        void refreshSuit(); armBoundary();
      }, Math.max(1, boundary.getTime() - Date.now()));
    }
    armBoundary(firstBoundary);
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      void refreshSuit();
      clearTimeout(boundaryTimer); armBoundary();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    const unsubscribe = subscribeToDayRollover(() => void refreshSuit());
    return () => { current = false; window.clearInterval(timer); clearTimeout(boundaryTimer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("pageshow", resume); unsubscribe(); };
  }, [todayVisited]);
  useEffect(() => () => { delete document.documentElement.dataset.suitMode; }, []);
  const [todayRefreshKey, setTodayRefreshKey] = useState(0);
  // SUIT-001: stealth writes while BODY or SYSTEMS stays shown behind it; they re-read on this.
  const [stealthWrites, setStealthWrites] = useState(0);
  // SUIT-001: stealth hides the screen, not the data. It stays on across reloads until exited.
  const [stealthOn, setStealthOn] = useState(() => getStealth());
  const stealthOnRef = useRef(stealthOn);
  const restoreStealthFocus = useRef(false);
  function changeStealth(on: boolean) {
    if (on === stealthOnRef.current) return;
    stealthOnRef.current = on;
    restoreStealthFocus.current = !on;
    setStealth(on);
    setStealthOn(on);
    // Close any open sheet behind it; the screens and their drafts stay as they were.
    if (on) for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog[open]")) dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  }
  useEffect(() => {
    if (stealthOn || !restoreStealthFocus.current) return;
    restoreStealthFocus.current = false;
    // React has removed inert before we return focus to the retained workspace.
    const frame = requestAnimationFrame(() => {
      const emblem = [...document.querySelectorAll<HTMLElement>(`#workspace-${tabRef.current} .operator-emblem`)].find((element) => element.getClientRects().length);
      emblem?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [stealthOn]);
  const [workEndedKey, setWorkEndedKey] = useState(0);
  const [bodyFocus, setBodyFocus] = useState<BodyFocus | null>(null);
  const closingRecordSheet = useRef(false);
  const recordOrigin = useRef<HTMLElement | null>(null);
  const correctionKey = useRef(0);
  const [recordMealRequest, setRecordMealRequest] = useState<{ id: string; key: number } | null>(null);
  const [recordCorrection, setRecordCorrection] = useState<RecordCorrectionRequest | null>(null);
  const [recordSheet, setRecordSheet] = useState<RecordSheetTarget | null>(shortcut === "workout" ? null : shortcut);
  const [bodyRequest, setBodyRequest] = useState(0);
  const [healthEvidence, setHealthEvidence] = useState<HealthEvidenceRequest | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthHistoryDestination | null>(null);
  const [healthHistoryOrigin, setHealthHistoryOrigin] = useState(false);
  // Primary navigation to BODY ends a shortcut's focused view; a BODY re-tap also returns to the Daily Record.
  const [bodyOverviewRequest, setBodyOverviewRequest] = useState<{ key: number; retap: boolean }>({ key: 0, retap: false });
  const [mealOrigin, setMealOrigin] = useState<{ tab: Tab; scrollY: number; trigger: HTMLElement | null } | null>(null);

  const mealInFlight = useRef(false);
  const updateMealInFlight = useCallback((busy: boolean) => { mealInFlight.current = busy; }, []);

  const positions = useRef<Partial<Record<Tab, { scrollY: number; trigger: HTMLElement | null }>>>({});
  const navigation = useRef(0);
  const taskFocus = useRef<Partial<Record<Tab, HTMLElement>>>({});
  useEffect(() => {
    function rememberFocus(event: FocusEvent) {
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      const pane = element.closest<HTMLElement>('[id^="workspace-"]');
      if (pane) taskFocus.current[pane.id.slice("workspace-".length) as Tab] = element;
    }
    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, []);
  useEffect(() => {
    let frame = 0;
    function revealWriting() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = document.activeElement;
        if (element instanceof HTMLElement && element.matches("input, textarea, select") && element.getClientRects().length) positionRevealedSurface(element);
      });
    }
    window.addEventListener("resize", revealWriting);
    window.visualViewport?.addEventListener("resize", revealWriting);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", revealWriting);
      window.visualViewport?.removeEventListener("resize", revealWriting);
    };
  }, []);
  const [todayToolsOpen, setTodayToolsOpen] = useState(false);
  const [captureRequest, setCaptureRequest] = useState(0);
  const [toolsRequest, setToolsRequest] = useState(0);
  const [captureOrigin, setCaptureOrigin] = useState<Tab | null>(null);
  const [moreRequest, setMoreRequest] = useState(0);
  /** CAVE-DATA D1: TODAY's bands and SYSTEMS rows open DATA's cave on a view; each request counts up across mounts. */
  const [caveRequest, setCaveRequest] = useState<CaveRequest | undefined>(undefined);
  const [intentFocus, setIntentFocus] = useState<IntentFocus | null>(null);
  useEffect(() => {
    if (!shortcut) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("go");
    window.history.replaceState(null, "", url.toString());
  }, [shortcut]);
  const [trainDestination, setTrainDestination] = useState<TrainDestination | null>(shortcut === "workout" ? "WORKOUT" : null);
  // FIND-001: a LIFT/PR search result opens TRAIN → RECORDS at that lift; the top-bar icon opens SEARCH.
  const [trainRecordsFocus, setTrainRecordsFocus] = useState<string | null>(null);
  const [moreView, setMoreView] = useState<MoreView>(sharedHealth ? "HEALTH_IMPORT" : "MENU");
  const [reviewDestination, setReviewDestination] = useState<{ key: number; view: WholePictureDestination } | null>(null);
  useEffect(() => {
    if (!sharedHealth) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState(null, "", url.toString());
  }, [sharedHealth]);
  // SUIT-001: the readout was opened from TODAY's SYSTEMS line, so it offers the way back.
  const [commandTodayOrigin, setCommandTodayOrigin] = useState(false);
  const [continuityResolved, setContinuityResolved] = useState(false);

  useEffect(() => {
    let current = true;
    // DAY-ROLLOVER-001: runs before the workout-continuity read below, so
    // any screen's own first-mount getActiveDay() call already sees a
    // rolled-over day rather than a stale, already-closed one — same
    // "resolve real state before first render" shape this gate already
    // existed for. Best-effort, matching maybeSendCheckInReminder's own
    // posture just below: a failed rollover check must never trap the
    // operator on the loading surface, and simply leaves the day as it
    // was until the next opportunity (next app open, or after an
    // in-progress workout ends — see TrainScreen.tsx's own post-
    // completion call for that case, since this mount-time check alone
    // can't catch a boundary crossed while a workout is still running).
    void performDueDayRollover()
      .catch(() => {})
      .then(() =>
        getActiveWorkoutSession()
          .then(async (activeWorkout) => {
            // An explicit shortcut wins over workout continuity; the workout
            // stays active and TRAIN still resumes it when opened.
            if (!current || !activeWorkout || shortcut) return;
            // REAL-DATA-001: only a workout in use takes the launch (the same 2-hour idle rule as the
            // 16:30 roll). An older one stays resumable from TRAIN and shows on TODAY as WORKOUT
            // STILL OPEN; it no longer opens BEYOND on TRAIN two days later.
            const sets = await getPerformedSets(activeWorkout.id);
            const lastActivityAt = sets.reduce((latest, set) => (set.recordedAt > latest ? set.recordedAt : latest), activeWorkout.startedAt);
            if (!current || !workoutHoldsRollover(new Date(lastActivityAt), new Date())) return;
            setTrainDestination("WORKOUT");
            setVisited((current) => new Set([...current, "TRAIN"]));
            setTab("TRAIN");
          })
          .catch(() => {
            // Continuity restoration is defensive. A failed local read must
            // not trap the operator on the loading surface; the existing root
            // error/recovery paths remain available from the normal app shell.
          }),
      )
      .finally(() => {
        if (current) setContinuityResolved(true);
      });
    return () => {
      current = false;
    };
  }, []);

  // REMIND-001: a best-effort, fire-and-forget check on every app mount —
  // idempotent per calendar day (maybeSendCheckInReminder's own
  // last-sent bookkeeping) and a no-op whenever the reminder preference
  // is disabled (the default), so this never surprises an operator who
  // hasn't opted in. Deliberately not re-checked on an interval while
  // the app stays open — this only ever fires on open/reload, a known,
  // honest limitation (see persistence/checkInReminder.ts's own doc
  // comment), not an attempt at true background delivery.
  useEffect(() => {
    void maybeSendCheckInReminder().catch(() => {
      // Never let a reminder-check failure affect the rest of the app.
    });
  }, []);

  /**
   * ROLLOVER-ON-RESUME (direct owner mission, 2026-09-21): the mount-time
   * gate above only ever runs once, on cold load — a PWA/tab that stays
   * backgrounded across 16:30 and is then simply brought back to the
   * foreground (no reload) would otherwise not see the boundary until
   * some other action happened to trigger a fresh getActiveDay() read.
   * Both `visibilitychange` and `pageshow` are listened for since a real
   * browser doesn't reliably fire only one of them for every resume path
   * (iOS/Safari's bfcache restores in particular lean on `pageshow`);
   * either firing while the page is actually visible re-checks. No UI
   * effect of its own — same fire-and-forget, best-effort posture as
   * every other call site — and performDueDayRollover's own in-flight
   * memoization (see its doc comment in application/commands.ts) makes
   * two overlapping resume events collapse into at most one real
   * rollover, never two.
   */
  useEffect(() => {
    function handleResume() {
      if (document.visibilityState !== "visible") return;
      void performDueDayRollover().catch(() => {
        // Best-effort, matching every other performDueDayRollover call
        // site — a failed check here has no visible effect either way.
      });
    }
    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("pageshow", handleResume);
    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("pageshow", handleResume);
    };
  }, []);

  /**
   * DROP 0 (stale numbers after the 16:30 roll): the resume listener above
   * only helps when the app was hidden. An app left open on screen across
   * 16:30 never fires it, so this also arms a timer for the next boundary
   * and re-checks when it fires, then re-arms. Re-armed on every return to
   * the foreground too, since a phone can suspend timers while the screen is
   * off. Screens re-read through useDayRolloverRefresh when a rollover
   * actually happens.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = true;
    let generation = 0;
    async function arm() {
      const request = ++generation;
      clearTimeout(timer);
      const now = new Date();
      // Once 16:30 is held, wake at the workout's idle deadline instead of
      // tomorrow. New sets are rechecked atomically by the command, and a
      // held check then schedules the new deadline.
      const checkAt = await getNextDayRolloverCheckAt(now)
        .catch(() => new Date(now.getTime() + 30_000));
      if (!current || request !== generation) return;
      const delay = Math.max(1, checkAt.getTime() - Date.now() + ROLLOVER_TIMER_MARGIN_MS);
      timer = setTimeout(() => {
        void performDueDayRollover()
          .catch(() => {})
          .finally(() => { if (current && request === generation) void arm(); });
      }, delay);
    }
    function handleVisible() {
      if (document.visibilityState === "visible") void arm();
    }
    void arm();
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      current = false;
      generation += 1;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  function rememberPosition() {
    const element = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const pane = document.getElementById(`workspace-${tab}`);
    positions.current[tab] = { scrollY: window.scrollY, trigger: element && pane?.contains(element) ? element : taskFocus.current[tab] ?? null };
  }

  function showTab(destination: Tab, restore = true) {
    rememberPosition();
    setVisited((current) => new Set([...current, destination]));
    setTab(destination);
    const request = ++navigation.current;
    const position = restore ? positions.current[destination] : undefined;
    // Wait for the retained pane to become visible. A newer navigation owns position/focus.
    requestAnimationFrame(() => {
      if (request !== navigation.current) return;
      const pane = document.getElementById(`workspace-${destination}`);
      const target = position?.trigger;
      if (target?.isConnected && pane?.contains(target) && target.getClientRects().length) target.focus({ preventScroll: true });
      else (() => { const heading = [...(pane?.querySelectorAll<HTMLElement>("h1") ?? [])].find((element) => element.getClientRects().length); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } })();
      if (position) window.scrollTo({ top: position.scrollY, behavior: "instant" });
      else positionPrimaryDestination();
    });
  }

  // Session navigation only: retained panes keep their own drafts and query.
  // Browser Back/Forward restores the same destination without remounting it.
  const historyReady = useRef(false);
  const restoringHistory = useRef(false);
  useEffect(() => {
    const state = { beyondNavigation: true, tab, moreView, commandTodayOrigin };
    if (!historyReady.current) {
      window.history.replaceState(state, "");
      historyReady.current = true;
    } else if (restoringHistory.current) restoringHistory.current = false;
    else if (window.history.state?.tab !== tab || window.history.state?.moreView !== moreView) window.history.pushState(state, "");
  }, [tab, moreView, commandTodayOrigin]);
  useEffect(() => {
    function restore(event: PopStateEvent) {
      const state = event.state;
      if (closingRecordSheet.current) { closingRecordSheet.current = false; return; }
      if (recordSheet || state?.recordSheet) {
        if (mealInFlight.current) { window.history.forward(); return; }
        setRecordSheet(state?.recordSheet ?? null);
        return;
      }
      // Retained panes must not leave a native modal in the top layer on Back.
      for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog[open]")) dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      if (!state?.beyondNavigation || !["TODAY", "TRAIN", "BODY", "COMMAND"].includes(state.tab)) return;
      if (mealInFlight.current) { window.history.forward(); return; }
      restoringHistory.current = state.tab !== tab || state.moreView !== moreView;
      setCommandTodayOrigin(state.commandTodayOrigin === true);
      setMoreView(state.moreView);
      setMoreRequest((key) => key + 1);
      showTab(state.tab);
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [tab, moreView, recordSheet]);

  function canNavigate() { return !mealInFlight.current; }

  function openMore(view: MoreView, focus: IntentFocus | null = null, focusHeading = true) {
    if (!canNavigate()) return false;
    setCommandTodayOrigin(tab === "TODAY" && view !== "MENU");
    setHealthHistoryOrigin(false); setHealthHistory(null);
    setIntentFocus(focus);
    setMoreView(view);
    setMoreRequest((key) => key + 1);
    showTab("COMMAND", false);
    const request = navigation.current;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (request !== navigation.current || !focusHeading) return;
      const heading = [...document.querySelectorAll<HTMLElement>("#workspace-COMMAND h1")].find((element) => element.getClientRects().length);
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }));
    return true;
  }

  function openDataReview(view: WholePictureDestination) {
    if (!canNavigate()) return false;
    setReviewDestination((current) => ({ key: (current?.key ?? 0) + 1, view }));
    return openMore("REVIEW", null, false);
  }

  function openTrain(destination: TrainDestination) {
    if (!canNavigate()) return false;
    setTrainRecordsFocus(null);
    setTrainDestination(destination);
    showTab("TRAIN", false);
    return true;
  }

  function openPrimaryTab(destination: Tab) {
    if (!canNavigate()) return false;
    setHealthHistoryOrigin(false); setHealthEvidence(null);
    if (destination === "COMMAND" && tab === "COMMAND") return openMore("MENU");
    // PR #228 review R2: a Capture return belongs to that Capture visit only.
    setCaptureOrigin(null);
    if (destination === "BODY") {
      // A shortcut's focused view and its return belong to that shortcut visit only.
      // BODY keeps every unsaved input; only the presentation goes back to the Daily Record.
      setMealOrigin(null);
      setBodyFocus(null);
      setBodyOverviewRequest(({ key }) => ({ key: key + 1, retap: tab === "BODY" }));
    }
    showTab(destination, destination !== tab);
    return true;
  }

  function openRecordSheet(target: RecordSheetTarget) {
    if (!canNavigate()) return;
    if (!recordSheet) recordOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (target !== "record") setRecordCorrection(null);
    const next = { ...window.history.state, recordSheet: target };
    if (recordSheet) window.history.replaceState(next, "");
    else window.history.pushState(next, "");
    setRecordSheet(target);
  }
  function closeRecordSheet() {
    if (!canNavigate()) return;
    setRecordSheet(null);
    if (window.history.state?.recordSheet) { closingRecordSheet.current = true; window.history.back(); }
  }
  function leaveRecordSheet(action: () => void) {
    if (!canNavigate()) return;
    setRecordSheet(null);
    window.history.replaceState({ ...window.history.state, recordSheet: null }, "");
    action();
  }

  function openBody(target?: BodyFocus) {
    if (!canNavigate()) return false;
    if (target) { openRecordSheet(target); return true; }
    setHealthEvidence(null); setHealthHistoryOrigin(false);
    if (tab !== "BODY") setMealOrigin({ tab, scrollY: window.scrollY, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    setBodyFocus(target ?? null);
    setBodyRequest((key) => key + 1);
    showTab("BODY", false);
    return true;
  }

  function openBodyEvidence(metric: InsightMetric) {
    if (!canNavigate()) return;
    setMealOrigin({ tab, scrollY: window.scrollY, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    setBodyFocus(null); setHealthEvidence((request) => ({ key: (request?.key ?? 0) + 1, metric }));
    setHealthHistoryOrigin(false); showTab("BODY", false);
  }

  function openHealthHistory(destination: HealthHistoryDestination) {
    if (!canNavigate()) return;
    if (!openMore("HISTORY", null, false)) return;
    setHealthHistory(destination); setHealthHistoryOrigin(true);
  }

  function returnFromBody() {
    if (!canNavigate()) return;
    // The origin is used once; a later shortcut records a new one. No inputs are discarded.
    const destination = mealOrigin?.tab ?? "TODAY";
    if (mealOrigin) positions.current[destination] = { ...mealOrigin, trigger: mealOrigin.trigger?.isConnected
      ? mealOrigin.trigger : destination === "TODAY" ? document.querySelector<HTMLElement>(bodyFocus === "water" ? '[aria-label="Log water in DATA"]' : '[aria-label="Log a meal in DATA"]') : taskFocus.current[destination] ?? null };
    showTab(destination);
    setMealOrigin(null);
    setTodayRefreshKey((key) => key + 1);
  }

  // COMMAND-CENTER-001: COMMAND's search reaches every catalog destination (TODAY's SYSTEM dialog is retired).
  function openSystemDestination(destination: SystemDestination | { kind: "tools" }): boolean {
    if (destination.kind === "record") {
      setRecordMealRequest(destination.mealId ? { id: destination.mealId, key: ++correctionKey.current } : null);
      openRecordSheet(destination.target); return true;
    }
    if (destination.kind === "exercise") { if (!openTrain("RECORDS")) return false; setTrainRecordsFocus(destination.exerciseId); return true; }
    if (destination.kind === "body") return openBody(destination.focus);
    if (destination.kind === "workout") return openTrain("WORKOUT");
    if (destination.kind === "workspace") return openPrimaryTab(destination.tab);
    if (destination.kind === "capture") { openCapture(); return true; }
    if (destination.kind === "stealth") { changeStealth(true); return true; }
    if (destination.kind === "tools") return openMore("DAILY_CONTROLS");
    if (destination.kind === "more") return openMore(destination.view);
    return false;
  }

  /** CAVE-DATA D1 (Gavin, 2026-10-28, option A): the cave lives in DATA; open it there on a view. */
  function openCave(view: CaveTab, vital?: CaveVitalId) {
    if (!canNavigate()) return false;
    setHealthHistoryOrigin(false); setHealthEvidence(null); setMealOrigin(null); setBodyFocus(null);
    setCaveRequest({ key: ++caveRequests, tab: view, vital });
    showTab("BODY", false);
    const request = navigation.current;
    // After showTab's own heading focus: focus lands on the view that was asked for.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (request !== navigation.current) return;
      document.querySelector<HTMLElement>(`#workspace-BODY [data-cave-tab="${view}"]`)?.focus({ preventScroll: true });
    }));
    return true;
  }

  /** COMMAND-CENTER-001: the header emblem goes to TODAY's root, from anywhere. */
  function goTodayRoot() {
    if (!canNavigate()) return;
    setCaptureOrigin(null);
    setHealthHistoryOrigin(false);
    setHealthEvidence(null);
    showTab("TODAY", false);
  }

  function openCapture() { openRecordSheet("note"); }

  if (!continuityResolved) {
    return (
      <main className="screen" aria-busy="true">
        <p className="meta" role="status">Restoring active operation…</p>
      </main>
    );
  }

  return (
    <EmblemContext.Provider value={goTodayRoot}>
    <HeaderSearchContext.Provider value={() => { openMore("SEARCH"); }}>
    <StealthToggleContext.Provider value={() => changeStealth(!stealthOnRef.current)}>
    {/* Everything behind stealth is inert: not focusable, not read, not tappable. */}
    <div inert={stealthOn} style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <main id="main-content" tabIndex={-1}>
        {visited.has("TODAY") && <div id="workspace-TODAY" className={tab === "TODAY" ? "tab-enter" : undefined} hidden={tab !== "TODAY"}>
          <RootErrorBoundary active={tab === "TODAY"}>
            <TodayScreen
              active={tab === "TODAY"}
              onOpenRecordSheet={openRecordSheet}
              mealRefreshKey={todayRefreshKey}
              onReturnFromCapture={captureOrigin ? () => { showTab(captureOrigin); setCaptureOrigin(null); } : undefined}
              onWorkEnded={() => setWorkEndedKey((k) => k + 1)}
              onWorkContextChanged={() => setWorkEndedKey((k) => k + 1)}
              shiftHandoffRefreshKey={workEndedKey}
              onViewCommitments={(id) => openMore("INTENT", id ? { kind: "OBLIGATION", obligationId: id } : null)}
              onOpenPlan={() => openMore("PLAN")}
              onOpenTrain={openTrain}
              openToolsOnMount={todayToolsOpen}
              onOpenBody={openBody}
              onOpenHealthEvidence={openBodyEvidence}
              onOpenWeeklyReview={() => openMore("REVIEW")}
              onOpenSystems={() => { openMore("SYSTEMS"); }}
              onOpenCave={(tab) => { openCave(tab); }}
              toolsRequest={toolsRequest}
            />
          </RootErrorBoundary>
        </div>}
        {visited.has("TRAIN") && <div id="workspace-TRAIN" className={tab === "TRAIN" ? "tab-enter" : undefined} hidden={tab !== "TRAIN"}>
          <RootErrorBoundary active={tab === "TRAIN"}><TrainScreen active={tab === "TRAIN"} destination={trainDestination} recordsFocus={trainRecordsFocus}
            onDestinationConsumed={() => setTrainDestination(null)} /></RootErrorBoundary>
        </div>}
        {visited.has("BODY") && <div id="workspace-BODY" className={tab === "BODY" ? "tab-enter" : undefined} hidden={tab !== "BODY"}>
          <RootErrorBoundary active={tab === "BODY"}><BodyScreen overviewOnly onOpenTrainingRecords={() => openTrain("RECORDS")} onOpenReview={openDataReview} onEditRecord={(record, dayId) => { setRecordCorrection({ key: ++correctionKey.current, record, dayId }); openRecordSheet("record"); }} focus={bodyFocus} focusRequest={bodyRequest} overviewRequest={bodyOverviewRequest} caveRequest={caveRequest} visible={tab === "BODY"} refreshKey={stealthWrites}
            evidenceRequest={healthEvidence} onHealthHistory={openHealthHistory} onLogWeight={() => openRecordSheet("weight")}
            onReturnToToday={mealOrigin ? returnFromBody : undefined} returnLabel={mealOrigin ? `BACK TO ${TAB_LABEL[mealOrigin.tab]}` : "BACK TO TODAY"}
            onMealJourneyInFlightChange={updateMealInFlight} /></RootErrorBoundary>
        </div>}
        {visited.has("COMMAND") && <div id="workspace-COMMAND" className={tab === "COMMAND" ? "tab-enter" : undefined} hidden={tab !== "COMMAND"}>
          <RootErrorBoundary active={tab === "COMMAND"}><MoreScreen onViewChange={setMoreView} active={tab === "COMMAND"} initialView={moreView} navigationRequest={moreRequest} recordFocus={intentFocus} reviewDestination={reviewDestination}
            onReviewDestinationConsumed={(key) => setReviewDestination((current) => current?.key === key ? null : current)}
            historyDestination={healthHistory} onHistoryExit={() => setHealthHistoryOrigin(false)}
            onReturnToHealth={healthHistoryOrigin ? () => { setHealthHistoryOrigin(false); showTab("BODY"); } : undefined}
            onOpenCapture={openCapture} captureRequest={captureRequest} dailyRefreshKey={workEndedKey} onDailyContextChanged={() => setWorkEndedKey((key) => key + 1)} dailyBanners={<>
                <BackupDueLine />
                <NotesSweep refreshKey={workEndedKey} onSwept={() => setTodayRefreshKey((k) => k + 1)} />
                <TimeCapsuleOpened />
                <ReportReadyLine />
              </>}
            onOpenRecords={(exerciseId) => {
              if (!canNavigate()) return;
              setTrainDestination(null); setTrainRecordsFocus(exerciseId); showTab("TRAIN", false);
            }}
            onOpenMeal={() => openBody("meal")}
            onOpenMetric={openBodyEvidence}
            systemsRefreshKey={stealthWrites}
            onOpenCave={(vital) => { openCave("vitals", vital); }}
            onReturnToToday={commandTodayOrigin && moreView !== "MENU" ? () => { setCommandTodayOrigin(false); showTab("TODAY"); } : undefined}
            onOpenDestination={openSystemDestination} /></RootErrorBoundary>
        </div>}
      </main>

      <RecordSheets mealRequest={recordMealRequest} correctionRequest={recordCorrection} target={recordSheet} open={openRecordSheet} close={closeRecordSheet} onBusy={updateMealInFlight}
        onSaved={() => { setTodayRefreshKey((key) => key + 1); setStealthWrites((key) => key + 1); }}
        onHistory={(metric) => leaveRecordSheet(() => { openBodyEvidence(metric); setMealOrigin((origin) => origin ? { ...origin, trigger: recordOrigin.current } : null); })}
        onWorkout={() => leaveRecordSheet(() => openTrain("WORKOUT"))}
        onNotes={() => leaveRecordSheet(() => { setCaptureRequest((key) => key + 1); openMore("DAILY_CONTROLS"); })} />
      <AppUpdateBanner />

      {/* SHELL-001: extracted from per-render inline style objects into
          named .shell-nav* classes (global.css) — same fixed position,
          same --surface-1 "Utility Belt" material (Suit Implementation
          01B, directive 8: a distinct material so the belt reads as its
          own fixed piece of equipment, not a transparent tab strip),
          same touch regions/labels/IA. Nothing about what App.test.tsx
          already locks in (44px touch targets, 700-weight selected
          cue, the red structural tick, aria-current) changed — only
          how it's expressed. */}
      {/* POLISH-002: the prototype's tab bar — a 2 px red top indicator on the current tab. */}
      <nav className="shell-nav cc-nav" aria-label="Primary">
        <div className="cc-nav-in">
          {(["TODAY", "TRAIN", "LOG", "BODY", "COMMAND"] as const).map((t) => {
            // OWNER-GO-001 (Gavin: "Go"): LOG lives in the middle of the bottom bar, on every tab,
            // where either thumb reaches it and it covers nothing. It opens the same LOG sheet.
            if (t === "LOG") return (
              <button key="LOG" type="button" className="shell-nav__item shell-nav__log" aria-label="Open LOG" aria-haspopup="dialog"
                onClick={() => openRecordSheet("log")}>
                <span className="shell-nav__log-mark" aria-hidden="true">{CcIcon.plus()}</span>
                <span>LOG</span>
              </button>
            );
            const TabIcon = CC_TAB_ICON[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => openPrimaryTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={`shell-nav__item${tab === t ? " shell-nav__item--active" : ""}`}
              >
                <TabIcon />
                <span>{TAB_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    {stealthOn && <StealthOverlay onExit={() => changeStealth(false)} onLogged={() => { setTodayRefreshKey((key) => key + 1); setStealthWrites((n) => n + 1); }} />}
    </StealthToggleContext.Provider>
    </HeaderSearchContext.Provider>
    </EmblemContext.Provider>
  );
}
