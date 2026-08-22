import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { TodayScreen } from "../ui/screens/today/TodayScreen";
import { TrainScreen } from "../ui/screens/train/TrainScreen";
import { BodyScreen } from "../ui/screens/body/BodyScreen";
import { MoreScreen } from "../ui/screens/more/MoreScreen";
import { Icon, type IconName } from "../ui/icons/Icon";

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
        bottom: 76,
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

  return (
    <div style={{ paddingBottom: 64 }}>
      {tab === "TODAY" && <TodayScreen />}
      {tab === "TRAIN" && <TrainScreen />}
      {tab === "BODY" && <BodyScreen />}
      {tab === "MORE" && <MoreScreen />}

      <AppUpdateBanner />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg)",
        }}
      >
        {(["TODAY", "TRAIN", "BODY", "MORE"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            style={{
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
            <Icon name={TAB_ICON[t]} size={24} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
