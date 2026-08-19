import { useState } from "react";
import { TodayScreen } from "../ui/screens/today/TodayScreen";
import { TrainScreen } from "../ui/screens/train/TrainScreen";
import { BodyScreen } from "../ui/screens/body/BodyScreen";
import { MoreScreen } from "../ui/screens/more/MoreScreen";

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
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "14px 0",
              color: tab === t ? "var(--accent)" : "var(--text-2)",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 13,
              letterSpacing: "0.04em",
            }}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
