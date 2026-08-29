import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { TodayScreen } from "../ui/screens/today/TodayScreen";
import { TrainScreen, type TrainDestination } from "../ui/screens/train/TrainScreen";
import { BodyScreen } from "../ui/screens/body/BodyScreen";
import { MoreScreen } from "../ui/screens/more/MoreScreen";
import { Icon, type IconName } from "../ui/icons/Icon";
import { RootErrorBoundary } from "../ui/components/RootErrorBoundary";
import { getActiveWorkoutSession } from "../application/trainQueries";

/**
 * Product Experience Sprint, P1 (navigation authority reconciliation):
 * the Decision Register locks primary navigation to these four
 * destinations. HISTORY is not deleted — its screen, queries, copy
 * helpers, and tests are all untouched — it's reachable from MORE
 * instead of competing for a fifth primary tab slot.
 */
type Tab = "TODAY" | "TRAIN" | "BODY" | "MORE";

// Overdrive Phase 14: MORE now has its own icon ("more" — three small
// diamonds, additive to the six locked pilot icons, not a redesign of
// any of them) — see Icon.tsx. All four primary destinations have a
// real glyph now, so this is a complete Record, not Partial.
const TAB_ICON: Record<Tab, IconName> = {
  TODAY: "mission",
  TRAIN: "train",
  BODY: "body",
  MORE: "more",
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
      <p className="eyebrow" style={{ marginBottom: 4 }}>SYSTEM UPDATE READY</p>
      <p className="card-body" style={{ marginBottom: 12 }}>
        A newer version of BEYOND is available. Nothing in progress is lost — your data stays exactly as it is.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => void updateServiceWorker(true)}>
          UPDATE NOW
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setNeedRefresh(false)}>
          LATER
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("TODAY");
  const [trainDestination, setTrainDestination] = useState<TrainDestination | null>(null);
  const [continuityResolved, setContinuityResolved] = useState(false);

  useEffect(() => {
    let current = true;
    void getActiveWorkoutSession()
      .then((activeWorkout) => {
        if (!current) return;
        if (activeWorkout) {
          setTrainDestination("WORKOUT");
          setTab("TRAIN");
        }
      })
      .catch(() => {
        // Continuity restoration is defensive. A failed local read must
        // not trap the operator on the loading surface; the existing root
        // error/recovery paths remain available from the normal app shell.
      })
      .finally(() => {
        if (current) setContinuityResolved(true);
      });
    return () => {
      current = false;
    };
  }, []);

  function openTrain(destination: TrainDestination) {
    setTrainDestination(destination);
    setTab("TRAIN");
  }

  if (!continuityResolved) {
    return (
      <main className="screen" aria-busy="true">
        <p className="meta" role="status">Restoring active operation…</p>
      </main>
    );
  }

  return (
    <div style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Leverage Implementation 002 (root error containment): wraps only
          the per-tab screen content, not the bottom nav — a render error
          in one screen replaces just that screen with a recovery
          surface, while TODAY/TRAIN/BODY/MORE navigation stays live so
          the operator can still try a different, possibly-unaffected
          screen. `key={tab}` resets the boundary whenever the tab
          changes, so switching tabs is itself a natural retry, not a
          second dead end next to a working nav. */}
      <RootErrorBoundary key={tab}>
        {/* Intent & Commitment Spine, Drop 02: the only cross-screen
            navigation TODAY needs — VIEW on a surfaced commitment switches
            to the MORE tab (where Missions & Obligations already lives),
            rather than deep-linking to the specific Obligation, which would
            require lifting new state through MoreScreen/IntentScreen too. */}
        {tab === "TODAY" && (
          <TodayScreen
            onViewCommitments={() => setTab("MORE")}
            onOpenTrain={openTrain}
            onOpenBody={() => setTab("BODY")}
          />
        )}
        {tab === "TRAIN" && (
          <TrainScreen
            destination={trainDestination}
            onDestinationConsumed={() => setTrainDestination(null)}
          />
        )}
        {tab === "BODY" && <BodyScreen />}
        {tab === "MORE" && <MoreScreen />}
      </RootErrorBoundary>

      <AppUpdateBanner />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          borderTop: "1px solid var(--border-subtle)",
          // Suit Implementation 01B, directive 8 ("make Utility Belt feel
          // integrated"): a distinct material (--surface-1, the same
          // raised-panel token cards use) instead of the bare screen
          // background, so the belt reads as its own fixed piece of
          // equipment rather than a transparent tab strip floating over
          // the void. Touch regions, labels, and IA are unchanged.
          background: "var(--surface-1)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {(["TODAY", "TRAIN", "BODY", "MORE"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTrainDestination(null);
              setTab(t);
            }}
            aria-current={tab === t ? "page" : undefined}
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: "12px 0",
              minHeight: 44,
              color: tab === t ? "var(--accent)" : "var(--text-2)",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 16,
              letterSpacing: "0.04em",
            }}
          >
            {/* BEYOND Suit Implementation 01 — Utility Belt (Part 11),
                widened in 01B (directive 8): a LEVEL 1 / STRUCTURAL red
                cue for the selected territory, in addition to the
                existing color+weight change — selection must communicate
                through more than color alone. A thin directional tick,
                not a pill or glow; aria-hidden since aria-current on the
                button already carries this for assistive tech. */}
            {tab === t && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  background: "var(--accent)",
                }}
              />
            )}
            <Icon name={TAB_ICON[t]} size={24} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
