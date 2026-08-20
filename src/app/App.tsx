import { useState } from "react";
import { TodayScreen } from "../ui/screens/today/TodayScreen";
import { TrainScreen } from "../ui/screens/train/TrainScreen";
import { BodyScreen } from "../ui/screens/body/BodyScreen";
import { MoreScreen } from "../ui/screens/more/MoreScreen";

/**
 * Product Experience Sprint, P1 (navigation authority reconciliation):
 * the Decision Register locks primary navigation to these four
 * destinations. HISTORY is not deleted — its screen, queries, copy
 * helpers, and tests are all untouched — it's reachable from MORE
 * instead of competing for a fifth primary tab slot.
 */
type Tab = "TODAY" | "TRAIN" | "BODY" | "MORE";

export function App() {
  const [tab, setTab] = useState<Tab>("TODAY");

  return (
    <div style={{ paddingBottom: 64 }}>
      {tab === "TODAY" && <TodayScreen />}
      {tab === "TRAIN" && <TrainScreen />}
      {tab === "BODY" && <BodyScreen />}
      {tab === "MORE" && <MoreScreen />}

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
            <span
              aria-hidden="true"
              className="diamond"
              style={{ background: tab === t ? "var(--accent)" : "transparent", visibility: tab === t ? "visible" : "hidden" }}
            />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
