import { CommandSurface } from "../../components/CommandSurface";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { SignalRow } from "../../components/SignalRow";
import {
  describeMinimumDaySummary,
  getHydrationProgressPercent,
  MINIMUM_DAY_ENABLE_BODY,
  MINIMUM_DAY_ITEMS,
  MINIMUM_DAY_PROMINENT_BODY,
  MINIMUM_DAY_PROMINENT_TITLE,
} from "./minimumDayCopy";
import { WATER_QUICK_ADD_OZ } from "../body/bodyScreenCopy";
import { MINIMUM_DAY_HYDRATE_OZ, type MinimumDayStatus } from "../../../application/queries";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderHydrationOperation`/`renderMinimumDayCard`
 * closures. Both stay together in one file since they share the Minimum
 * Day concept and TodayScreen's own call sites choose between them based
 * on the same `dominant`/`minimumDayInAttention` placement facts.
 */
export function HydrationOperationCard({
  minimumDay,
  minimumDayHydrateOz,
  busy,
  mdWaterInput,
  setMdWaterInput,
  hydrationManualOpen,
  setHydrationManualOpen,
  onLogWater,
  onViewFull,
}: {
  minimumDay: MinimumDayStatus | null;
  minimumDayHydrateOz: number;
  busy: boolean;
  mdWaterInput: string;
  setMdWaterInput: (value: string) => void;
  hydrationManualOpen: boolean;
  setHydrationManualOpen: (open: boolean) => void;
  onLogWater: (amountOverride?: number) => void;
  onViewFull: () => void;
}) {
  if (!minimumDay || !minimumDay.enabled || minimumDay.hydrate) return null;
  return (
    <CommandSurface>
      <p className="tool-label">MINIMUM DAY // HYDRATION</p>
      <h2 className="command-title">Record what you drank</h2>
      <p className="card-body" style={{ marginBottom: 4 }}>
        {minimumDayHydrateOz}oz recorded for this active BeyondDay.
      </p>
      <div
        className="field-progress"
        style={{ marginBottom: 16 }}
        role="progressbar"
        aria-label="Hydration progress toward Minimum Day target"
        aria-valuenow={Math.min(minimumDayHydrateOz, MINIMUM_DAY_HYDRATE_OZ)}
        aria-valuemin={0}
        aria-valuemax={MINIMUM_DAY_HYDRATE_OZ}
      >
        <div
          className="field-progress__fill"
          style={{ width: `${getHydrationProgressPercent(minimumDayHydrateOz, MINIMUM_DAY_HYDRATE_OZ)}%` }}
        />
      </div>
      <p className="meta" style={{ marginBottom: 16 }}>
        Choose the amount that is already true. Nothing is logged until you act.
      </p>
      <div className="field-quick-actions">
        {WATER_QUICK_ADD_OZ.map((amount) => (
          <button
            key={amount}
            className="btn-primary"
            disabled={busy}
            onClick={() => onLogWater(amount)}
          >
            +{amount} OZ
          </button>
        ))}
      </div>
      <FieldDisclosure
        summary={hydrationManualOpen ? "HIDE DIFFERENT AMOUNT" : "DIFFERENT AMOUNT"}
        open={hydrationManualOpen}
        onToggle={setHydrationManualOpen}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={0}
            aria-label="Hydration amount in ounces"
            placeholder="oz"
            value={mdWaterInput}
            onChange={(e) => setMdWaterInput(e.target.value)}
            className="input"
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            style={{ width: "auto" }}
            disabled={busy || !(Number(mdWaterInput) > 0)}
            onClick={() => onLogWater()}
          >
            LOG
          </button>
        </div>
      </FieldDisclosure>
      <button className="btn-secondary" style={{ marginTop: 12 }} onClick={onViewFull}>
        VIEW FULL MINIMUM DAY
      </button>
    </CommandSurface>
  );
}

export function MinimumDayCard({
  prominent,
  minimumDay,
  minimumDayOpen,
  onOpenCollapsed,
  minimumDayHydrateOz,
  minimumDayProteinG,
  mdWaterInput,
  setMdWaterInput,
  mdProteinInput,
  setMdProteinInput,
  busy,
  onEnable,
  onMarkMinimum,
  onLogWater,
  onLogProtein,
}: {
  prominent: boolean;
  minimumDay: MinimumDayStatus | null;
  minimumDayOpen: boolean;
  onOpenCollapsed: () => void;
  minimumDayHydrateOz: number;
  minimumDayProteinG: number;
  mdWaterInput: string;
  setMdWaterInput: (value: string) => void;
  mdProteinInput: string;
  setMdProteinInput: (value: string) => void;
  busy: boolean;
  onEnable: () => void;
  onMarkMinimum: (kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER" | "CONNECT") => void;
  onLogWater: () => void;
  onLogProtein: () => void;
}) {
  if (!minimumDay) return null;
  if (!prominent && !minimumDayOpen) {
    return (
      <CollapsibleRow
        name="MINIMUM DAY"
        summary={describeMinimumDaySummary(minimumDay)}
        onOpen={onOpenCollapsed}
      />
    );
  }
  const content = (
    <>
      <p className="meta" style={{ marginBottom: 12 }}>
        Progress stays with this active BeyondDay until you end it — a calendar date change does not reset it.
      </p>
      {!minimumDay.enabled ? (
        <>
          <h2 className="card-title">{prominent ? MINIMUM_DAY_PROMINENT_TITLE : "Reduced baseline"}</h2>
          <p className="card-body" style={{ marginBottom: 12 }}>
            {prominent ? MINIMUM_DAY_PROMINENT_BODY : MINIMUM_DAY_ENABLE_BODY}
          </p>
          <button className="btn-primary" disabled={busy} onClick={onEnable}>
            ENABLE MINIMUM DAY
          </button>
        </>
      ) : (
        <>
          {MINIMUM_DAY_ITEMS.map((item) => {
            const done = minimumDay[item.key];
            return (
              <div key={item.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="card-body" style={{ margin: 0 }}>
                    {done && <span aria-hidden="true" className="diamond" style={{ marginRight: 6, verticalAlign: 1 }} />}
                    {item.label}
                    {item.key === "hydrate" ? ` — ${minimumDayHydrateOz}oz logged` : ""}
                    {item.key === "protein" ? ` — ${minimumDayProteinG}g logged` : ""}
                  </span>
                  {!done && item.key === "meds" && (
                    <button
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                      disabled={busy}
                      onClick={() => onMarkMinimum("MEDS")}
                    >
                      MARK DONE
                    </button>
                  )}
                  {!done && item.key === "hygiene" && (
                    <button
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                      disabled={busy}
                      onClick={() => onMarkMinimum("HYGIENE")}
                    >
                      MARK DONE
                    </button>
                  )}
                  {!done && item.key === "move" && (
                    <button
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                      disabled={busy}
                      onClick={() => onMarkMinimum("MOVE")}
                    >
                      MARK DONE
                    </button>
                  )}
                </div>
                <p className="meta" style={{ marginTop: 4 }}>{item.updateNote}</p>
                {item.key === "hydrate" && (
                  <div
                    className="field-progress"
                    style={{ marginTop: 8 }}
                    role="progressbar"
                    aria-label="Hydration progress toward Minimum Day target"
                    aria-valuenow={Math.min(minimumDayHydrateOz, MINIMUM_DAY_HYDRATE_OZ)}
                    aria-valuemin={0}
                    aria-valuemax={MINIMUM_DAY_HYDRATE_OZ}
                  >
                    <div
                      className="field-progress__fill"
                      style={{ width: `${getHydrationProgressPercent(minimumDayHydrateOz, MINIMUM_DAY_HYDRATE_OZ)}%` }}
                    />
                  </div>
                )}
                {!done && item.key === "hydrate" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      type="number"
                      min={0}
                      placeholder="oz"
                      value={mdWaterInput}
                      onChange={(e) => setMdWaterInput(e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn-primary"
                      style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                      disabled={busy || !(Number(mdWaterInput) > 0)}
                      onClick={onLogWater}
                    >
                      LOG WATER
                    </button>
                  </div>
                )}
                {!done && item.key === "protein" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      type="number"
                      min={0}
                      placeholder="g"
                      value={mdProteinInput}
                      onChange={(e) => setMdProteinInput(e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn-primary"
                      style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                      disabled={busy || !(Number(mdProteinInput) > 0)}
                      onClick={onLogProtein}
                    >
                      LOG PROTEIN
                    </button>
                  </div>
                )}
                {!done && item.key === "recoverConnect" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, padding: "6px 12px", fontSize: 16 }}
                      disabled={busy}
                      onClick={() => onMarkMinimum("RECOVER")}
                    >
                      MARK RECOVER
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, padding: "6px 12px", fontSize: 16 }}
                      disabled={busy}
                      onClick={() => onMarkMinimum("CONNECT")}
                    >
                      MARK CONNECT
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </>
  );
  if (prominent) {
    return <SignalRow label="MINIMUM DAY">{content}</SignalRow>;
  }
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>MINIMUM DAY</p>
      {content}
    </div>
  );
}
