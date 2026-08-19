import { useEffect, useState } from "react";
import type { BeyondDay, Recommendation, StateCheckIn } from "../../../domain/common/types";
import {
  startDay,
  submitCheckIn,
  recordRecommendation,
  startReset,
  completeReset,
  startShiftDown,
  completeShiftDown,
  endDay,
} from "../../../application/commands";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  wasRecommendationRecorded,
  shouldSuggestEndDay,
} from "../../../application/queries";

type Values = Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">;

const defaultValues: Values = {
  energy: 3,
  stress: 3,
  mood: 3,
  soreness: 1,
  alcoholUrge: 0,
};

const fields: { key: keyof Values; min: number }[] = [
  { key: "energy", min: 1 },
  { key: "stress", min: 1 },
  { key: "mood", min: 1 },
  { key: "soreness", min: 0 },
  { key: "alcoholUrge", min: 0 },
];

export function TodayScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [values, setValues] = useState<Values>(defaultValues);
  const [busy, setBusy] = useState(false);
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [showReset, setShowReset] = useState(false);
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [showShiftDown, setShowShiftDown] = useState(false);
  const [suggestEndDay, setSuggestEndDay] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    if (activeDay) {
      setCheckIn((await getLatestCheckIn(activeDay.id)) ?? null);
      const rec = (await getLatestRecommendation(activeDay.id)) ?? null;
      setRecommendation(rec);
      setRecorded(rec ? await wasRecommendationRecorded(activeDay.id, rec.id) : false);
      setSuggestEndDay(await shouldSuggestEndDay(activeDay.id));
    }
  }

  async function handleStartDay() {
    setBusy(true);
    try {
      setDay(await startDay());
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    if (!day) return;
    setBusy(true);
    try {
      const result = await submitCheckIn(day.id, values);
      setCheckIn(result.checkIn);
      setRecommendation(result.recommendation);
      setRecorded(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecord() {
    if (!day || !recommendation) return;
    setBusy(true);
    try {
      await recordRecommendation(day.id, recommendation);
      setRecorded(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartReset() {
    if (!day) return;
    const id = await startReset(day.id, resetIntensity);
    setActiveResetId(id);
  }

  async function handleCompleteReset() {
    if (!day || !activeResetId) return;
    await completeReset(day.id, activeResetId);
    setActiveResetId(null);
    setShowReset(false);
  }

  async function handleStartShiftDown() {
    if (!day) return;
    const id = await startShiftDown(day.id, shiftDownDuration);
    setActiveShiftDownId(id);
  }

  async function handleCompleteShiftDown() {
    if (!day || !activeShiftDownId) return;
    await completeShiftDown(day.id, activeShiftDownId);
    setActiveShiftDownId(null);
    setShowShiftDown(false);
  }

  async function handleEndDay() {
    if (!day) return;
    setBusy(true);
    try {
      await endDay(day.id, "EXPLICIT_END_DAY");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const recordLabel = recommendation?.kind === "NO_ACTION_REQUIRED" ? "RECORD NO ACTION" : "ACCEPT";

  return (
    <div className="screen">
      <p className="eyebrow">BEYOND // TODAY</p>
      <h1 className="title">Command</h1>

      {!day && (
        <div className="card card--action">
          <h2 className="card-title">Start your day</h2>
          <p className="card-body">No active BeyondDay. Starting begins wake-to-sleep tracking for today.</p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleStartDay()}>
            START DAY
          </button>
        </div>
      )}

      {day && recommendation && (
        <div className="card card--action">
          <p className="eyebrow" style={{ marginBottom: 4 }}>PRIMARY GUIDANCE</p>
          <p className="meta" style={{ marginBottom: 12 }}>Context: {day.workContext}</p>
          <h2 className="card-title">{recommendation.title}</h2>
          <p className="card-body">{recommendation.rationale}</p>
          <details className="why">
            <summary>WHY</summary>
            {recommendation.trace.matchedRules.map((r) => (
              <div key={r.ruleId} className={`why-rule ${r.result ? "why-rule--matched" : ""}`}>
                <span>{r.ruleId}</span>
                <span>{r.result ? r.reason : "—"}</span>
              </div>
            ))}
          </details>
          <div style={{ marginTop: 12 }}>
            <button
              className="btn-primary"
              disabled={busy || recorded}
              onClick={() => void handleRecord()}
            >
              {recorded ? "RECORDED" : recordLabel}
            </button>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <p className="meta" style={{ marginBottom: 8 }}>OVERRIDE</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                onClick={() => setShowReset((s) => !s)}
              >
                RESET
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--surface-2)" }}
                onClick={() => setShowShiftDown((s) => !s)}
              >
                SHIFT DOWN
              </button>
            </div>
            {showReset && (
              <div style={{ marginTop: 12 }}>
                <p className="meta" style={{ marginBottom: 8 }}>BODY BEFORE STORY — intensity</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button
                      key={n}
                      className="btn-primary"
                      style={{
                        background: resetIntensity === n ? "var(--accent)" : "var(--surface-2)",
                        padding: "8px 14px",
                        width: "auto",
                      }}
                      onClick={() => setResetIntensity(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {!activeResetId ? (
                  <button className="btn-primary" onClick={() => void handleStartReset()}>
                    START RESET
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => void handleCompleteReset()}>
                    COMPLETE RESET
                  </button>
                )}
              </div>
            )}
            {showShiftDown && (
              <div style={{ marginTop: 12 }}>
                <p className="meta" style={{ marginBottom: 8 }}>Duration (minutes)</p>
                <input
                  type="number"
                  min={1}
                  value={shiftDownDuration}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setShiftDownDuration(Number.isNaN(v) || v < 1 ? 1 : v);
                  }}
                  disabled={activeShiftDownId !== null}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    color: "var(--text-1)",
                    padding: "10px 12px",
                    fontSize: 15,
                    marginBottom: 8,
                  }}
                />
                {!activeShiftDownId ? (
                  <button className="btn-primary" onClick={() => void handleStartShiftDown()}>
                    START SHIFT DOWN
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => void handleCompleteShiftDown()}>
                    COMPLETE SHIFT DOWN
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {day && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>STATE INPUT</p>
          <h2 className="card-title">State check-in</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {fields.map(({ key, min }) => (
              <div className="field" key={key}>
                <label>
                  <span style={{ textTransform: "capitalize" }}>{key}</span>
                </label>
                <input
                  type="number"
                  min={min}
                  max={5}
                  value={values[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setValues((s) => ({ ...s, [key]: Number.isNaN(v) ? min : v }));
                  }}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    color: "var(--text-1)",
                    padding: "10px 12px",
                    fontSize: 15,
                  }}
                />
              </div>
            ))}
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => void handleCheckIn()}>
            SUBMIT CHECK-IN
          </button>
          {checkIn && (
            <p className="meta" style={{ marginTop: 8 }}>
              last recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {day && (
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>BEYONDDAY</p>
          {suggestEndDay && (
            <p className="card-body" style={{ marginBottom: 12 }}>
              Primary sleep logged — this BeyondDay looks done. End it whenever you're ready.
            </p>
          )}
          <button className="btn-primary" style={{ background: "var(--surface-2)" }} disabled={busy} onClick={() => void handleEndDay()}>
            END DAY
          </button>
        </div>
      )}
    </div>
  );
}
